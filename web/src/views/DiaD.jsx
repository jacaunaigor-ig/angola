import { useState } from "react";
import { api } from "../api.js";
import { IconeEscudo, IconeRefresh } from "../components/Icones.jsx";
import { Aviso, Cartao, Kpi, Selo, Vazio } from "../components/ui.jsx";
import { fmtInt, fmtPct } from "../territorio.js";

const PASSOS = [
  ["01", "Geofence no Terreno", "A ata só é aceite se o delegado estiver dentro do raio geográfico da mesa de voto."],
  ["02", "Integridade SHA-256", "O hash criptográfico da fotografia da ata compõe a cadeia canónica imutável."],
  ["03", "Assinatura Ed25519", "A chave privada do fiscal assina a ata no dispositivo; a API valida a autenticidade."],
];

const ATAS_SIMULADAS = [
  { mesa: "MESA-0402", municipio: "Luanda (Maianga)", votos_mpla: 142, votos_unita: 189, hash: "8f4a1c2e...b3d9", hora: "18:42", status: "VALIDADA" },
  { mesa: "MESA-1108", municipio: "Huambo (Bailundo)", votos_mpla: 198, votos_unita: 134, hash: "4c7e9b1a...f201", hora: "18:40", status: "VALIDADA" },
  { mesa: "MESA-2315", municipio: "Benguela (Lobito)", votos_mpla: 165, votos_unita: 152, hash: "9d02e4aa...771c", hora: "18:38", status: "VALIDADA" },
  { mesa: "MESA-0922", municipio: "Huíla (Lubango)", votos_mpla: 210, votos_unita: 110, hash: "11fb43ce...a90b", hora: "18:35", status: "VALIDADA" },
  { mesa: "MESA-0144", municipio: "Cabinda (Belize)", votos_mpla: 92, votos_unita: 245, hash: "3389aefe...cc21", hora: "18:31", status: "VALIDADA" },
];

function mensagem(exc) {
  if (exc.status === 402) return "O módulo Dia D exige plano Provincial ou Nacional.";
  if (exc.status === 401) return "Sessão expirada. Autentique-se com credenciais da campanha.";
  return exc.message;
}

