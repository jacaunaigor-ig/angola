import { useCallback, useState } from "react";
import { api, getToken, setToken } from "../api.js";

export function useSessao() {
  const [ativa, setAtiva] = useState(Boolean(getToken()));

  const entrar = useCallback(async (credenciais) => {
    const data = await api("/api/auth/token", { method: "POST", body: credenciais });
    setToken(data.access_token);
    setAtiva(true);
  }, []);

  const sair = useCallback(() => {
    setToken("");
    setAtiva(false);
  }, []);

  return { ativa, entrar, sair };
}
