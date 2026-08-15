import { Router } from "express";
import { generateQuestions, checkOllamaHealth } from "../ollamaClient.js";
import { createSession, getSession, allAskedQuestionTexts } from "../sessionStore.js";
import { getUserExpertise, saveGeneratedQuestions } from "../db.js";

const router = Router();

const SKILLS = ["JavaScript", "Python", "React", "Node.js"];

const PHASE_ORDER = ["easy", "medium", "hard"];
const PHASE_COUNT = { easy: 5, medium: 5, hard: 5 };
const POINTS_PER_QUESTION = 5; // 15 questions x 5 = 75
const TOTAL_QUESTIONS = Object.values(PHASE_COUNT).reduce((sum, count) => sum + count, 0);
const TOTAL_POINTS = TOTAL_QUESTIONS * POINTS_PER_QUESTION;
const EXPERT_THRESHOLD = 80; // percent

const SUPPORTED_LANGUAGES = [
  "English", "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada",
  "Bengali", "Marathi", "Gujarati", "Punjabi", "Urdu",
  "Spanish", "French", "German", "Italian", "Portuguese",
  "Russian", "Arabic", "Japanese", "Korean", "Chinese"
];

function sanitize(questions, phase) {
  return questions.map((q, i) => ({
    id: `${phase}-${i}`,
    text: q.question,
    options: q.options,
    skill: q.skill,
  }));
}

async function getQuestionsFor(skill, difficulty, count, avoid, language) {
  if (count <= 0) return { questions: [], source: "ai" };
  try {
    const generated = await generateQuestions({ skill, difficulty, count, avoid, language });
    return {
      questions: generated.questions.map((q) => ({ ...q, skill })),
      source: generated.source === "ollama" ? "ai" : "fallback",
    };
  } catch (err) {
    console.error(
      `[assessment] Ollama generation failed for ${skill}/${difficulty}/${language}. Reason: ${err.message}`
    );
    // Do not silently switch to English fallback questions when a non-English
    // language was selected. The exam must contain Ollama-generated content
    // in the language the candidate selected.
    throw err;
  }
}

