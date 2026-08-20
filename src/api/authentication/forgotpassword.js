import { apiPostJSON } from "../basefetch/postjson";

export async function EmailForgotPassword(username, signal) {
    const data = await apiPostJSON(
        `/auth/forgot-password/email`,
        { username },
        { signal }
    );
    return data || [];
}

export async function ConfirmNewPassword(username, code, password, signal) {
    const data = await apiPostJSON(
        `/auth/forgot-password/confirm`,
        { username, code, password },
        { signal }
    );
    return data || [];
}

