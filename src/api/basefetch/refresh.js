import { apiFetch } from "../basefetch";

export async function retreiveAccessToken(signal) {
  try {
    const data = await apiFetch(
      "/auth/refresh",
      { method: "POST", signal }
    );
    return data.json() || [];
  } catch (err) {
    if (err?.status === 401) return { unauthorized: true };
    throw err;
  }
}
