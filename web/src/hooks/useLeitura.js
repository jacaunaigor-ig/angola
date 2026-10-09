import { useEffect, useState } from "react";
import { api } from "../api.js";

export function useLeitura() {
  const [estado, setEstado] = useState({ carregando: true, erro: "", leitura: null });

  useEffect(() => {
    let cancelado = false;
    api("/api/leitura-semanal")
      .then((leitura) => {
        if (!cancelado) setEstado({ carregando: false, erro: "", leitura });
      })
      .catch((exc) => {
        if (!cancelado) setEstado({ carregando: false, erro: exc.message || "Sem leitura.", leitura: null });
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return estado;
}
