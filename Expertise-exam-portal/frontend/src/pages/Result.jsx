import { getUI } from "../i18n.js";

const PHASE_START_INDEX = { easy: 0, medium: 5, hard: 10 };

export default function Result({ skill, language, result, onRestart }) {
  const t = getUI(language);
  if (!result) return null;
  const { finalScore, percent, isExpert, breakdown, phaseResult, terminated, reason } = result;

  return (
    <section className="result">
      <div className={`verdict-card ${isExpert ? "expert" : "not-expert"} ${terminated ? "terminated" : ""}`}>
        {isExpert && <div className="seal">{t.expert}</div>}
        {terminated && <div className="seal seal-flag">{t.disqualified}</div>}
        <p className="eyebrow">{skill} {t.result}</p>
        <h1>{finalScore} / 75</h1>
        {terminated ? (
          <p className="verdict-line">
            {t.terminatedResult.replace("{reason}", reason)}
          </p>
        ) : (
          <p className="verdict-line">
            {isExpert
              ? t.scoreExpert.replace("{percent}", percent).replace("{skill}", skill)
              : t.scoreRetry.replace("{percent}", percent)}
          </p>
        )}
      </div>

      <div className="breakdown">
        {breakdown.map((b) => (
          <div key={b.phase} className="breakdown-row">
            <span className="breakdown-tier">{t[b.phase]}</span>
            <span className="breakdown-fraction">
              {b.correctCount}/{b.total} {t.correct}
            </span>
            <div className="breakdown-bar">
              <div
                className="breakdown-bar-fill"
                style={{ width: `${(b.correctCount / b.total) * 100}%` }}
              />
            </div>
            <span className="breakdown-score">{b.score} {t.points}</span>
          </div>
        ))}
      </div>

      <div className="review">
        <h3>{t[phaseResult.phase]} {t.tierReview}</h3>
        {phaseResult.graded.map((g, i) => (
          <div key={g.id} className={`review-row ${g.correct ? "correct" : "incorrect"}`}>
            <span className="review-mark">{g.correct ? "✓" : "✕"}</span>
            <div>
              <p className="review-question">
                {PHASE_START_INDEX[phaseResult.phase] + i + 1}. {g.text}
              </p>
              {!g.correct && (
                <p className="review-detail">
                  {t.youPicked} "{g.selectedIndex != null ? g.options[g.selectedIndex] : t.noAnswer}".
                  {t.correctAnswer}: "{g.options[g.correctIndex]}"
                  {g.explanation ? ` — ${g.explanation}` : ""}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary" onClick={onRestart}>
        {t.tryAgain}
      </button>
    </section>
  );
}