// Splits `total` questions as evenly as possible across `n` skills, e.g.
// splitCount(5, 3) -> [2, 2, 1]. The remainder is spread across the first
// skills so every skill gets at least floor(total/n) and the sum is exact.
function splitCount(total, n) {
  const base = Math.floor(total / n);
  const remainder = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

// Generates exactly five questions for each tier. If multiple skills are entered,
// the five questions are split as evenly as possible across those skills.
async function getQuestionsForTier(skills, difficulty, totalCount, avoid, language) {
  const counts = splitCount(totalCount, skills.length);
  const results = await Promise.all(
    skills.map((skill, i) => getQuestionsFor(skill, difficulty, counts[i], avoid, language))
  );

  const questions = results.flatMap((r) => r.questions);
  const source = results.every((r) => r.source === "ai") ? "ai" : "fallback";
  return { questions, source };
}

// Grades whatever answers were submitted for a phase (answers may be a
// partial array — anything unanswered just counts as wrong). Shared by the
// normal /submit flow and the proctoring /terminate flow.
function gradePhase(session, phase, answers) {
  const phaseData = session.phases[phase];
  const safeAnswers = Array.isArray(answers) ? answers : [];

  const graded = phaseData.questions.map((q, i) => {
    const id = `${phase}-${i}`;
    const submitted = safeAnswers.find((a) => a.id === id);
    const selectedIndex = submitted ? submitted.selectedIndex : null;
    const correct = selectedIndex === q.correctIndex;
    return {
      id,
      text: q.question,
      options: q.options,
      skill: q.skill,
      selectedIndex,
      correctIndex: q.correctIndex,
      correct,
      explanation: q.explanation,
    };
  });

  const correctCount = graded.filter((g) => g.correct).length;
  phaseData.answers = graded;
  phaseData.score = correctCount * POINTS_PER_QUESTION;
  phaseData.submitted = true;

  return { graded, correctCount };
}

function buildBreakdown(session) {
  return PHASE_ORDER.map((p) => ({
    phase: p,
    score: session.phases[p].score,
    correctCount: session.phases[p].answers.filter((a) => a.correct).length,
    total: PHASE_COUNT[p],
  }));
}

const MAX_SKILLS = 5;

// Prevent duplicate automatic starts for the same user. This is important
// because React StrictMode, browser refreshes, multiple tabs, or hot reloads
// can send /start more than once. Without this guard, several Ollama jobs can
// run at the same time and make generation extremely slow.
const activeStartPromises = new Map(); // userId -> Promise<startResult>
const activeSessionsByUser = new Map(); // userId -> sessionId

function getExistingSessionForUser(userId) {
  const sessionId = activeSessionsByUser.get(userId);
  if (!sessionId) return null;

  const session = getSession(sessionId);
  if (!session || session.complete) {
    activeSessionsByUser.delete(userId);
    return null;
  }
  return session;
}

function buildStartResponse(session, profile, language, source) {
  return {
    sessionId: session.id,
    userId: profile.userId,
    expertiseId: profile.expertiseId,
    skills: session.skills,
    skill: session.skill,
    phase: session.currentPhase,
    phaseLabel: `Easy (Q1–${PHASE_COUNT.easy})`,
    language,
    questions: sanitize(session.phases.easy.questions, "easy"),
    questionSource: source,
  };
}

// Accepts either the new `skills: string[]` field or the legacy single
// `skill: string` field, trims/dedupes, and caps the count so one candidate
// can't fan a single request out into dozens of parallel Ollama calls.
function normalizeSkills(body) {
  const raw = Array.isArray(body.skills)
    ? body.skills
    : typeof body.skill === "string"
    ? [body.skill]
    : [];

  const seen = new Set();
  const cleaned = [];
  for (const s of raw) {
    if (typeof s !== "string") continue;
    const trimmed = s.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(trimmed);
  }
  return cleaned.slice(0, MAX_SKILLS);
}

router.get("/skills", (req, res) => {
  res.json({ skills: SKILLS });
});

router.get("/languages", (req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
});

router.get("/health", async (req, res) => {
  const health = await checkOllamaHealth();
  res.json(health);
});

router.get("/profile/:userId", async (req, res) => {
  try {
    const profile = await getUserExpertise(req.params.userId);
    const language = SUPPORTED_LANGUAGES.find((item) => item.toLowerCase() === profile.language.toLowerCase());
    if (!language) {
      return res.status(400).json({ error: `Unsupported preferred language '${profile.language}'.`, supportedLanguages: SUPPORTED_LANGUAGES });
    }
    res.json({ ...profile, language });
  } catch (err) {
    console.error(`[assessment] Failed to load user expertise: ${err.message}`);
    res.status(404).json({ error: err.message });
  }
});

// Start a new assessment: generates exactly 5 EASY questions, split
// across every skill the candidate entered.
router.post("/start", async (req, res) => {
  const userId = Number(req.body.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "A valid userId is required" });
  }

  // If this user already has an unfinished assessment, reuse it instead of
  // starting another expensive Ollama generation job.
  const existingSession = getExistingSessionForUser(userId);
  if (existingSession) {
    console.log(`[assessment] REUSE user=${userId} session=${existingSession.id} (generation already completed)`);

    let profile;
    try {
      profile = await getUserExpertise(userId);
    } catch (err) {
      console.error(`[assessment] Could not load user ${userId} expertise: ${err.message}`);
      return res.status(404).json({ error: err.message });
    }

    const language = SUPPORTED_LANGUAGES.find(
      (item) => item.toLowerCase() === profile.language.toLowerCase()
    );
    if (!language) {
      return res.status(400).json({
        error: `Unsupported preferred language '${profile.language}'.`,
        supportedLanguages: SUPPORTED_LANGUAGES,
      });
    }

    return res.json(
      buildStartResponse(existingSession, profile, language, existingSession.questionSource || "ai")
    );
  }

  // If another request is already generating this user's assessment, wait for
  // that exact same generation instead of launching another Ollama request.
  const existingStart = activeStartPromises.get(userId);
  if (existingStart) {
    console.log(`[assessment] WAIT user=${userId}: another /start is already generating`);
    try {
      const result = await existingStart;
      return res.json(result.response);
    } catch (err) {
      return res.status(500).json({
        error: err?.message || "Assessment generation failed",
      });
    }
  }

  const startPromise = (async () => {
    let profile;
    try {
      profile = await getUserExpertise(userId);
    } catch (err) {
      console.error(`[assessment] Could not load user ${userId} expertise: ${err.message}`);
      throw Object.assign(new Error(err.message), { statusCode: 404 });
    }

    const language = SUPPORTED_LANGUAGES.find(
      (item) => item.toLowerCase() === profile.language.toLowerCase()
    );
    if (!language) {
      throw Object.assign(
        new Error(`Unsupported preferred language '${profile.language}'.`),
        { statusCode: 400 }
      );
    }

    const skills = normalizeSkills({ skills: profile.skills });
    if (skills.length === 0) {
      throw Object.assign(
        new Error(`No usable skills found for user_id ${userId}`),
        { statusCode: 400 }
      );
    }

    console.log(
      `[assessment] AUTO START user=${userId}: skills=${skills.join(", ")} language=${language}`
    );

    const session = createSession({ skills, language, userId });
    const { questions, source } = await getQuestionsForTier(
      skills,
      "easy",
      PHASE_COUNT.easy,
      [],
      language
    );

    // Never return an incomplete Easy tier. generateQuestions already uses
    // its fallback logic; this is only a final safety check.
    if (questions.length < PHASE_COUNT.easy) {
      throw new Error(
        `Assessment generation returned only ${questions.length}/${PHASE_COUNT.easy} Easy questions`
      );
    }

    session.phases.easy.questions = questions.slice(0, PHASE_COUNT.easy);

    // Persist the generated paper immediately. One exam_id groups the full
    // assessment, while later phases are saved when they are unlocked.
    for (const skill of skills) {
      const skillQuestions = session.phases.easy.questions.filter((q) => q.skill === skill);
      if (skillQuestions.length) {
        await saveGeneratedQuestions({
          examId: session.id,
          skill,
          language,
          difficulty: "easy",
          questions: skillQuestions,
          source,
        });
      }
    }

    session.questionSource = source;
    activeSessionsByUser.set(userId, session.id);

    console.log(
      `[assessment] READY user=${userId} session=${session.id}: Easy ${session.phases.easy.questions.length}/${PHASE_COUNT.easy}`
    );

    return {
      session,
      response: buildStartResponse(session, profile, language, source),
    };
  })();

  activeStartPromises.set(userId, startPromise);

  try {
    const result = await startPromise;
    return res.json(result.response);
  } catch (err) {
    const status = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
    console.error(`[assessment] START failed for user=${userId}: ${err?.message || err}`);
    return res.status(status).json({
      error: err?.message || "Assessment generation failed",
    });
  } finally {
    // Only remove the promise if it is still this exact promise.
    if (activeStartPromises.get(userId) === startPromise) {
      activeStartPromises.delete(userId);
    }
  }
});

