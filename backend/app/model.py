"""
Model architecture — ported 1:1 from the training notebook (Dehazing (3).ipynb).

Nothing about the architecture or the dehazing math has been changed here;
this file only contains the class/function definitions needed to load the
saved checkpoint and run inference. Do not "improve" the math below — it is
exactly what the notebook trained and tuned.
"""

import numpy as np
import torch
import torch.nn as nn
import timm
import cv2


# ---------------------------------------------------------------------------
# STEP 9 — SearchableViT (encoder used at inference is `model.encoder`)
# ---------------------------------------------------------------------------
class SearchableViT(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = timm.create_model("vit_small_patch16_224", pretrained=False, num_classes=0)
        self.regressor = nn.Sequential(
            nn.Linear(384, 128),
            nn.GELU(),
            nn.Linear(128, 1),
        )

    def forward(self, x):
        B = x.shape[0]
        tokens = self.encoder.forward_features(x)
        patches = tokens[:, 1:, :]
        beta = self.regressor(patches)
        beta = beta.squeeze(-1)
        beta = beta.reshape(B, 14, 14)
        return patches, beta


# ---------------------------------------------------------------------------
# STEP 18 — RefinementNet (MLP + CNN spatial refinement head)
# ---------------------------------------------------------------------------
class RefinementNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(385, 128),
            nn.GELU(),
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Linear(64, 1),
        )
        self.cnn = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(32, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(16, 1, kernel_size=3, padding=1),
        )

    def forward(self, emb, beta):
        x = torch.cat([emb, beta], dim=-1)
        delta = self.mlp(x)
        B = emb.shape[0] // (14 * 14)
        delta_grid = delta.reshape(B, 1, 14, 14)
        delta_refined = self.cnn(delta_grid)
        return delta_refined.reshape(-1, 1)


# ---------------------------------------------------------------------------
# STEP 17 — Stable soft retrieval over the NAS codebook
# ---------------------------------------------------------------------------
def soft_retrieval(query, codebook, tau: float = 0.5):
    sims = []
    for entry in codebook:
        sim = np.dot(query, entry["embedding"])
        sims.append(sim)
    sims = np.array(sims)
    sims = sims - np.max(sims)
    weights = np.exp(sims / tau)
    weights /= np.sum(weights)
    betas = np.array([entry["beta"] for entry in codebook])
    return np.sum(weights * betas)


# ---------------------------------------------------------------------------
# STEP 25 — atmospheric light estimation (dark-channel prior, robust variant)
# ---------------------------------------------------------------------------
def estimate_atmospheric_light(I, percentile: float = 0.001):
    h, w, _ = I.shape
    dark_channel = np.min(I, axis=2)
    dark_channel = cv2.erode(dark_channel, np.ones((15, 15), np.uint8))

    num_pixels = int(max(h * w * percentile, 1))
    flat_dark = dark_channel.reshape(-1)
    flat_I = I.reshape(-1, 3)

    top_idx = np.argpartition(flat_dark, -num_pixels)[-num_pixels:]
    brightest_idx = top_idx[np.argmax(flat_I[top_idx].sum(axis=1))]
    A = flat_I[brightest_idx]

    A = np.clip(A, 0.0, 0.95)
    return A


def get_dark_channel(img, patch_size: int = 15):
    min_channel = np.min(img, axis=2)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (patch_size, patch_size))
    return cv2.erode(min_channel, kernel)
