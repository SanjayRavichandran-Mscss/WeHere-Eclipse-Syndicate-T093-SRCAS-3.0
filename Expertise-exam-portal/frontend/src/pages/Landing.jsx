import { useEffect, useRef, useState } from "react";
import { fetchHealth, fetchUserExpertise, startAssessment } from "../api.js";
import { enterProctoredFullscreen, requestProctoringMedia } from "../hooks/useProctoring.js";

function resolveUserId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("user_id") || params.get("userId");
  const fromStorage = localStorage.getItem("user_id") || localStorage.getItem("userId") || localStorage.getItem("loggedInUserId");
  const fromEnv = import.meta.env.VITE_USER_ID;
  const id = Number(fromUrl || fromStorage || fromEnv);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default function Landing({ onEnter }) {
  const [profile, setProfile] = useState(null);
  const [preparedAssessment, setPreparedAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generationStarted, setGenerationStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [requestingMedia, setRequestingMedia] = useState(false);
  const startedRef = useRef(false);
  const userId = resolveUserId();

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetchHealth().then((data) => setHealth(!!data.ok)).catch(() => setHealth(false));

    if (!userId) {
      setError("No user ID was found. Set VITE_USER_ID in frontend/.env or store the logged-in user's ID in localStorage as user_id.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);

    (async () => {
      try {
        // Fetch the logged-in user's saved expertise directly from MySQL.
        // Do this before starting Ollama so the assessment can never use a
        // manually-entered or hard-coded skill/language.
        const savedProfile = await fetchUserExpertise(userId);
        if (cancelled) return;

        if (!savedProfile?.skills?.length) {
          throw new Error(`No skills found in wehere.user_expertise for user_id ${userId}`);
        }
        if (!savedProfile?.language) {
          throw new Error(`No preferred_language found in wehere.user_expertise for user_id ${userId}`);
        }

        setProfile(savedProfile);
        setGenerationStarted(true);

        // The backend reloads the same profile server-side and starts the
        // assessment using those saved values.
        const assessment = await startAssessment(savedProfile.userId);
        if (cancelled) return;
        setPreparedAssessment(assessment);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load your saved expertise from MySQL.");
          setLoading(false);
        }
      } finally {
        clearInterval(timer);
      }
    })();

    return () => { cancelled = true; clearInterval(timer); };
  }, [userId]);

  async function handleContinue() {
    if (!profile || !preparedAssessment || requestingMedia) return;
    setMediaError(null);
    setRequestingMedia(true);
    try {
      const mediaStreams = await requestProctoringMedia();
      await enterProctoredFullscreen();
      onEnter(profile, mediaStreams, preparedAssessment);
    } catch (err) {
      setMediaError(err.message);
      setRequestingMedia(false);
    }
  }

  if (error) return (
    <section className="panel">
      <h2>Unable to prepare your assessment</h2>
      <p className="error-text">{error}</p>
      <p className="hint">Skills and preferred language are loaded from wehere.user_expertise.</p>
    </section>
  );

  return (
    <section className="landing">
      <div className="landing-copy">
        <p className="eyebrow">Certification, not guesswork</p>
        <h1>Your assessment is being prepared.<br />No manual setup required.</h1>
        <p className="lede">Your saved skills and preferred language are read from your profile automatically. Ollama then builds 5 easy, 5 medium, and 5 hard questions in that language.</p>
        {health === false && <p className="error-text">Ollama is not reachable. Start Ollama before continuing.</p>}
      </div>

      <div className="entry-card">
        <label>Your saved expertise</label>
        <div className="profile-summary">
          <div className="profile-row"><span>Skills</span><strong>{profile ? profile.skills.join(", ") : "Fetching from MySQL…"}</strong></div>
          <div className="profile-row"><span>Preferred language</span><strong>{profile?.language || "Fetching from MySQL…"}</strong></div>
          <div className="profile-row"><span>User ID</span><strong>{profile?.userId || userId || "Loading…"}</strong></div>
        </div>

        {generationStarted && !preparedAssessment && (
          <div className="profile-generation-status">
            <div className="spinner" aria-hidden />
            <p>Generating your assessment automatically…</p>
            <p className="loading-elapsed">{elapsed}s</p>
            <p className="hint">Ollama may take some time on a CPU-only machine. Please keep this page open.</p>
          </div>
        )}

        {preparedAssessment && <>
          <p className="success-text">Your 5 Easy + 5 Medium + 5 Hard questions are ready.</p>
          <button className="btn-primary" type="button" onClick={handleContinue} disabled={requestingMedia}>
            {requestingMedia ? "Requesting camera & screen access…" : "Start Assessment"}
          </button>
        </>}

        {mediaError && <p className="error-text">{mediaError}</p>}
        <ul className="entry-meta">
          <li>15 questions · 75 points total</li>
          <li>Easy → Medium → Hard</li>
          <li>Questions and options use the saved preferred language</li>
          <li>Generated questions are stored in wehere.exam_questions</li>
        </ul>
      </div>
    </section>
  );
}
