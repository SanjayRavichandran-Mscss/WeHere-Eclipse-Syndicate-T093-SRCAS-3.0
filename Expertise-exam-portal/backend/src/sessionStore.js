// Simple in-memory session store. Good enough for a single-server demo.
// Swap for Redis/a database if you need multi-instance or persistence.

const sessions = new Map();
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

export function createSession({ skills, language, userId = null }) {
  const id = crypto.randomUUID();
  const skillList = Array.isArray(skills) ? skills : [skills];
  const session = {
    id,
    userId: Number.isInteger(Number(userId)) ? Number(userId) : null,
    skills: skillList,
    language: language || "English",
    // Display label — kept as `skill` for backwards compatibility with
    // anything that reads a single label (result page headings, etc).
    skill: skillList.join(" + "),
    createdAt: Date.now(),
    currentPhase: "easy",
    phases: {
      easy: { questions: [], answers: [], score: 0, submitted: false },
      medium: { questions: [], answers: [], score: 0, submitted: false },
      hard: { questions: [], answers: [], score: 0, submitted: false },
    },
    complete: false,
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id) {
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(id);
    return null;
  }
  return session;
}

export function allAskedQuestionTexts(session) {
  return [
    ...session.phases.easy.questions,
    ...session.phases.medium.questions,
    ...session.phases.hard.questions,
  ].map((q) => q.question);
}

// Periodically clear stale sessions so memory doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}, 15 * 60 * 1000).unref();
