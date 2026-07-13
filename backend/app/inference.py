"""
Serving wrapper around the notebook's STEP 25 `dehaze_external_image` pipeline.

The transformation math (transmission blending, atmospheric-light correction,
gamma, saturation reduction, etc.) is copied verbatim from the notebook. This
module only adapts it to: (a) load weights once at process start instead of
per-cell execution, and (b) operate on an in-memory PIL image / numpy array
instead of a Google Drive file path, and (c) return numpy arrays instead of
calling plt.show()/plt.savefig().
"""

import io
import time
from dataclasses import dataclass
from typing import Callable, Optional

import cv2
import numpy as np
import torch
from PIL import Image
from torchvision import transforms

from .model import (
    RefinementNet,
    SearchableViT,
    estimate_atmospheric_light,
    get_dark_channel,
    soft_retrieval,
)

# Same transform used to build the training loader (STEP 7)
transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
    ]
)

ProgressFn = Callable[[int, str], None]


def _noop_progress(_pct: int, _stage: str) -> None:
    return None


@dataclass
class DehazeOutput:
    dehazed_rgb: np.ndarray       # float32 [0,1], HxWx3
    transmission_map: np.ndarray  # float32 [0,1], HxW
    processing_time_seconds: float


class DehazingService:
    """Loads the trained checkpoint once and exposes `.run(pil_image)`."""

    def __init__(self, checkpoint_path: str, device: str | None = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))

        model = SearchableViT().to(self.device)
        refiner = RefinementNet().to(self.device)

        checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
        model.encoder.load_state_dict(checkpoint["encoder_state_dict"])
        refiner.load_state_dict(checkpoint["refiner_state_dict"])

        self.encoder = model.encoder.to(self.device).eval()
        for p in self.encoder.parameters():
            p.requires_grad = False

        self.refiner = refiner.to(self.device).eval()
        self.codebook = checkpoint["codebook"]

    @torch.no_grad()
    def run(
        self,
        pil_image: Image.Image,
        on_progress: Optional[ProgressFn] = None,
    ) -> DehazeOutput:
        """
        Runs the full pipeline, calling on_progress(pct, stage) after each real
        computation checkpoint completes. Percentages are milestones tied to
        actual finished work, not a timer — stages that genuinely take longer
        (the per-patch retrieval loop below) report incrementally as they go,
        everything else reports once when that step is done.
        """
        progress = on_progress or _noop_progress
        start = time.time()

        orig_img_pil = pil_image.convert("RGB")
        W_orig, H_orig = orig_img_pil.size
        orig_img_np = np.array(orig_img_pil).astype(np.float32) / 255.0
        progress(5, "Decoding image")

        input_tensor = transform(orig_img_pil).unsqueeze(0).to(self.device)
        progress(10, "Preparing tensors")

        # --- Network inference (STEP 25 verbatim) ---
        tokens = self.encoder.forward_features(input_tensor)
        patches = tokens[:, 1:, :]
        emb = patches.reshape(-1, 384)
        progress(30, "Extracting features")

        # This loop is the real per-patch retrieval work (196 patches for a
        # 14x14 grid) — it's the one stage where we can report genuinely
        # incremental progress as each patch is actually retrieved, rather
        # than a single before/after checkpoint.
        emb_np = emb.cpu().numpy()
        total_patches = len(emb_np)
        retrieved = []
        report_every = max(1, total_patches // 20)  # ~20 updates across the loop
        for i, e in enumerate(emb_np):
            retrieved.append(soft_retrieval(e, self.codebook))
            if i % report_every == 0 or i == total_patches - 1:
                frac = (i + 1) / total_patches
                pct = 30 + int(frac * 25)  # this stage spans 30% -> 55%
                progress(pct, "Matching haze patterns")

        retrieved_t = torch.tensor(retrieved).float().unsqueeze(1).to(self.device)

        delta = self.refiner(emb, retrieved_t)
        pred = retrieved_t + delta
        pred_beta_low = pred.reshape(14, 14).cpu().numpy()
        progress(60, "Refining haze map")

        beta_map = cv2.resize(pred_beta_low, (W_orig, H_orig))
        beta_map = cv2.GaussianBlur(beta_map, (9, 9), 0)
        # Increased dehazing strength - removed the 0.8 damping
        beta_map = np.clip(beta_map, 0.05, 2.0)

        # --- Physical model dehazing (STEP 25 verbatim) ---
        I = orig_img_np
        atmospheric_light = estimate_atmospheric_light(I, percentile=0.001)

        omega = 0.95  # Increased from 0.85 for more aggressive dehazing
        dark_channel = get_dark_channel(I / (atmospheric_light + 1e-6), patch_size=15)
        transmission_base = 1.0 - omega * dark_channel
        progress(68, "Estimating atmospheric light")

        beta_norm = beta_map / (beta_map.mean() + 1e-6)
        beta_norm = np.clip(beta_norm, 0.4, 2.2)
        transmission = np.clip(transmission_base * beta_norm, 0.0, 1.0)

        guide = cv2.cvtColor((I * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)

        min_transmission = 0.1
        transmission = np.clip(transmission, min_transmission, 1.0)

        brightness = I.mean(axis=2)
        saturation = I.max(axis=2) - I.min(axis=2)
        sky_mask_raw = ((brightness > 0.55) & (saturation < 0.12)).astype(np.float32)
        
        sky_mask = cv2.ximgproc.guidedFilter(
            guide=guide,
            src=sky_mask_raw.astype(np.float32),
            radius=20,
            eps=1e-3,
        )
        sky_mask = np.nan_to_num(sky_mask, nan=0.0, posinf=1.0, neginf=0.0)
        sky_mask = np.clip(sky_mask, 0.0, 1.0)
        sky_mask = np.expand_dims(sky_mask, axis=2)

        sky_transmission_floor = 0.35
        transmission_sky_adjusted = np.minimum(transmission, sky_transmission_floor + (1 - sky_transmission_floor) * (1 - sky_mask[:, :, 0]))
        transmission = transmission * (1 - sky_mask[:, :, 0]) + transmission_sky_adjusted * sky_mask[:, :, 0]

        transmission = cv2.ximgproc.guidedFilter(
            guide=guide,
            src=transmission.astype(np.float32),
            radius=20,
            eps=1e-3,
        )
        transmission = np.nan_to_num(transmission, nan=min_transmission, posinf=1.0, neginf=min_transmission)

        transmission = np.clip(transmission, min_transmission, 1.0)
        progress(78, "Mapping transmission")

        t3 = np.expand_dims(transmission, axis=2)

        J_raw = (I - atmospheric_light) / t3 + atmospheric_light
        J_raw = np.clip(J_raw, 0, 1)

        J_unclipped = (I - atmospheric_light) / t3 + atmospheric_light
        clip_deficit = np.clip(-J_unclipped, 0.0, None)
        clip_severity = np.max(clip_deficit, axis=2, keepdims=True)

        darkness_mask = np.clip(clip_severity / 0.5, 0.0, 1.0)
        darkness_mask = cv2.GaussianBlur(darkness_mask, (9, 9), 0)
        darkness_mask = np.expand_dims(darkness_mask, axis=2)

        protect_strength = 0.5
        blend_weight = darkness_mask * protect_strength

        J = J_raw * (1 - blend_weight) + I * blend_weight
        J = np.clip(J, 0, 1)
        progress(88, "Compositing result")

        orig_luminance = I.mean()
        dehazed_luminance = J.mean()
        if dehazed_luminance > 1e-6:
            brightness_ratio = np.clip(orig_luminance / dehazed_luminance, 0.85, 1.15)
            J = np.clip(J * brightness_ratio, 0, 1)

        gamma = 1.05
        J = np.power(J, 1 / gamma)

        J_uint8 = (J * 255).astype(np.uint8)
        # Convert RGB to BGR for OpenCV, then to HSV
        J_bgr = cv2.cvtColor(J_uint8, cv2.COLOR_RGB2BGR)
        hsv = cv2.cvtColor(J_bgr, cv2.COLOR_BGR2HSV)
        # Reduce saturation slightly
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 0.95, 0, 255).astype(np.uint8)
        # Convert back: HSV -> BGR -> RGB
        J_bgr = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        J_uint8 = cv2.cvtColor(J_bgr, cv2.COLOR_BGR2RGB)
        J = J_uint8.astype(np.float32) / 255.0
        progress(95, "Finalizing colors")

        elapsed = time.time() - start

        return DehazeOutput(
            dehazed_rgb=J.astype(np.float32),
            transmission_map=transmission.astype(np.float32),
            processing_time_seconds=elapsed,
        )


def pil_from_upload(file_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(file_bytes))


def rgb_float_to_png_bytes(arr: np.ndarray) -> bytes:
    """arr: float32 HxWx3 in [0,1] -> PNG bytes"""
    uint8 = (np.clip(arr, 0, 1) * 255).astype(np.uint8)
    img = Image.fromarray(uint8, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def transmission_to_jet_png_bytes(transmission: np.ndarray) -> bytes:
    """Matches the notebook's cmap='jet' visualization of the beta/transmission map."""
    norm = (transmission - transmission.min()) / (transmission.max() - transmission.min() + 1e-8)
    uint8 = (norm * 255).astype(np.uint8)
    colored_bgr = cv2.applyColorMap(uint8, cv2.COLORMAP_JET)
    colored_rgb = cv2.cvtColor(colored_bgr, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(colored_rgb, mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
