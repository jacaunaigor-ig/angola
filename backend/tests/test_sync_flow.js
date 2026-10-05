/**
 * Script de Verificação e Validação do Fluxo de Sincronização da API
 * Executa testes diretos contra a API HTTP
 */
const http = require('http');

const PORT = process.env.PORT || 3001;
const HOST = 'localhost';

function fazerRequisicao(options, dados = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (dados) {
      req.write(JSON.stringify(dados));
    }
    req.end();
  });
}

async function executarTestes() {
  console.log('🧪 Iniciando testes de validação dos endpoints da API...');

  try {
    // 1. Healthcheck
    console.log('\n1. Testando GET /api/health...');
    const health = await fazerRequisicao({
      host: HOST,
      port: PORT,
      path: '/api/health',
      method: 'GET',
    });
    console.log('Status:', health.status);
    console.log('Resposta:', health.data);

    // 2. Proximidade PostGIS
    console.log('\n2. Testando GET /api/locais-proximos...');
    const proximos = await fazerRequisicao({
      host: HOST,
      port: PORT,
      path: '/api/locais-proximos?longitude=13.2667&latitude=-8.9167&raio_metros=3000',
      method: 'GET',
    });
    console.log('Status:', proximos.status);
    console.log(`Assembleias encontradas: ${proximos.data.locais ? proximos.data.locais.length : 0}`);

    // 3. Sincronização Tardia
    console.log('\n3. Testando POST /api/sincronizar-visitas (Idempotência)...');
    const loteVisitas = {
      campanha_id: 'a0000000-0000-0000-0000-000000000001',
      visitas: [
        {
          uuid: 'f1111111-1111-4111-8111-111111111101',
          id: 'f1111111-1111-4111-8111-111111111101',
          ativista_id: 'b0000000-0000-0000-0000-000000000001',
          localizacao: { longitude: 13.267, latitude: -8.916 },
          precisao_gps_metros: 4.0,
          sentimento: 'POSITIVO',
          dores_prioritarias: ['EMPREGO'],
          faixa_etaria: '18-24',
          registado_em: new Date().toISOString(),
        },
      ],
    };

    const sync1 = await fazerRequisicao(
      {
        host: HOST,
        port: PORT,
        path: '/api/visitas',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      loteVisitas
    );
    console.log('Sincronização 1:', sync1.data.resumo || sync1.data);

    // Reenvio imediato do mesmo lote para testar ON CONFLICT / HTTP 200 idempotente
    const sync2 = await fazerRequisicao(
      {
        host: HOST,
        port: PORT,
        path: '/api/visitas',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      loteVisitas
    );
    console.log('Sincronização 2 (Idempotente):', sync2.data.resumo || sync2.data);

    console.log('\n✅ Todos os testes de integração do Módulo 2 foram concluídos.');
  } catch (err) {
    console.error('❌ Erro durante execução dos testes:', err.message);
  }
}

if (require.main === module) {
  executarTestes();
}

module.exports = executarTestes;
