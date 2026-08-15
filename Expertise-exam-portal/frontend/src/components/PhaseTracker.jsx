import { getUI } from "../i18n.js";

const TIERS = [
  { key: "easy", count: 5 },
  { key: "medium", count: 5 },
  { key: "hard", count: 5 },
];

export default function PhaseTracker({ currentPhase, completedPhases, language }) {
  const t = getUI(language);
  let start = 1;

  return (
    <div className="phase-tracker">
      {TIERS.map((tier, i) => {
        const isDone = completedPhases.includes(tier.key);
        const isCurrent = tier.key === currentPhase;
        const isLocked = !isDone && !isCurrent;
        const end = start + tier.count - 1;
        const range = `${t.q}${start}–${end}`;
        const node = (
          <div
            key={tier.key}
            className={`phase-node ${isDone ? "done" : ""} ${isCurrent ? "current" : ""} ${isLocked ? "locked" : ""}`}
          >
            <span className="phase-index">{String(i + 1).padStart(2, "0")}</span>
            <span className="phase-label">{t[tier.key]}</span>
            <span className="phase-range">{range}</span>
            {isLocked && <span className="phase-lock" aria-hidden>🔒</span>}
            {isDone && <span className="phase-check" aria-hidden>✓</span>}
          </div>
        );
        start = end + 1;
        return node;
      })}
    </div>
  );
}
