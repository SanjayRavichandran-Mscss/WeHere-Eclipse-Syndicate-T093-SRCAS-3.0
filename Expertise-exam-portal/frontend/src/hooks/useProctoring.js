import { useEffect, useRef } from "react";

const BLOCKED_KEY_COMBOS = (e) => {
  const key = e.key?.toLowerCase();
  const ctrlOrCmd = e.ctrlKey || e.metaKey;

  if (ctrlOrCmd && ["c", "v", "x"].includes(key)) return "Copy/paste keyboard shortcut used";
  if (key === "f12") return "Developer tools shortcut used";
  if (ctrlOrCmd && e.shiftKey && ["i", "j", "c"].includes(key)) return "Developer tools shortcut used";
  if (ctrlOrCmd && key === "u") return "View-source shortcut used";
  if (ctrlOrCmd && key === "p") return "Print shortcut used";
  return null;
};

/**
 * Locks down copy/paste/cut, right-click, devtools shortcuts, tab switching,
 * window blur, leaving fullscreen, and stopping the camera/screen share
 * while `enabled` is true. The moment any one of these fires,
 * `onViolation(reason)` is called exactly once — callers should treat that
 * as "end the exam now".
 *
 * `mediaStreams` (optional) is the { cameraStream, screenStream } pair
 * returned by `requestProctoringMedia()`. If the candidate stops sharing
 * their screen or their camera track ends (device unplugged, permission
 * revoked mid-exam), that's treated as a proctoring violation too.
 */
export function useProctoring({ enabled, onViolation, mediaStreams }) {
  const firedRef = useRef(false);
  const graceRef = useRef(true);

  useEffect(() => {
    if (!enabled) return undefined;

    firedRef.current = false;
    graceRef.current = true;

    // Short grace window after mount so the fullscreen transition itself
    // (and any resulting focus flicker) doesn't get flagged as a violation.
    const graceTimer = setTimeout(() => {
      graceRef.current = false;
    }, 800);

    const flag = (reason) => {
      if (firedRef.current || graceRef.current) return;
      firedRef.current = true;
      onViolation(reason);
    };

    const blockClipboardEvent = (e) => {
      e.preventDefault();
      flag(`Clipboard action blocked (${e.type})`);
    };

    const blockContextMenu = (e) => {
      e.preventDefault();
      flag("Right-click menu opened");
    };

    const blockKeydown = (e) => {
      const reason = BLOCKED_KEY_COMBOS(e);
      if (reason) {
        e.preventDefault();
        flag(reason);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) flag("Switched away from the exam tab");
    };

    const handleBlur = () => {
      flag("Exam window lost focus");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) flag("Exited fullscreen mode");
    };

    document.addEventListener("copy", blockClipboardEvent);
    document.addEventListener("paste", blockClipboardEvent);
    document.addEventListener("cut", blockClipboardEvent);
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockKeydown);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Camera/screen tracks end if the OS/browser permission is revoked, the
    // device disappears, or (for screen share) the candidate clicks the
    // browser's own "Stop sharing" control. Any of those mid-exam ends the
    // attempt just like exiting fullscreen does.
    const cameraTrack = mediaStreams?.cameraStream?.getVideoTracks?.()[0];
    const screenTrack = mediaStreams?.screenStream?.getVideoTracks?.()[0];
    const handleCameraEnded = () => flag("Camera feed stopped");
    const handleScreenEnded = () => flag("Screen sharing stopped");
    cameraTrack?.addEventListener("ended", handleCameraEnded);
    screenTrack?.addEventListener("ended", handleScreenEnded);

    return () => {
      clearTimeout(graceTimer);
      document.removeEventListener("copy", blockClipboardEvent);
      document.removeEventListener("paste", blockClipboardEvent);
      document.removeEventListener("cut", blockClipboardEvent);
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeydown);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      cameraTrack?.removeEventListener("ended", handleCameraEnded);
      screenTrack?.removeEventListener("ended", handleScreenEnded);
    };
  }, [enabled, onViolation, mediaStreams]);
}

export async function enterProctoredFullscreen() {
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // Fullscreen can be denied (e.g. no user gesture, unsupported browser).
    // We don't block the exam on this — the other checks still apply.
  }
}

/**
 * Requests camera + full-screen-share access for proctoring. Must be called
 * synchronously from within a user-gesture handler (e.g. a form submit or
 * button click) — browsers require that direct call stack for
 * `getDisplayMedia`, same as `requestFullscreen`.
 *
 * Throws if either permission is denied or unsupported, so the caller can
 * keep the candidate on the entry screen with a clear error instead of
 * starting a proctored exam it can't actually monitor.
 */
export async function requestProctoringMedia() {
  if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("This browser doesn't support camera/screen-share proctoring.");
  }

  let cameraStream;
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch {
    throw new Error("Camera access is required to start this proctored assessment.");
  }

  let screenStream;
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  } catch {
    cameraStream.getTracks().forEach((t) => t.stop());
    throw new Error("Screen-share access is required to start this proctored assessment.");
  }

  return { cameraStream, screenStream };
}

/** Stops every track on both streams — call this when the exam ends or is aborted. */
export function stopProctoringMedia(mediaStreams) {
  if (!mediaStreams) return;
  mediaStreams.cameraStream?.getTracks().forEach((t) => t.stop());
  mediaStreams.screenStream?.getTracks().forEach((t) => t.stop());
}
