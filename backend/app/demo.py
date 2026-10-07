from uuid import UUID

DEMO_CAMPANHA_ID = UUID("a0000000-0000-0000-0000-000000000001")
DEMO_EMAIL = "analista@campanha.ao"
DEMO_SENHA = "senha-segura-2027"
DEMO_USER = {
    "id": UUID("d0000000-0000-0000-0000-0000000000a1"),
    "campanha_id": DEMO_CAMPANHA_ID,
    "ativista_id": None,
    "nome": "Analista de demonstração",
    "email": DEMO_EMAIL,
    "perfil": "ANALISTA",
    "ativo": True,
}


def credenciais_de_demonstracao(campanha_id, email: str, senha: str) -> bool:
    return (
        campanha_id == DEMO_CAMPANHA_ID
        and email.strip().lower() == DEMO_EMAIL
        and senha == DEMO_SENHA
    )
