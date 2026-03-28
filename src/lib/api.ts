const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** Erreur HTTP ou réseau renvoyée par `api()` — `status` 0 = pas de réponse serveur (réseau / CORS). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "Impossible de joindre le serveur. Vérifiez que l’API est démarrée (npm run dev:all).",
      0
    );
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (!res.ok) throw new ApiError(res.statusText || "Erreur", res.status);
  }
  if (!res.ok) {
    const o = data as { error?: string; message?: string } | null;
    let msg = (o && (o.error || o.message)) || res.statusText;
    if (res.status === 429) {
      msg = typeof msg === "string" ? msg : "Trop de requêtes. Patientez un instant.";
    }
    throw new ApiError(typeof msg === "string" ? msg : "Erreur", res.status);
  }
  return data as T;
}
