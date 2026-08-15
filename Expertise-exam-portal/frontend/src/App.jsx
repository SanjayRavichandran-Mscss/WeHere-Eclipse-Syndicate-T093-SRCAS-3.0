import { useState } from "react";
import Landing from "./pages/Landing.jsx";
import Assessment from "./pages/Assessment.jsx";
import Result from "./pages/Result.jsx";
import { stopProctoringMedia } from "./hooks/useProctoring.js";

export default function App() {
  const [view, setView] = useState("landing"); // landing | assessment | result
  const [skills, setSkills] = useState([]);
  const [language, setLanguage] = useState("English");
  const [userId, setUserId] = useState(null);
  const [mediaStreams, setMediaStreams] = useState(null); // { cameraStream, screenStream }
  const [finalResult, setFinalResult] = useState(null);
  const [preparedAssessment, setPreparedAssessment] = useState(null);

  function handleEnterAssessment(profile, streams, prepared) {
    setSkills(profile.skills);
    setLanguage(profile.language);
    setUserId(profile.userId);
    setMediaStreams(streams);
    setPreparedAssessment(prepared);
    setView("assessment");
  }

  function handleFinish(result) {
    stopProctoringMedia(mediaStreams);
    setMediaStreams(null);
    setFinalResult(result);
    setView("result");
  }

  function handleAbort() {
    stopProctoringMedia(mediaStreams);
    setMediaStreams(null);
    setView("landing");
  }

  function handleRestart() {
    setSkills([]);
    setLanguage("English");
    setUserId(null);
    setPreparedAssessment(null);
    setFinalResult(null);
    setView("landing");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">P</span>
          <span className="brand-name">Proficio</span>
        </div>
        <span className="brand-tag">Expertise Exam Portal</span>
      </header>

      <main className="stage">
        {view === "landing" && <Landing onEnter={handleEnterAssessment} />}
        {view === "assessment" && (
          <Assessment
            skills={skills}
            language={language}
            userId={userId}
            mediaStreams={mediaStreams}
            initialAssessment={preparedAssessment}
            onFinish={handleFinish}
            onAbort={handleAbort}
          />
        )}
        {view === "result" && (
          <Result skill={skills.join(" + ")} language={language} result={finalResult} onRestart={handleRestart} />
        )}
      </main>
    </div>
  );
}
