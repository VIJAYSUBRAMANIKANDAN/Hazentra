import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

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
  const [muted, setMuted] = useState(false);
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

    // Browsers block autoplay-with-audio until the user has interacted with
    // the page at least once — this is a hard browser policy, not something
    // any code trick can bypass. Rather than surfacing a separate "tap for
    // sound" button (which itself needs a tap to appear pointless), we make
    // the *first click/tap/keypress anywhere on the page* — not just this
    // overlay — immediately unmute the still-playing video in place. That
    // covers the common case (someone clicks around the page) without
    // asking for a dedicated interaction just to hear it.
    const unmuteOnFirstGesture = () => {
      if (video && video.muted) {
        video.muted = false;
        setMuted(false);
      }
      window.removeEventListener("pointerdown", unmuteOnFirstGesture);
      window.removeEventListener("keydown", unmuteOnFirstGesture);
    };

    if (video) {
      video.addEventListener("timeupdate", handleTimeUpdate);
      // Still listen for "ended" as a safety net — e.g. if the video is
      // shorter than FADE_DURATION_S or timeupdate fires too sparsely.
      video.addEventListener("ended", finish);

      // Try with sound first — if the browser already trusts this site
      // (returning visitor, high engagement) this just works with no
      // interaction needed at all.
      video.muted = false;
      video.play().catch(() => {
        // Blocked: fall back to muted autoplay (always allowed) and wait
        // for the first real interaction to unmute automatically.
        video.muted = true;
        setMuted(true);
        video.play().catch(finish);
        window.addEventListener("pointerdown", unmuteOnFirstGesture);
        window.addEventListener("keydown", unmuteOnFirstGesture);
      });
    }

    return () => {
      clearTimeout(fallback);
      video?.removeEventListener("timeupdate", handleTimeUpdate);
      video?.removeEventListener("ended", finish);
      window.removeEventListener("pointerdown", unmuteOnFirstGesture);
      window.removeEventListener("keydown", unmuteOnFirstGesture);
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
      {muted && (
        <span className="absolute bottom-6 right-6 text-[11px] text-mist-400/70">
          Click anywhere for sound
        </span>
      )}
    </div>
  );
}
