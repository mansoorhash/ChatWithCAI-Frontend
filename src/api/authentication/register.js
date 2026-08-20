import { apiPostJSON } from "../basefetch/postjson";

export async function EmailCheck(email, code, signal) {
  const data = await apiPostJSON(
    `/auth/register/email-check/${code}`,
    { email },
    { signal }
  );
  return data || [];
}

export async function RegisterAccount(email, accepted, password, code, signal) {
  const data = await apiPostJSON(
    `/auth/register/${code}`,
    { email, accepted, password },
    { signal }
  );
  return data || [];
}

export async function ConfirmRegister(email, code, signal) {
  return await apiPostJSON(
    "/auth/register/confirm",
    { email, code },
    { signal }
  )
}

export async function ResendCode(email, signal) {
  return await apiPostJSON(
    "/auth/register/resend-code",
    { email },
    { signal }
  )
}