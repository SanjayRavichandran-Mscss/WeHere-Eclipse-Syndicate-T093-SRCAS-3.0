const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/assessment";

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const fetchSkills = () => request("/skills");

export const fetchLanguages = () => request("/languages");

export const fetchUserExpertise = (userId) => request(`/profile/${encodeURIComponent(userId)}`);

export const fetchHealth = () => request("/health");

export const startAssessment = (userId) =>
  request("/start", { method: "POST", body: JSON.stringify({ userId }) });

export const submitPhase = (sessionId, phase, answers) =>
  request(`/${sessionId}/submit`, {
    method: "POST",
    body: JSON.stringify({ phase, answers }),
  });

export const terminateAssessment = (sessionId, phase, answers, reason) =>
  request(`/${sessionId}/terminate`, {
    method: "POST",
    body: JSON.stringify({ phase, answers, reason }),
  });
