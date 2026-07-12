import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";

export default function About() {
  return (
    <div className="mx-auto max-w-[1680px] px-5 sm:px-8 py-8 flex gap-8">
      <Sidebar />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 min-w-0 max-w-2xl rounded-2xl border border-ink-700 bg-ink-900/60 p-6"
      >
        <h1 className="font-display text-xl font-semibold text-white mb-3">About Hazentra</h1>
        <p className="text-sm text-mist-400 leading-relaxed">
          <p>Hazentra is a simple tool that removes haze from photos, bringing back the clear details, natural colors, and sharp view that may be hidden behind fog, mist, or pollution.</p>
          <br></br>
          <p>Have you ever taken a photo of a beautiful landscape, a mountain, a road, or a city skyline, only to find that it looks dull, faded, or blurry because of the weather? Even though your eyes could see more clearly, the camera may have captured a layer of haze that hides important details. Hazentra was created to solve this problem by helping people recover the clear image they expected to see. Instead of letting haze reduce the quality of a photo, Hazentra reveals what is already there, making images look brighter, cleaner, and easier to understand.</p>
          <br></br>
          <u>How Hazentra Works</u>

<p>1. Upload Your Photo</p>
<p>Upload a photo that appears hazy, foggy, or unclear to Hazentra.</p>
<br></br>
<p>2. Analyze the Image</p>
<p>Hazentra carefully examines every part of the image to understand where the haze is light and where it is more noticeable.</p>
<br></br>
<p>3. Find Hidden Details</p>
<p>It identifies areas where the view has become faded and uses the surrounding clear parts of the image to understand what should be restored.</p>
<br></br>
<p>4. Remove the Haze</p>
<p>Hazentra gently removes the haze while protecting the natural appearance of the photo, ensuring that important details are not lost.</p>
<br></br>
<p>5. Restore Natural Quality</p>
<p>Instead of simply increasing brightness or adding extra color, Hazentra improves clarity while keeping colors, lighting, and textures balanced and realistic.</p>
<br></br>
<p>6. Get a Clear Image</p>
<p>Within moments, you receive a sharper, cleaner, and more vibrant image that closely reflects the original scene, making it easier to view, share, or use.</p>
<br></br>
        </p>
        <div className="mt-6 space-y-2 text-sm text-mist-400">
          <div>Encoder: ViT-Small/16, 384-dim patch tokens</div>
          <div>Codebook: K-Means NAS search</div>
          <div>Refiner: MLP + CNN spatial correction network</div>
          <div>Reconstruction: Dark-channel prior + atmospheric light</div>
        </div>
      </motion.div>
    </div>
  );
}
