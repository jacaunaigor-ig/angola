# Como contribuir

## Antes de abrir um pull request

```bash
python -m ruff check backend/app backend/tests war_room
python -m pytest backend/tests
cd web && npm run build
```

O CI repete estes passos, valida o bundle móvel e constrói as imagens Docker.

## Regras do projecto

- **Proveniência.** Todo dado novo declara `OFICIAL`, `ESTIMADO`, `SIMULADO` ou `PROVISORIO` e a fonte em `data/raw/README.md`. Não se inventam números oficiais.
- **Privacidade.** Nada que devolva dados pessoais de terceiros (caderno, BI, telefone completo). Telefones guardam-se mascarados ou em HMAC.
- **Texto gerado.** Discursos e propostas são rascunho; promessas levam `[PROMESSA — REVISAR]`.
- **Língua.** Interface, mensagens de erro e documentação em português. Código e identificadores novos podem seguir o estilo do módulo.
- **Contrato.** Rota nova entra em `backend/tests/test_contract_unit.py` (presença no OpenAPI e pelo menos um teste de comportamento).
- **Assinatura de atas.** A cadeia canónica em `war_room/assinatura_eleitoral.py` e em `mobile/src/services/cryptoSignService.js` tem de ficar idêntica; mude as duas no mesmo commit.

## Commits

Mensagens curtas no formato `tipo(área): resumo` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).

## Ambiente

- Execute `uvicorn` a partir de `backend/` com `PYTHONPATH` apontando para a raiz. O protótipo Streamlit está em `prototipo/`.
- Não faça commit de `.env`, `data/storage/` nem de ambientes virtuais.
