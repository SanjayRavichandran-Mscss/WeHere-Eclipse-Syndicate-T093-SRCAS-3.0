import { useEffect, useRef } from "react";

// Small always-on-top self-view so the candidate can see what the proctoring
// camera sees. It's a visual cue only — the stream isn't sent anywhere by
// this demo app; see the README for how a production setup would differ.
export default function ProctorCamera({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div className="proctor-camera" title="Proctoring camera — active for this session">
      <video ref={videoRef} autoPlay playsInline muted />
      <span className="proctor-camera-dot" aria-hidden />
      <span className="proctor-camera-label">REC</span>
    </div>
  );
}
