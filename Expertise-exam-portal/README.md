# Proficio — Expertise Exam Portal

React + Node.js exam portal. Pick one skill, or several, and a **locally-run AI model (via
Ollama)** writes you a fresh 15-question paper: 5 Easy → 5 Medium → 5 Hard, each tier unlocking
only after the previous one is submitted. Score 80%+ overall and you're declared an Expert.

Any free-text skill works — there's no fixed list. Enter more than one skill (up to 5) and each
tier's questions are split evenly across all of them, tagged so you can see which skill each
question is testing.

**No API keys anywhere.** Question generation calls a model running on your own machine
through [Ollama](https://ollama.com). If Ollama isn't running, the backend automatically
falls back to a small built-in question bank so the app still works — but for real AI-generated
questions, Ollama needs to be running.

## How it works

- **Frontend** (`/frontend`, React + Vite): multi-skill picker → phase-locked question screens →
  result page with score breakdown and an Expert seal.
- **Backend** (`/backend`, Node.js + Express): owns the exam session (correct answers never sent
  to the client until the phase is graded), asks Ollama to generate each tier's questions in
  strict JSON — once per skill, in parallel, for any skill(s) entered — grades submissions, and
  unlocks the next tier.
- **Scoring**: 15 questions × 5 points = 75. Each tier is graded and locked in before the next
  tier's questions are generated. ≥80/100 = Expert.

### Multi-skill papers

`Landing.jsx` accepts a list of skills (type one, press Enter/comma, repeat — up to 5). `POST
/api/assessment/start` takes `{ skills: string[] }` (the older `{ skill: string }` shape still
works for a single skill). For each tier, the question count is split as evenly as possible
across every skill (`splitCount` in `routes/assessment.js`) and generated with one Ollama call per
skill, in parallel — a 3-skill paper doesn't take 3x as long. Every question carries a `skill`
field; the UI shows a small tag on each question when more than one skill is in play.

### Proctoring

The moment "Enter Assessment" is clicked, the exam requests fullscreen, camera access, and a full
screen-share, then locks down the page (`frontend/src/hooks/useProctoring.js`). A small self-view
of the camera feed stays pinned to the corner for the rest of the session. While the exam is
active it blocks and flags:

- copy / cut / paste
- right-click / context menu
- devtools shortcuts (F12, Ctrl/Cmd+Shift+I/J/C), view-source (Ctrl/Cmd+U), print (Ctrl/Cmd+P)
- switching tabs or losing window focus
- exiting fullscreen
- stopping the camera or ending the screen share (e.g. the browser's own "Stop sharing" control)

If camera or screen-share permission is denied up front, the candidate is kept on the entry screen
with an explanation instead of starting an exam that can't be monitored.

The **first** violation calls `POST /api/assessment/:sessionId/terminate` immediately: whatever
was answered in the current tier gets graded as-is, every remaining tier is scored 0, and the
attempt is permanently marked disqualified — `isExpert` is always `false` on a terminated attempt
no matter the score. The result page shows a clear "Assessment terminated" banner instead of a
score verdict.

This is enforced client-side (JS event listeners plus MediaStream track state), which is fine for
a portfolio/demo project but not tamper-proof against a determined user with devtools disabled at
the OS/browser level. The camera/screen streams are also only ever previewed locally in the
browser — this demo doesn't record, upload, or transmit them anywhere. A production proctoring
system would pair this with real server-side signals: recorded/reviewed video via a proctoring
vendor, IP/device fingerprinting, and so on.

## 1. Install Ollama and pull a model

```bash
# macOS
brew install ollama

# or download from https://ollama.com/download

ollama pull llama3.1     # ~4.7GB, good quality/speed balance
ollama serve              # starts the local server on http://localhost:11434
```

Any instruction-following model works — `mistral`, `qwen2.5:7b`, `phi3` are all fine.
Set whichever you pulled in `backend/.env` (`OLLAMA_MODEL=`).

### If generation feels slow

Local models genuinely take longer than a hosted API, especially on a CPU-only machine. In order of impact:

1. **Use a smaller model.** `llama3.1` (8B) is noticeably slower than a 3B model. Try:
   ```bash
   ollama pull llama3.2:3b
   ```
   then set `OLLAMA_MODEL=llama3.2:3b` in `backend/.env`. Question quality is still good for straightforward MCQs.
2. **Keep the model warm.** The backend now sends `keep_alive: "30m"` with every request and pings Ollama once on startup (`warmUpModel()` in `server.js`), so the model stays loaded in memory across the Easy → Medium → Hard calls instead of reloading each time — reloading a model from disk is usually the single biggest delay.
3. **Check what's actually slow.** Hit `http://localhost:5000/api/assessment/health` — if `ok: false`, the backend can't reach Ollama at all and every request is burning ~45s on a timeout before falling back to the static question bank. Make sure `ollama serve` is running.
4. **GPU vs CPU.** If your machine has a supported GPU, Ollama will use it automatically and generation drops from tens of seconds to a couple seconds per tier. On CPU-only, a 3B model in the 15–30s/tier range is normal.

Generation requests are capped at the configured timeout (150s by default). The generator sends a maximum of 5 questions per Ollama call and only requests missing questions when a batch is short. The selected language is passed to every Ollama request.

## 2. Run the backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:5000`. Check `http://localhost:5000/api/assessment/health`
to confirm it can see Ollama and which models are available.

## 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` and talks to the backend at `http://localhost:5000`.

## Project structure

```
backend/
  src/
    server.js            Express app entrypoint
    ollamaClient.js       Prompts + calls the local Ollama model, validates JSON output
    sessionStore.js       In-memory exam session state (per attempt)
    data/fallbackBank.js  Safety-net static questions if Ollama is unreachable
    routes/assessment.js  /skills, /start, /:sessionId/submit
frontend/
  src/
    pages/Landing.jsx        Free-text, multi-skill entry (any topic — Ollama generates for it)
    pages/Assessment.jsx     Phase-locked question flow
    pages/Result.jsx         Score, breakdown, Expert seal
    components/              PhaseTracker, QuestionCard, ProctorCamera
    hooks/useProctoring.js   Lockdown listeners + camera/screen-share acquisition
```

## Notes / things you'll likely want to change for production

- Sessions are stored in memory (`Map`) — fine for a demo, swap for Redis/a DB for multiple server instances.
- No auth/user accounts — add a login layer if you want to track candidates over time.
- Generation takes a few seconds per tier depending on your machine and model size; the UI shows a loading state while it waits.
- The fallback bank only has a handful of questions per skill/difficulty — it exists purely so the UI is demoable without Ollama, not as a real question source.
