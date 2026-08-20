import { apiPostJSON } from "../basefetch/postjson"

export async function LoginAccount(email, password, signal) {
  const data = await apiPostJSON(
    "/auth/login",
    { email, password },
    { signal }
  );
  return data || [];
}