export const CHAVE_CAMPO = "warroom_campo";

export const PUBLICOS = [
  {
    id: "jovem_urbano",
    nome: "Jovem urbano",
    canal: "TikTok e WhatsApp",
    onde: "Luanda e as cidades onde o telemóvel já é o comício",
    faz: "Vídeo curto sobre emprego, água e luz. Sem nome, sem BI. A frase tem de caber em quinze segundos.",
  },
  {
    id: "bairro",
    nome: "Bairro",
    canal: "Porta-a-porta",
    onde: "Comunas e bairros, casa a casa",
    faz: "Carências da casa, idade e humor. A visita fica no telemóvel até haver rede.",
  },
  {
    id: "interior",
    nome: "Interior",
    canal: "Rádio, igreja e soba",
    onde: "Círculos onde mais de metade das pessoas continua offline",
    faz: "Mensagem curta para a rádio local e para o líder comunitário. A rede social não chega aqui.",
  },
];

export const PARTIDOS = [
  "MPLA",
  "UNITA",
  "PRA-JA Servir Angola",
  "Bloco Democrático",
  "PRS",
  "FNLA",
  "PHA",
  "CASA-CE",
  "Outro",
];

export const CANAIS = ["TikTok", "Facebook", "WhatsApp", "YouTube", "Imprensa", "Rádio", "TPA", "Porta-a-porta"];

export const PROVINCIAS = [
  "Nacional",
  "Bengo",
  "Benguela",
  "Bié",
  "Cabinda",
  "Cuando Cubango",
  "Cuanza Norte",
  "Cuanza Sul",
  "Cunene",
  "Huambo",
  "Huíla",
  "Luanda",
  "Lunda Norte",
  "Lunda Sul",
  "Malanje",
  "Moxico",
  "Namibe",
  "Uíge",
  "Zaire",
];

export const LEITURAS = [
  ["facto", "Facto público"],
  ["a_favor", "A favor do cliente"],
  ["critica", "Crítica ao cliente"],
];

export const TEMAS = [
  ["AGUA", "Água"],
  ["LUZ", "Luz"],
  ["EMPREGO", "Emprego jovem"],
  ["FUNDO", "Petróleo e fundo"],
  ["PACTO", "Pacto e congresso"],
  ["CASA", "Casa e bairro"],
  ["SEGURANCA", "Segurança"],
  ["OUTRO", "Outro"],
];

const PAUTA = {
  EMPREGO: {
    jovem_urbano: "Vídeo de quinze segundos sobre o emprego que as manchetes trouxeram. Sem promessa nova.",
    bairro: "Na visita, perguntar que trabalho falta. Não contar intenção de voto.",
    interior: "Uma frase para a rádio local. Onde não há sinal, o TikTok não substitui isto.",
  },
  AGUA: {
    jovem_urbano: "Mostrar a torneira ou o chafariz de que a manchete fala. Sem apontar uma casa.",
    bairro: "Registar a carência de água na visita. A manchete não prova a rua.",
    interior: "Levar o tema à rádio e ao soba. A rede social não chega a este círculo.",
  },
  LUZ: {
    jovem_urbano: "Vídeo curto sobre o corte de luz publicado. Sem prometer horário de reposição.",
    bairro: "Confirmar na visita se a luz falhou nesta rua. A manchete é da imprensa.",
    interior: "Rádio local, só se o corte for desta província. Não generalizar a capital.",
  },
  FUNDO: {
    jovem_urbano: "Se a manchete é o fundo ou o petróleo, o vídeo explica o que foi publicado. Não promete dinheiro.",
    bairro: "Ouvir se o bairro liga o fundo ao emprego. Não apresentar um valor.",
    interior: "Na rádio, repetir só o que a manchete disse. Sem número novo.",
  },
  PACTO: {
    jovem_urbano: "Se o tema é congresso ou pacto, o vídeo cita a manchete. Não inventa aliança.",
    bairro: "Não transformar o congresso em conversa de porta, salvo se a pessoa o trouxer.",
    interior: "Na rádio, uma frase sobre o que foi publicado. Sem novo acordo.",
  },
  CASA: {
    jovem_urbano: "Vídeo curto sobre demolição ou bairro, com a fonte à vista.",
    bairro: "A visita confirma se a carência é desta rua. A manchete não é a porta.",
    interior: "Rádio local, se o caso for desta província. Não levar Luanda ao interior.",
  },
  SEGURANCA: {
    jovem_urbano: "Não mostrar violência. Dizer só o que a fonte pública já disse.",
    bairro: "Não recolher nomes. A carência fica em categoria, não em pessoa.",
    interior: "Rádio, com a mesma frase curta. Sem boato de grupo de WhatsApp.",
  },
};

const TERMOS_IGNORADOS = new Set(["", "outro", "por anunciar"]);

