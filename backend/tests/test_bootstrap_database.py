from bootstrap_database import migration_files, without_transaction_wrappers


def test_migrations_use_the_expected_order():
    names = [path.name for path in migration_files()]
    assert names == [
        "01_schema_postgis.sql",
        "02_seed_angola_data.sql",
        "03_seed_municipios_angola.sql",
        "04_carga_territorial_oficial.sql",
        "05_evidencias.sql",
        "06_usuarios.sql",
        "07_auditoria.sql",
        "08_planos_comerciais.sql",
        "09_rls.sql",
        "10_ed25519.sql",
        "11_queixas.sql",
    ]


def test_transaction_wrapper_removal_preserves_plpgsql_blocks():
    sql = "BEGIN;\nDO $$\nBEGIN\n    SELECT 1;\nEND $$;\nCOMMIT;\n"
    assert without_transaction_wrappers(sql) == "DO $$\nBEGIN\n    SELECT 1;\nEND $$;\n"
