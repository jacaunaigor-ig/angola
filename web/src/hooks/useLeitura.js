import { useEffect, useState } from "react";
import { api } from "../api.js";

export function useLeitura() {
  const [estado, setEstado] = useState({
    carregando: true,
    atualizando: false,
    erro: "",
    leitura: null,
  });

  useEffect(() => {
    let cancelado = false;
    api("/api/leitura-diaria")
      .then((leitura) => {
        if (!cancelado) setEstado({ carregando: false, atualizando: false, erro: "", leitura });
      })
      .catch((exc) => {
        if (!cancelado) {
          setEstado({
            carregando: false,
            atualizando: false,
            erro: exc.message || "Sem leitura.",
            leitura: null,
          });
        }
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function atualizar() {
    setEstado((atual) => ({ ...atual, atualizando: true, erro: "" }));
    try {
      const leitura = await api("/api/leitura-diaria?forcar=true");
      setEstado({ carregando: false, atualizando: false, erro: "", leitura });
    } catch (exc) {
      setEstado((atual) => ({
        ...atual,
        carregando: false,
        atualizando: false,
        erro: exc.message || "Não foi possível atualizar a leitura.",
      }));
    }
  }

  return { ...estado, atualizar };
}
