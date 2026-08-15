import { useCallback, useEffect, useRef, useState } from "react";
import { startAssessment, submitPhase, terminateAssessment } from "../api.js";
import PhaseTracker from "../components/PhaseTracker.jsx";
import QuestionCard from "../components/QuestionCard.jsx";
import ProctorCamera from "../components/ProctorCamera.jsx";
import { useProctoring } from "../hooks/useProctoring.js";
import { getUI } from "../i18n.js";

export default function Assessment({ skills, language, userId, mediaStreams, initialAssessment, onFinish, onAbort }) {
  const skillLabel = skills.join(" + ");
  const t = getUI(language);
  const [sessionId, setSessionId] = useState(null);
  const [phase, setPhase] = useState("easy");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: selectedIndex }
  const [completedPhases, setCompletedPhases] = useState([]);
  const [runningScore, setRunningScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingLabel, setLoadingLabel] = useState(t.generating.replace("{tier}", t.easy));
  const [error, setError] = useState(null);
  const [violation, setViolation] = useState(null); // reason string, or null

  // Always-current snapshot so the proctoring listeners (attached once, kept
  // alive for the whole exam) can read the latest answers without having to
  // re-attach themselves on every keystroke.
  const stateRef = useRef({});
  stateRef.current = { sessionId, phase, questions, answers };

  // Guards against React StrictMode's dev-only double-invoke of effects
  // (mount → unmount → mount), which would otherwise fire /start twice —
  // spinning up two sessions and sending two concurrent generation requests
  // to Ollama. Since Ollama serializes inference, the second request queues
  // behind the first and both are far more likely to hit the timeout and
  // fall back to the static question bank.
  const startedRef = useRef(false);

  const handleViolation = useCallback(async (reason) => {
    setViolation(reason);
    const { sessionId: sid, phase: ph, questions: qs, answers: ans } = stateRef.current;
    const payload = qs.map((q) => ({ id: q.id, selectedIndex: ans[q.id] }));
    try {
      const data = await terminateAssessment(sid, ph, payload, reason);
      onFinish(data);
    } catch {
      // Even if the terminate call itself fails (e.g. network hiccup), don't
      // let the candidate keep going — leave them on the violation screen.
    }
  }, [onFinish]);

  useProctoring({
    enabled: !loading && !error && !violation && !!sessionId,
    onViolation: handleViolation,
    mediaStreams,
  });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (initialAssessment?.sessionId) {
      setSessionId(initialAssessment.sessionId);
      setQuestions(initialAssessment.questions || []);
      setPhase(initialAssessment.phase || "easy");
      setLoading(false);
      return;
    }

    if (!userId) {
      setError("No user ID was supplied for this assessment.");
      setLoading(false);
      return;
    }

    startAssessment(userId)
      .then((data) => {
        setSessionId(data.sessionId);
        setQuestions(data.questions);
        setPhase(data.phase);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  function handleSelect(questionId, index) {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  }

  async function handleSubmitPhase() {
    setError(null);
    setLoading(true);
    setLoadingLabel(
      phase === "easy" ? t.gradingEasy : t.gradingMedium
    );

    const payload = questions.map((q) => ({ id: q.id, selectedIndex: answers[q.id] }));

    try {
      const data = await submitPhase(sessionId, phase, payload);
      setCompletedPhases((prev) => [...prev, phase]);

      if (data.done) {
        onFinish(data);
        return;
      }

      setRunningScore(data.runningScore);
      setPhase(data.nextPhase);
      setQuestions(data.questions);
      setAnswers({});
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (violation) {
    return (
      <section className="panel violation-panel">
        <div className="violation-icon" aria-hidden>⚠</div>
        <h2>{t.terminated}</h2>
        <p className="violation-reason">{violation}</p>
        <p className="hint">
          {t.violation}
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <h2>{t.somethingWrong}</h2>
        <p className="error-text">{error}</p>
        <p className="hint">
          {t.backendHint}
        </p>
        <button className="btn-secondary" onClick={onAbort}>
          {t.back}
        </button>
      </section>
    );
  }

  if (loading) {
    return <LoadingPanel label={loadingLabel} language={language} />;
  }

  return (
    <section className="assessment">
      <ProctorCamera stream={mediaStreams?.cameraStream} />

      <PhaseTracker currentPhase={phase} completedPhases={completedPhases} language={language} />

      <div className="assessment-head">
        <h2>{skillLabel} {t.assessment} — {t[phase]} · {t.q}{phase === "easy" ? "1–5" : phase === "medium" ? "6–10" : "11–15"}</h2>
        <span className="progress-pill">
          {answeredCount}/{questions.length} {t.answered}
        </span>
      </div>

      <div className="question-list">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={phase === "easy" ? i : phase === "medium" ? i + 5 : i + 10}
            selectedIndex={answers[q.id]}
            onSelect={handleSelect}
            showSkillTag={skills.length > 1}
          />
        ))}
      </div>

      <div className="assessment-footer">
        <button className="btn-primary" disabled={!allAnswered} onClick={handleSubmitPhase}>
          {phase === "hard" ? t.submitResult : t.submitNext}
        </button>
        {!allAnswered && <span className="hint">{t.answerEvery}</span>}
      </div>
    </section>
  );
}

// Local models can genuinely take a while, especially the first call after
// Ollama starts (loading the model into memory) or on CPU-only machines.
// Rather than a spinner with no context, this explains what's happening and
// says so plainly once it's taking longer than a normal call should.
function LoadingPanel({ label, language }) {
  const t = getUI(language);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [label]);

  return (
    <section className="panel loading-panel">
      <div className="spinner" aria-hidden />
      <p>{label}</p>
      <p className="loading-elapsed">{elapsed}s</p>
      {elapsed >= 12 && (
        <p className="hint loading-slow-hint">
          {t.stillWorking}
        </p>
      )}
    </section>
  );
}
