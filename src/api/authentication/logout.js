import { apiFetch } from "../basefetch";

export async function LogoutAccount(signal) {
  const data = await apiFetch(
      "/auth/logout",   
      { method: "POST" },
      { signal }
  );
  return data || [];
}