"""Provisiona um utilizador de campanha sem expor a senha em argumentos do processo."""

import argparse
from getpass import getpass
from uuid import UUID

import bcrypt
import psycopg

from app.settings import get_settings


def main() -> int:
    parser = argparse.ArgumentParser(description="Cria ou atualiza uma conta da API.")
    parser.add_argument("--campanha-id", required=True, type=UUID)
    parser.add_argument("--email", required=True)
    parser.add_argument("--nome", required=True)
    parser.add_argument(
        "--perfil",
        required=True,
        choices=("ADMIN", "ANALISTA", "COORDENADOR", "BRIGADISTA", "LEITOR"),
    )
    parser.add_argument("--ativista-id", type=UUID)
    args = parser.parse_args()

    if args.perfil in {"COORDENADOR", "BRIGADISTA"} and args.ativista_id is None:
        parser.error(f"{args.perfil} exige --ativista-id associado à campanha.")

    password = getpass("Senha (mínimo 12 caracteres): ")
    confirmation = getpass("Confirme a senha: ")
    if len(password) < 12 or len(password.encode("utf-8")) > 72 or password != confirmation:
        parser.error("As senhas devem coincidir, conter 12 a 72 bytes e não podem estar vazias.")

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")
    settings = get_settings()
    with psycopg.connect(settings.database_url) as connection:
        if args.ativista_id:
            assigned = connection.execute(
                """
                SELECT 1 FROM ativistas
                WHERE id = %s AND campanha_id = %s AND ativo = TRUE
                """,
                (args.ativista_id, args.campanha_id),
            ).fetchone()
            if not assigned:
                parser.error("O mobilizador informado não está ativo nesta campanha.")

        connection.execute(
            """
            INSERT INTO usuarios (campanha_id, ativista_id, nome, email, senha_hash, perfil)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (campanha_id, (lower(email)))
            DO UPDATE SET nome = EXCLUDED.nome,
                          ativista_id = EXCLUDED.ativista_id,
                          senha_hash = EXCLUDED.senha_hash,
                          perfil = EXCLUDED.perfil,
                          ativo = TRUE
            """,
            (
                args.campanha_id, args.ativista_id, args.nome.strip(),
                args.email.strip().lower(), password_hash, args.perfil,
            ),
        )
    print(f"Utilizador {args.email.strip().lower()} provisionado na campanha {args.campanha_id}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
