const TOKEN_KEY = "warroom_token";

export function apiOrigin() {
  const fromEnv = import.meta.env.VITE_API_ORIGIN;
  if (fromEnv) return String(fromEnv).replace(/\/$/, "");
  return "";
}

function origensCandidatas() {
  const principal = apiOrigin();
  const lista = [principal];
  if (import.meta.env.DEV && principal !== "http://127.0.0.1:8000") {
    lista.push("http://127.0.0.1:8000");
  }
  return lista;
}

function pareceHtml(response, text) {
  const tipo = (response.headers.get("content-type") || "").toLowerCase();
  return tipo.includes("text/html") || /^\s*</.test(text || "");
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export async function api(path, { method = "GET", body, plano = "NACIONAL", auth = false } = {}) {
  const headers = {
    Accept: "application/json",
    "X-Plano-Campanha": plano,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const init = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let ultimoErro = null;
  for (const origem of origensCandidatas()) {
    try {
      const response = await fetch(`${origem}${path}`, init);
      const text = await response.text();
      if (pareceHtml(response, text)) {
        ultimoErro = new Error("A API não respondeu em /api. A tentar o uvicorn em :8000.");
        ultimoErro.status = response.status;
        continue;
      }
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { erro: text };
      }
      if (!response.ok) {
        const detail = data?.detail;
        const message =
          (typeof detail === "string" && detail) ||
          detail?.erro ||
          data?.erro ||
          `HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.payload = data;
        throw error;
      }
      return data;
    } catch (exc) {
      if (exc.status && exc.status !== 404) throw exc;
      ultimoErro = exc;
    }
  }
  throw ultimoErro || new Error("Não foi possível autenticar. Confirme o uvicorn em :8000.");
}
