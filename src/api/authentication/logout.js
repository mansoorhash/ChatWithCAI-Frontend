import { apiFetch } from "../basefetch";

export async function LogoutAccount(signal) {
  try {
    const data = await apiFetch(
        "/auth/logout",   
        { method: "POST" },
        { signal }
    );
    return data || [];
  } catch (err) {
    if (err?.status === 401) return { unauthorized: true };
    throw err;
  }
}