// Thin wrapper around fetch() used by every context.
// Always resolves to { ok, message, ...data } so callers never need try/catch.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function api(path, { method = "GET", body } = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json().catch(() => ({}));
    // List endpoints return a bare array; wrap it as { data: [...] }.
    const data = Array.isArray(json) ? { data: json } : json;
    return { ...data, ok: response.ok, message: data.message || (response.ok ? "Done." : "Request failed.") };
  } catch {
    return { ok: false, message: "Cannot reach the server. Is the backend running?" };
  }
}
