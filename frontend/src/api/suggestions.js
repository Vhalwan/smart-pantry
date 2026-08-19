import client from "./client";

/** Hung cold starts / Gemini calls should fail visibly so the user can retry. */
const SUGGEST_TIMEOUT_MS = 90_000;

export async function getSuggestions() {
  const response = await client.get("/recipes/suggest", {
    timeout: SUGGEST_TIMEOUT_MS,
  });
  return response.data;
}
