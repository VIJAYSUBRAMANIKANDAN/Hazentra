import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const SESSION_KEY = "hazentra_intro_played";
// Absolute last resort if nothing else fires — kept short so a failure
// never leaves someone staring at a frozen screen for long.
const FALLBACK_TIMEOUT_MS = 5000;
// Some browsers/devices (Data Saver mode on budget Android phones, certain
// in-app webviews, decode failures) silently never actually start playing
// even a muted, autoplay-attributed video — play() resolves but the video
// stays paused at currentTime 0 forever. Checking shortly after play()
// resolves and bailing out fast (instead of waiting the full fallback)
// keeps the intro from ever feeling "stuck" on constrained devices.
const PLAYBACK_START_CHECK_MS = 1800;
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

  // A full 4K/60fps file is unnecessarily heavy to decode on phone GPUs and
  // can itself cause stutter independent of any autoplay issue — serve a
  // much lighter, lower-fps encode there instead. Computed once (device
  // capability doesn't change mid-session), not on every render.
  const [introSrc] = useState(() => {
    if (typeof window === "undefined") return "/hazentra-intro.mp4";
    const isConstrained =
      window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    return isConstrained ? "/hazentra-intro-mobile.mp4" : "/hazentra-intro.mp4";
  });

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
    let startCheckTimer: ReturnType<typeof setTimeout> | undefined;

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
      // A hard load/decode failure (bad network, unsupported profile on an
      // old device, wrong path) fires "error", not a rejected play() —
      // bail out immediately rather than waiting for any timeout.
      video.addEventListener("error", finish);

      // Mobile browsers (iOS Safari, Chrome/Android) block *any* autoplay
      // that isn't muted — with no exceptions, unlike desktop where a
      // trusted/returning site can sometimes get unmuted autoplay. Worse,
      // on several mobile browsers a failed unmuted play() attempt leaves
      // the element in a state where a subsequent muted play() also stalls
      // silently — so "try unmuted, fall back to muted" isn't just blocked
      // on mobile, it can hang entirely. Always start muted (which is
      // universally allowed everywhere) and unmute only after a real user
      // gesture, via the listener below.
      video.muted = true;
      setMuted(true);
      video.play().catch(finish);

      // Belt-and-braces: some devices (Data Saver mode, certain in-app
      // browsers, restrictive battery-saver settings) resolve play()
      // successfully but the video never actually advances past frame
      // zero. Check shortly after and bail out fast rather than waiting
      // the full fallback timeout.
      startCheckTimer = setTimeout(() => {
        if (!finished && video.paused && video.currentTime === 0) {
          finish();
        }
      }, PLAYBACK_START_CHECK_MS);

      window.addEventListener("pointerdown", unmuteOnFirstGesture);
      window.addEventListener("keydown", unmuteOnFirstGesture);
    }

    return () => {
      clearTimeout(fallback);
      if (startCheckTimer) clearTimeout(startCheckTimer);
      video?.removeEventListener("timeupdate", handleTimeUpdate);
      video?.removeEventListener("ended", finish);
      video?.removeEventListener("error", finish);
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
        src={introSrc}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
        muted
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