export function semAcento(texto) {
  return (texto || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function termosDoLado(lado) {
  if (!lado) return [];
  const termos = [];
  for (const bruto of [lado.partido, lado.nome]) {
    const termo = semAcento(bruto).trim();
    if (termo.length < 3 || TERMOS_IGNORADOS.has(termo)) continue;
    termos.push(termo);
  }
  return termos;
}

export function mencaoNoTexto(texto, campo) {
  const plano = semAcento(texto);
  const cliente = termosDoLado(campo?.nosso).some((termo) => plano.includes(termo));
  const adversario = termosDoLado(campo?.adversario).some((termo) => plano.includes(termo));
  if (cliente && adversario) return "ambos";
  if (cliente) return "cliente";
  if (adversario) return "adversario";
  return "nenhum";
}

export function rotuloMencao(codigo) {
  if (codigo === "cliente") return "Nomeia o cliente";
  if (codigo === "adversario") return "Nomeia o adversário";
  if (codigo === "ambos") return "Nomeia os dois lados";
  return "";
}

function temPalavra(plano, palavra) {
  return new RegExp(`(?<!\\w)${palavra}(?!\\w)`).test(plano);
}

export function canalDaFonte(fonte, titulo) {
  const plano = semAcento(`${fonte || ""} ${titulo || ""}`);
  if (plano.includes("tiktok")) return "TikTok";
  if (plano.includes("facebook")) return "Facebook";
  if (plano.includes("whatsapp")) return "WhatsApp";
  if (plano.includes("youtube")) return "YouTube";
  if (temPalavra(plano, "radio") || temPalavra(plano, "rna")) return "Rádio";
  if (temPalavra(plano, "tpa") || plano.includes("televis")) return "TPA";
  return "Imprensa";
}

export function temaConhecido(id) {
  return TEMAS.some(([codigo]) => codigo === id) ? id : "OUTRO";
}

export function planoDaSemana(temas) {
  const lista = Array.isArray(temas) ? temas.filter((tema) => tema && tema.manchetes > 0) : [];
  if (!lista.length) {
    return {
      temaId: "",
      tema: "",
      manchetes: 0,
      nota: "Sem manchetes classificadas esta semana. Não há pauta. Não inventes assunto.",
      meios: PUBLICOS.map((publico) => ({
        id: publico.id,
        nome: publico.nome,
        canal: publico.canal,
        acao: "Esperar a próxima leitura. Onde não há sinal, a rádio e o líder comunitário continuam a ser o meio.",
      })),
    };
  }
  const topo = [...lista].sort((a, b) => b.manchetes - a.manchetes)[0];
  const frases = PAUTA[topo.id] || {};
  return {
    temaId: topo.id,
    tema: topo.nome || topo.id,
    manchetes: topo.manchetes,
    nota: `O tema com mais manchetes públicas é ${topo.nome || topo.id} (${topo.manchetes}). Isto conta palavras, não votos. A frase fica em rascunho até uma pessoa a aprovar.`,
    meios: PUBLICOS.map((publico) => ({
      id: publico.id,
      nome: publico.nome,
      canal: publico.canal,
      acao: frases[publico.id] || publico.faz,
    })),
  };
}

function ladoVazio() {
  return { partido: "", nome: "", estado: "POR_ANUNCIAR", nota: "" };
}

export const CAMPO_INICIAL = {
  nosso: ladoVazio(),
  adversario: ladoVazio(),
  registos: [],
};

function ladoDe(bruto) {
  if (!bruto || typeof bruto !== "object") return ladoVazio();
  const nome = typeof bruto.nome === "string" ? bruto.nome : "";
  const partido = typeof bruto.partido === "string" ? bruto.partido : "";
  return {
    partido,
    nome,
    estado: bruto.estado === "ANUNCIADO" && nome.trim() ? "ANUNCIADO" : "POR_ANUNCIAR",
    nota: typeof bruto.nota === "string" ? bruto.nota : "",
  };
}

export function lerCampo() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_CAMPO) || "null");
    if (!bruto || typeof bruto !== "object") return structuredClone(CAMPO_INICIAL);
    return {
      nosso: ladoDe(bruto.nosso),
      adversario: ladoDe(bruto.adversario),
      registos: Array.isArray(bruto.registos) ? bruto.registos : [],
    };
  } catch {
    return structuredClone(CAMPO_INICIAL);
  }
}

export function gravarCampo(campo) {
  localStorage.setItem(CHAVE_CAMPO, JSON.stringify(campo));
  window.dispatchEvent(new Event("warroom-campo"));
}

export function rotuloCandidato(lado) {
  if (!lado?.nome?.trim() || lado.estado === "POR_ANUNCIAR") return "por anunciar";
  return lado.nome.trim();
}

export function publicoPorId(id) {
  return PUBLICOS.find((p) => p.id === id) || PUBLICOS[0];
}

export function leituraPorId(id) {
  return LEITURAS.find(([codigo]) => codigo === id)?.[1] || "Facto público";
}

export function fraseLado(campo) {
  const partido = campo?.nosso?.partido;
  if (!partido) return "Nenhum partido foi escolhido. A sala continua neutra.";
  const nome = rotuloCandidato(campo.nosso);
  const outro = campo.adversario?.partido;
  const base = `Cliente: ${partido}. Candidato: ${nome}.`;
  if (!outro) return base;
  return `${base} Adversário em leitura: ${outro}, ${rotuloCandidato(campo.adversario)}.`;
}
