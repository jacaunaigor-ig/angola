import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api.js";

const USER_KEY = "warroom_utilizador";

function lerUtilizador() {
  try {
    const bruto = sessionStorage.getItem(USER_KEY);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function useSessao() {
  const [ativa, setAtiva] = useState(Boolean(getToken()));
  const [utilizador, setUtilizador] = useState(lerUtilizador);

  const gravar = (user) => {
    setUtilizador(user);
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(USER_KEY);
  };

  const sair = useCallback(() => {
    setToken("");
    setAtiva(false);
    gravar(null);
  }, []);

  const entrar = useCallback(async (credenciais) => {
    const data = await api("/api/auth/token", { method: "POST", body: credenciais });
    setToken(data.access_token);
    let perfil = { campanha_id: data.campanha_id, email: credenciais.email };
    try {
      const eu = await api("/api/auth/me", { auth: true });
      perfil = { ...perfil, ...eu };
    } catch {
      /* token emitido; /me pode falhar se o proxy cortar */
    }
    gravar(perfil);
    setAtiva(true);
    return perfil;
  }, []);

  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelado = false;
    api("/api/auth/me", { auth: true })
      .then((eu) => {
        if (!cancelado) {
          gravar(eu);
          setAtiva(true);
        }
      })
      .catch(() => {
        if (!cancelado) sair();
      });
    return () => {
      cancelado = true;
    };
  }, [sair]);

  return { ativa, utilizador, entrar, sair };
}
