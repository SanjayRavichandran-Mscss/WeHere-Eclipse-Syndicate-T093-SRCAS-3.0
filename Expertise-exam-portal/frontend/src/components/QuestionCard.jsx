export default function QuestionCard({ question, index, selectedIndex, onSelect, showSkillTag }) {
  return (
    <div className="question-card">
      <div className="question-head">
        <span className="q-number">{String(index + 1).padStart(2, "0")}</span>
        <div>
          {showSkillTag && question.skill && <span className="q-skill-tag">{question.skill}</span>}
          <p className="q-text">{question.text}</p>
        </div>
      </div>
      <div className="options">
        {question.options.map((opt, i) => (
          <label key={i} className={`option ${selectedIndex === i ? "selected" : ""}`}>
            <input
              type="radio"
              name={question.id}
              checked={selectedIndex === i}
              onChange={() => onSelect(question.id, i)}
            />
            <span className="option-letter">{String.fromCharCode(65 + i)}</span>
            <span className="option-text">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
