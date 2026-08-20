const ENV_BASE = import.meta.env.VITE_BACKEND_SERVER || "";

export const API_BASE = ENV_BASE.replace(/\/+$/, "");
