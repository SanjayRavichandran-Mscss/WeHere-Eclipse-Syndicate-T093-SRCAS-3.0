import "dotenv/config";
import express from "express";
import cors from "cors";
import assessmentRoutes from "./routes/assessment.js";
import { warmUpModel } from "./ollamaClient.js";
import { initDatabase } from "./db.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/assessment", assessmentRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Expertise Exam Portal API" });
});

app.listen(PORT, () => {
  console.log(`Expertise Exam Portal API running on http://localhost:${PORT}`);
  console.log(`Using Ollama at ${process.env.OLLAMA_HOST || "http://localhost:11434"} (model: ${process.env.OLLAMA_MODEL || "llama3.1"})`);
  initDatabase().catch((err) => {
    console.error(`[mysql] Startup connection failed: ${err.message}`);
    console.error("[mysql] Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME in backend/.env");
  });
  warmUpModel();
});