// Submit answers for the current phase. Grades it, and if the candidate has
// completed a phase, unlocks + generates the next one.
router.post("/:sessionId/submit", async (req, res) => {
  const { sessionId } = req.params;
  const { phase, answers } = req.body; // answers: [{ id, selectedIndex }]

  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });
  if (session.complete) return res.status(400).json({ error: "Assessment already complete" });
  if (phase !== session.currentPhase) {
    return res.status(400).json({ error: `Expected submission for phase '${session.currentPhase}'` });
  }
  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: "answers must be an array" });
  }

  const phaseData = session.phases[phase];
  const { graded, correctCount } = gradePhase(session, phase, answers);

  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const isLastPhase = phaseIndex === PHASE_ORDER.length - 1;

  const runningScore = PHASE_ORDER.slice(0, phaseIndex + 1).reduce(
    (sum, p) => sum + session.phases[p].score,
    0
  );

  if (isLastPhase) {
    session.complete = true;
    if (session.userId) activeSessionsByUser.delete(session.userId);
    const percent = Math.round((runningScore / TOTAL_POINTS) * 100);
    return res.json({
      done: true,
      phaseResult: { phase, correctCount, total: phaseData.questions.length, score: phaseData.score, graded },
      finalScore: runningScore,
      percent,
      isExpert: percent >= EXPERT_THRESHOLD,
      terminated: false,
      breakdown: buildBreakdown(session),
    });
  }

  // Unlock next phase
  const nextPhase = PHASE_ORDER[phaseIndex + 1];
  session.currentPhase = nextPhase;
  const avoid = allAskedQuestionTexts(session);
  const { questions, source } = await getQuestionsForTier(
    session.skills,
    nextPhase,
    PHASE_COUNT[nextPhase],
    avoid,
    session.language
  );
  session.phases[nextPhase].questions = questions;

  // Persist the newly generated phase before sending it to the frontend.
  for (const skill of session.skills) {
    const skillQuestions = questions.filter((q) => q.skill === skill);
    if (skillQuestions.length) {
      await saveGeneratedQuestions({
        examId: session.id,
        skill,
        language: session.language,
        difficulty: nextPhase,
        questions: skillQuestions,
        source,
      });
    }
  }

  const phaseLabels = {
    medium: "Medium (Q6–10)",
    hard: "Hard (Q11–15)",
  };

  res.json({
    done: false,
    phaseResult: { phase, correctCount, total: phaseData.questions.length, score: phaseData.score, graded },
    runningScore,
    nextPhase,
    nextPhaseLabel: phaseLabels[nextPhase],
    questions: sanitize(questions, nextPhase),
    questionSource: source,
  });
});

