import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Volume2 } from "lucide-react";

const SESSION_KEY = "hazentra_intro_played";
// Safety net: if the video can't play for any reason (autoplay blocked,
// slow connection, codec issue), never trap the user on the intro screen.
const FALLBACK_TIMEOUT_MS = 8000;
// How long the overlay takes to fade out. We start this fade while the
// video is still playing its final moments (see handleTimeUpdate below),
// rather than waiting for "ended" — otherwise the video freezes on its
// last frame for the full fade duration before anything moves again,
// which reads as a stutter/pause instead of a smooth blend into Home.
const FADE_DURATION_S = 0.6;

export default function IntroLoader({ onDone }: { onDone: () => void }) {
  const [mounted, setMounted] = useState(true);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const alreadyPlayed = sessionStorage.getItem(SESSION_KEY);
    if (alreadyPlayed) {
      setMounted(false);
      onDone();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      sessionStorage.setItem(SESSION_KEY, "1");
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: FADE_DURATION_S,
        ease: "power2.inOut",
        onComplete: () => {
          setMounted(false);
          onDone();
        },
      });
    };

    const fallback = setTimeout(finish, FALLBACK_TIMEOUT_MS);
    const video = videoRef.current;
    let fadeStarted = false;

    // Kick off the fade a little before the video actually ends, so the
    // overlay is blending out while the last frames are still playing
    // instead of after the video has already frozen on its final frame.
    const handleTimeUpdate = () => {
      if (fadeStarted || !video || !Number.isFinite(video.duration)) return;
      if (video.duration - video.currentTime <= FADE_DURATION_S) {
        fadeStarted = true;
        finish();
      }
    };

    if (video) {
      video.addEventListener("timeupdate", handleTimeUpdate);
      // Still listen for "ended" as a safety net — e.g. if the video is
      // shorter than FADE_DURATION_S or timeupdate fires too sparsely.
      video.addEventListener("ended", finish);

      // Try with sound first. Most browsers block autoplay-with-audio on a
      // user's very first visit — if that happens, fall back to a muted
      // autoplay (which is always allowed) and surface a small tap-to-unmute
      // affordance instead of silently failing or blocking the intro.
      video.muted = false;
      video.play().catch(() => {
        video.muted = true;
        setShowUnmuteHint(true);
        video.play().catch(finish);
      });
    }

    return () => {
      clearTimeout(fallback);
      video?.removeEventListener("timeupdate", handleTimeUpdate);
      video?.removeEventListener("ended", finish);
    };
  }, [onDone]);

  if (!mounted) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-ink-950 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src="/hazentra-intro.mp4"
        className="w-full h-full object-contain"
        playsInline
        autoPlay
        preload="auto"
      />

      {showUnmuteHint && (
        <button
          onClick={(e) => {
            const video = videoRef.current;
            if (video) {
              video.muted = false;
              video.play().catch(() => {});
            }
            setShowUnmuteHint(false);
            e.stopPropagation();
          }}
          className="absolute bottom-6 right-6 flex items-center gap-2 rounded-full bg-ink-900/80 border border-ink-600 px-4 py-2 text-xs font-medium text-mist-200 backdrop-blur hover:bg-ink-800 transition-colors"
        >
          <Volume2 className="w-3.5 h-3.5" />
          Tap for sound
        </button>
      )}
    </div>
  );
}
