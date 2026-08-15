
## MySQL persistence (wehere)

Generated assessment questions are persisted to the local MySQL database `wehere` in the `exam_questions` table. The backend stores the selected skill, selected language, difficulty, four options, correct answer, explanation, and whether the source was Ollama or fallback.

1. In `backend`, copy `.env.example` to `.env`.
2. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME=wehere`.
3. Install dependencies with `npm install` (this installs `mysql2`).
4. Start the backend with `npm start`.
5. The backend creates `exam_questions` if it does not already exist and logs `[mysql] Connected to wehere...` when the connection succeeds.


## Automatic user expertise loading

The assessment no longer requires manual skill/language entry. `GET /api/assessment/profile/:userId` reads the latest row from `wehere.user_expertise`, using its `skills` and `preferred_language`. `POST /api/assessment/start` accepts only `{ "userId": <id> }`, reloads the profile server-side, generates the Easy phase automatically, and persists it to `wehere.exam_questions`. Medium and Hard are generated and persisted when their phases unlock.

For the current demo user shown in MySQL Workbench (`user_id = 1`), create `frontend/.env` from `frontend/.env.example` and set `VITE_USER_ID=1`. A real login flow can instead set `localStorage.user_id` to the logged-in user's numeric ID.
