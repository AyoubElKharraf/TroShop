const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem("auth_token", token);
  else localStorage.removeItem("auth_token");
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const isForm = options.body instanceof FormData;
  if (!isForm && options.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (!res.ok) throw new Error(res.statusText);
  }
  if (!res.ok) {
    const o = data as { error?: string; message?: string } | null;
    let msg = (o && (o.error || o.message)) || res.statusText;
    if (res.status === 429) {
      msg = typeof msg === "string" ? msg : "Trop de requêtes. Patientez un instant.";
    }
    throw new Error(typeof msg === "string" ? msg : "Erreur réseau");
  }
  return data as T;
}