// Proctoring kill-switch. The frontend calls this the moment it detects
// malpractice (copy/paste, tab switch, devtools, leaving fullscreen, etc).
// Whatever was answered in the current phase is graded as-is; any phase(s)
// never reached score zero. Expert status is always denied on termination,
// regardless of the score reached, since the attempt is disqualified.
router.post("/:sessionId/terminate", (req, res) => {
  const { sessionId } = req.params;
  const { phase, answers, reason } = req.body;

  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });
  if (session.complete) return res.status(400).json({ error: "Assessment already complete" });

  const targetPhase = phase && session.phases[phase] ? phase : session.currentPhase;
  const { graded, correctCount } = gradePhase(session, targetPhase, answers);

  // Any phase after this one was never attempted — it stays at 0/0 score,
  // but should still report its total question count in the breakdown.
  session.complete = true;
  if (session.userId) activeSessionsByUser.delete(session.userId);
  session.terminated = true;
  session.terminationReason = reason || "Proctoring violation detected";

  const finalScore = PHASE_ORDER.reduce((sum, p) => sum + session.phases[p].score, 0);
  const percent = Math.round((finalScore / TOTAL_POINTS) * 100);

  res.json({
    done: true,
    terminated: true,
    reason: session.terminationReason,
    phaseResult: {
      phase: targetPhase,
      correctCount,
      total: session.phases[targetPhase].questions.length,
      score: session.phases[targetPhase].score,
      graded,
    },
    finalScore,
    percent,
    isExpert: false,
    breakdown: buildBreakdown(session),
  });
});

export default router;