export default function DiaD({ plano, sessao }) {
  const [apuramento, setApuramento] = useState(null);
  const [erro, setErro] = useState("");
  const [aCarregar, setACarregar] = useState(false);
  const [modoDemo, setModoDemo] = useState(true);

  async function carregarApuramento() {
    setErro("");
    setACarregar(true);
    try {
      const data = await api("/api/dia-d/apuramento-paralelo", { auth: true, plano });
      setApuramento(data);
    } catch (exc) {
      setApuramento(null);
      if (exc.status === 401) sessao.sair();
      setErro(mensagem(exc));
    } finally {
      setACarregar(false);
    }
  }

  const totais = apuramento?.totais || apuramento?.resumo || null;
  const numerosReais = totais && typeof totais === "object"
    ? Object.entries(totais).filter(([, valor]) => typeof valor === "number").slice(0, 4)
    : [];

  return (
    <main className="page">
      <section className="faixa-chefe">
        <div>
          <span className="eyebrow">Apuramento Paralelo Dia D</span>
          <h2>Central de Verificação Probatória</h2>
          <p className="muted">
            Transmissão de atas de votação assinadas com Ed25519 e verificação georreferenciada em tempo real.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="btn-group">
            <button
              type="button"
              className={modoDemo ? "activa" : ""}
              onClick={() => setModoDemo(true)}
            >
              Cenário Simulado
            </button>
            <button
              type="button"
              className={!modoDemo ? "activa" : ""}
              onClick={() => { setModoDemo(false); if (sessao.ativa) carregarApuramento(); }}
            >
              Apuramento API
            </button>
          </div>

          {!modoDemo && sessao.ativa && (
            <button className="primary" type="button" onClick={carregarApuramento} disabled={aCarregar} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <IconeRefresh size={14} />
              {aCarregar ? "A sincronizar…" : "Actualizar"}
            </button>
          )}
        </div>
      </section>

      <section className="passos-diad" aria-label="Cadeia probatória da ata eleitoral">
        {PASSOS.map(([ordem, titulo, texto]) => (
          <article key={ordem}>
            <span>{ordem}</span>
            <strong>{titulo}</strong>
            <p>{texto}</p>
          </article>
        ))}
      </section>

      {modoDemo ? (
        <>
          <section className="kpis quatro" aria-label="Indicadores da simulação de apuramento">
            <article className="kpi">
              <span>Mesas Processadas <Selo tipo="SIMULADO" /></span>
              <strong>14.820 <small style={{ fontSize: "14px", color: "var(--muted)" }}>/ 26.488 (55,9%)</small></strong>
            </article>
            <article className="kpi">
              <span>Votos Válidos <Selo tipo="SIMULADO" /></span>
              <strong>3.840.120</strong>
            </article>
            <article className="kpi kpi-bastiao">
              <span>MPLA Projecção <Selo tipo="SIMULADO" /></span>
              <strong style={{ color: "var(--mpla)" }}>51,62% <small style={{ fontSize: "13px", color: "var(--muted)" }}>1.982.400</small></strong>
            </article>
            <article className="kpi kpi-batalha">
              <span>UNITA Projecção <Selo tipo="SIMULADO" /></span>
              <strong style={{ color: "var(--unita)" }}>43,86% <small style={{ fontSize: "13px", color: "var(--muted)" }}>1.684.220</small></strong>
            </article>
          </section>

          <Cartao
            titulo="Transmissão de Atas em Tempo Real"
            nota="Fluxo demonstrativo com verificação criptográfica Ed25519 e coordenadas georreferenciadas."
            acao={
              <span className="live-feed-badge">
                <i className="pulse-dot" /> Recepção Activa
              </span>
            }
          >
          <div className="table-responsive">
            <table>
              <caption className="sr-only">Atas recebidas recentemente</caption>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Mesa de Voto</th>
                  <th>Município</th>
                  <th className="num">Votos MPLA</th>
                  <th className="num">Votos UNITA</th>
                  <th>Digest SHA-256</th>
                  <th>Assinatura Ed25519</th>
                </tr>
              </thead>
              <tbody>
                {ATAS_SIMULADAS.map((item) => (
                  <tr key={item.mesa}>
                    <td><code>{item.hora}</code></td>
                    <td><strong>{item.mesa}</strong></td>
                    <td>{item.municipio}</td>
                    <td className="num" style={{ color: "var(--mpla)", fontWeight: "600" }}>{item.votos_mpla}</td>
                    <td className="num" style={{ color: "var(--unita)", fontWeight: "600" }}>{item.votos_unita}</td>
                    <td><code>{item.hash}</code></td>
                    <td>
                      <span className="badge badge-baixa" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <IconeEscudo size={12} /> Ed25519 VÁLIDA
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Cartao>
        </>
      ) : (
        <Cartao
          titulo="Totais do Apuramento da Campanha"
          nota="Dados consolidados transmitidos pelos delegados credenciados da sua campanha."
          acao={<Selo tipo="OFICIAL" />}
        >
          <Aviso>{erro}</Aviso>
          {!sessao.ativa && (
            <Vazio>
              Sessão não iniciada. Utilize o formulário da aba Discursos para autenticar a sua campanha e consultar as atas recebidas.
            </Vazio>
          )}
          {sessao.ativa && !apuramento && !erro && (
            <Vazio>
              Clique em "Actualizar" para consultar as atas e o somatório apurado até ao momento.
            </Vazio>
          )}

          {numerosReais.length > 0 && (
            <div className="kpis">
              {numerosReais.map(([chave, valor]) => (
                <Kpi key={chave} rotulo={chave.replaceAll("_", " ")} valor={fmtInt(valor)} />
              ))}
            </div>
          )}

          {apuramento && (
            <details className="lacunas" open={numerosReais.length === 0}>
              <summary>Payload de Auditoria da API</summary>
              <pre>{JSON.stringify(apuramento, null, 2)}</pre>
            </details>
          )}
        </Cartao>
      )}
    </main>
  );
}
