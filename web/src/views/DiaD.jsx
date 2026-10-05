import { useState } from "react";
import { api } from "../api.js";
import { Aviso, Cartao, Kpi, Vazio } from "../components/ui.jsx";
import { fmtInt } from "../territorio.js";

function mensagem(exc) {
  if (exc.status === 402) return "O Dia D não está incluído no plano municipal.";
  if (exc.status === 401) return "Entre na aba Discursos para iniciar sessão e ler o apuramento.";
  return exc.message;
}

export default function DiaD({ plano, sessao }) {
  const [apuramento, setApuramento] = useState(null);
  const [erro, setErro] = useState("");
  const [aCarregar, setACarregar] = useState(false);

  async function carregar() {
    setErro("");
    setACarregar(true);
    try {
      setApuramento(await api("/api/dia-d/apuramento-paralelo", { auth: true, plano }));
    } catch (exc) {
      setApuramento(null);
      if (exc.status === 401) sessao.sair();
      setErro(mensagem(exc));
    } finally {
      setACarregar(false);
    }
  }

  const totais = apuramento?.totais || apuramento?.resumo || null;

  return (
    <main className="page">
      <Cartao
        titulo="Apuramento paralelo"
        nota="Cada ata chega com geofence, SHA-256 da fotografia e assinatura Ed25519 do delegado. Esta vista lê o agregado da API."
        acao={
          <button className="primary" type="button" onClick={carregar} disabled={aCarregar}>
            {aCarregar ? "A actualizar…" : "Actualizar apuramento"}
          </button>
        }
      >
        <Aviso>{erro}</Aviso>
        {!sessao.ativa && !apuramento && <Vazio>Sem sessão activa. Inicie sessão na aba Discursos.</Vazio>}
        {sessao.ativa && !apuramento && !erro && <Vazio>Ainda não carregou o apuramento.</Vazio>}
        {totais && typeof totais === "object" && (
          <div className="kpis">
            {Object.entries(totais)
              .filter(([, valor]) => typeof valor === "number")
              .slice(0, 5)
              .map(([chave, valor]) => (
                <Kpi key={chave} rotulo={chave.replaceAll("_", " ")} valor={fmtInt(valor)} />
              ))}
          </div>
        )}
        {apuramento && (
          <details className="lacunas" open={!totais}>
            <summary>Resposta completa da API</summary>
            <pre>{JSON.stringify(apuramento, null, 2)}</pre>
          </details>
        )}
      </Cartao>
    </main>
  );
}
