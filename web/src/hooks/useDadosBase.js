import { useEffect, useState } from "react";
import { api } from "../api.js";

async function comRetry(tarefa, tentativas = 5) {
  let ultimo;
  for (let i = 0; i < tentativas; i += 1) {
    try {
      return await tarefa();
    } catch (exc) {
      ultimo = exc;
      await new Promise((ok) => setTimeout(ok, 350 * (i + 1)));
    }
  }
  throw ultimo;
}

/** Dados que não dependem do plano comercial: série histórica, catálogo, Hondt e contorno. */
export function useDadosGlobais() {
  const [estado, setEstado] = useState({
    carregando: true,
    erro: "",
    serie: null,
    planos: [],
    hondtGeral: null,
    contorno: null,
  });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setEstado((atual) => ({ ...atual, carregando: true, erro: "" }));
    comRetry(() =>
      Promise.all([
        api("/api/eleicoes/serie-historica"),
        api("/api/planos"),
        api("/api/eleicoes/hondt-provincias").catch(() => null),
        api("/api/territorio/contorno-nacional").catch(() => null),
      ]),
    )
      .then(([serie, catalogo, hondt, limite]) => {
        if (cancelado) return;
        setEstado({
          carregando: false,
          erro: "",
          serie,
          planos: catalogo?.planos || [],
          hondtGeral: hondt,
          contorno: limite?.type === "FeatureCollection" ? limite : null,
        });
      })
      .catch((exc) => {
        if (cancelado) return;
        setEstado((atual) => ({ ...atual, carregando: false, erro: exc.message || "API indisponível." }));
      });
    return () => {
      cancelado = true;
    };
  }, [tentativa]);

  return { ...estado, recarregar: () => setTentativa((n) => n + 1) };
}

/** Malha territorial enriquecida pela API; muda com o plano e a versão da DPA. */
export function useTerritorio(plano, versao) {
  const [estado, setEstado] = useState({ carregando: true, erro: "", features: [] });

  useEffect(() => {
    let cancelado = false;
    setEstado((atual) => ({ ...atual, carregando: true, erro: "" }));
    comRetry(() => api(`/api/territorio/unidades?versao=${versao}&formato=geojson&plano=${plano}`, { plano }))
      .then((geo) => {
        if (!cancelado) setEstado({ carregando: false, erro: "", features: geo?.features || [] });
      })
      .catch((exc) => {
        if (cancelado) return;
        const erro =
          exc.status === 402
            ? "A malha de 2016 no plano municipal exige upgrade. Use DPA 2024 ou um plano provincial."
            : exc.message;
        setEstado({ carregando: false, erro, features: [] });
      });
    return () => {
      cancelado = true;
    };
  }, [plano, versao]);

  return estado;
}

/** Municípios geoBoundaries. Só carrega quando a sala pede esta escala. */
export function useMalhaMunicipios(activo) {
  const [estado, setEstado] = useState({ carregando: false, erro: "", features: [], nota: "" });

  useEffect(() => {
    if (!activo) return undefined;
    let cancelado = false;
    setEstado((atual) => ({ ...atual, carregando: true, erro: "" }));
    api("/api/territorio/municipios")
      .then((geo) => {
        if (cancelado) return;
        setEstado({
          carregando: false,
          erro: "",
          features: geo?.features || [],
          nota: geo?.nota || "",
        });
      })
      .catch((exc) => {
        if (!cancelado) setEstado({ carregando: false, erro: exc.message, features: [], nota: "" });
      });
    return () => {
      cancelado = true;
    };
  }, [activo]);

  return estado;
}

/** Comunas e bairros de um município. */
export function useMalhaLocal(municipio) {
  const [estado, setEstado] = useState({ carregando: false, erro: "", comunas: [], bairros: [], nota: "" });

  useEffect(() => {
    if (!municipio) return undefined;
    let cancelado = false;
    setEstado({ carregando: true, erro: "", comunas: [], bairros: [], nota: "" });
    api(`/api/territorio/local?municipio=${encodeURIComponent(municipio)}`)
      .then((geo) => {
        if (cancelado) return;
        setEstado({
          carregando: false,
          erro: "",
          comunas: geo?.comunas?.features || [],
          bairros: geo?.bairros?.features || [],
          nota: geo?.nota || "",
        });
      })
      .catch((exc) => {
        if (!cancelado) setEstado({ carregando: false, erro: exc.message, comunas: [], bairros: [], nota: "" });
      });
    return () => {
      cancelado = true;
    };
  }, [municipio]);

  return estado;
}
