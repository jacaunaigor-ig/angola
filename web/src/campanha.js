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

export const CANAIS = ["TikTok", "Facebook", "WhatsApp", "Rádio", "Porta-a-porta"];

export const LEITURAS = [
  ["facto", "Facto público"],
  ["a_favor", "A favor do cliente"],
  ["critica", "Crítica ao cliente"],
];

export const TEMAS = [
  ["AGUA", "Água"],
  ["LUZ", "Luz"],
  ["EMPREGO", "Emprego jovem"],
  ["FUNDO", "Fundo para jovens"],
  ["PACTO", "Pacto e alternância"],
  ["SEGURANCA", "Segurança e reunião"],
  ["OUTRO", "Outro"],
];

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
