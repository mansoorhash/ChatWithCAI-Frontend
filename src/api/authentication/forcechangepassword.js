import { apiPostJSON } from "../basefetch/postjson"

export async function SubmitNewPassword(username, password, signal) {
  try {
    const data = await apiPostJSON(
      "/auth/new-password",
      { username, password },
      { signal }
    );
    return data || [];
  } catch (err) {
    if (err?.status === 401) return { unauthorized: true };
    throw err;
  }
}
