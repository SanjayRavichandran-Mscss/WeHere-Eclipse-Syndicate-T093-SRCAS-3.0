import mysql from "mysql2/promise";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "wehere";
const DB_CONNECT_TIMEOUT = Number(process.env.DB_CONNECT_TIMEOUT || 5000);

let pool;

export function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
      connectTimeout: DB_CONNECT_TIMEOUT,
    });
  }
  return pool;
}


export async function getUserExpertise(userId) {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new Error("A valid user_id is required");
  }

  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT id, user_id, skills, preferred_language, updated_at
     FROM wehere.user_expertise
     WHERE user_id = ?
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [numericUserId]
  );

  if (!rows.length) {
    throw new Error(`No user_expertise record found for user_id ${numericUserId}`);
  }

  const row = rows[0];
  const skills = String(row.skills || "")
    .split(/[,\n]+/)
    .map((skill) => skill.trim())
    .filter(Boolean);
  const language = String(row.preferred_language || "").trim();

  if (!skills.length) throw new Error(`No skills found for user_id ${numericUserId}`);
  if (!language) throw new Error(`No preferred_language found for user_id ${numericUserId}`);

  return { userId: numericUserId, expertiseId: row.id, skills, language, updatedAt: row.updated_at };
}

export async function initDatabase() {
  const db = getDbPool();
  const connection = await db.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_id VARCHAR(100) NOT NULL,
        skill VARCHAR(255) NOT NULL,
        language VARCHAR(100) NOT NULL,
        difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_index TINYINT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        question_source ENUM('ollama', 'fallback') DEFAULT 'ollama',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_exam_id (exam_id),
        INDEX idx_exam_phase (exam_id, difficulty)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query("SELECT 1");
    console.log(`[mysql] Connected to ${DB_NAME} at ${DB_HOST}:${DB_PORT}`);
  } finally {
    connection.release();
  }
}

/**
 * Store generated questions for one assessment phase.
 * The correct answer is stored in MySQL, but is never returned by sanitize().
 */
export async function saveGeneratedQuestions({ examId, skill, language, difficulty, questions, source = "ollama" }) {
  if (!examId || !skill || !language || !difficulty || !Array.isArray(questions)) {
    throw new Error("Invalid data supplied while saving generated questions");
  }

  const db = getDbPool();
  const connection = await db.getConnection();
  const normalizedSource = source === "fallback" ? "fallback" : "ollama";

  try {
    await connection.beginTransaction();

    const insertSql = `
      INSERT INTO exam_questions
      (exam_id, skill, language, difficulty, question,
       option_a, option_b, option_c, option_d,
       correct_index, correct_answer, explanation, question_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const q of questions) {
      if (!q || !Array.isArray(q.options) || q.options.length !== 4) continue;
      if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) continue;

      // Avoid duplicate rows if the same phase is accidentally saved twice.
      const [existing] = await connection.query(
        `SELECT id FROM exam_questions WHERE exam_id = ? AND difficulty = ? AND question = ? LIMIT 1`,
        [examId, difficulty, q.question]
      );

      if (existing.length) continue;

      await connection.query(insertSql, [
        examId,
        skill,
        language,
        difficulty,
        q.question,
        q.options[0],
        q.options[1],
        q.options[2],
        q.options[3],
        q.correctIndex,
        q.options[q.correctIndex],
        q.explanation || "",
        normalizedSource,
      ]);
    }

    await connection.commit();
    console.log(`[mysql] Saved ${questions.length} generated question(s) for ${examId}/${difficulty}/${language}`);
  } catch (error) {
    await connection.rollback();
    console.error(`[mysql] Failed to save ${examId}/${difficulty}: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}
