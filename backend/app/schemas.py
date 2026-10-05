from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    campaign_id: UUID = Field(alias="campanha_id")
    email: str = Field(min_length=3, max_length=150)
    password: str = Field(alias="senha", min_length=1, max_length=200)
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class VisitLocation(BaseModel):
    longitude: float = Field(ge=-180, le=180)
    latitude: float = Field(ge=-90, le=90)


class LocationPoint(BaseModel):
    longitude: float = Field(ge=-180, le=180)
    latitude: float = Field(ge=-90, le=90)


class VisitPayload(BaseModel):
    id: UUID
    ativista_id: UUID
    localizacao: VisitLocation
    precisao_gps_metros: float | None = Field(default=None, ge=0, le=10000)
    sentimento: Literal["POSITIVO", "NEUTRO", "NEGATIVO"]
    dores_prioritarias: list[Literal["AGUA", "ENERGIA", "EMPREGO", "SANEAMENTO", "SAUDE", "EDUCACAO", "ESTRADAS", "HABITACAO", "SEGURANCA"]] = Field(default_factory=list, max_length=9)
    faixa_etaria: Literal["18-24", "25-35", "36-50", "50+"] | None = None
    observacoes: str | None = Field(default=None, max_length=2000)
    categoria_observacao: str | None = Field(default=None, max_length=100)
    registado_em: datetime
    metadados_aparelho: dict | None = None
    zona_eleitoral_id: UUID | None = None
    evidencias: list[dict] = Field(default_factory=list, max_length=5)

    @field_validator("registado_em")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("registado_em deve incluir fuso horário ISO-8601.")
        return value


class VisitsSyncRequest(BaseModel):
    campanha_id: UUID
    visitas: list[VisitPayload] = Field(min_length=1, max_length=500)
    model_config = ConfigDict(extra="forbid")


class ZoningRequest(BaseModel):
    votos_partido: int = Field(ge=0)
    votos_oposicao: int = Field(ge=0)
    total_validos: int = Field(ge=0)
    limiar_bastiao: float = Field(default=15, ge=0, le=100)
    limiar_oposicao: float = Field(default=-15, ge=-100, le=0)


class AtaSubmissionRequest(BaseModel):
    id: UUID
    local_voto_id: UUID
    campanha_id: UUID | None = None
    delegado_id: UUID | None = None
    mesa_numero: int = Field(default=1, ge=1)
    votos_favoraveis: int = Field(default=0, ge=0)
    votos_oponentes: int = Field(default=0, ge=0)
    votos_nulos: int = Field(default=0, ge=0)
    votos_brancos: int = Field(default=0, ge=0)
    total_votantes: int = Field(default=0, ge=0)
    foto_ata_url: str = Field(default="")
    foto_hash_sha256: str = Field(pattern=r"^[0-9a-fA-F]{64}$")
    localizacao_envio: LocationPoint
    registado_em: datetime | None = None
    model_config = ConfigDict(extra="ignore")


class LegalCaseCreateRequest(BaseModel):
    campanha_id: UUID | None = None
    ata_id: UUID | None = None
    local_voto_id: UUID | None = None
    titulo: str = Field(min_length=3, max_length=200)
    descricao_fato: str = Field(min_length=5, max_length=5000)
    tipo_irregularidade: str = Field(min_length=2, max_length=80)
    prioridade: Literal["BAIXA", "MEDIA", "ALTA", "URGENTE"] = "ALTA"
    advogado_responsavel: str | None = Field(default=None, max_length=150)
    anexos_urls: list[str] = Field(default_factory=list)
    model_config = ConfigDict(extra="ignore")


class SpeechGenerateRequest(BaseModel):
    municipio: str = Field(min_length=1, max_length=150)
    campanha_id: UUID | None = None
    nome_partido: str = Field(default="Nosso Partido", max_length=100)
    nome_oposicao: str = Field(default="Oposição Consolidada", max_length=100)
    diretrizes_cliente: str = Field(default="", max_length=2000)
    model_config = ConfigDict(extra="ignore")


class SpeechStatusUpdateRequest(BaseModel):
    status: Literal["RASCUNHO", "EM_REVISAO", "APROVADO", "REJEITADO"]
    responsavel_revisao: str = Field(min_length=2, max_length=150)
    comentarios_revisao: str | None = Field(default=None, max_length=2000)
    model_config = ConfigDict(extra="ignore")


class HondtSimulationRequest(BaseModel):
    provincia: str | None = Field(default=None, max_length=100)
    votos_partido_a: int | None = Field(default=None, ge=0)
    votos_partido_b: int | None = Field(default=None, ge=0)
    votos_outros: int | None = Field(default=0, ge=0)
    nome_partido_a: str = Field(default="Nosso Partido", max_length=100)
    nome_partido_b: str = Field(default="Oposição", max_length=100)
    assentos: int = Field(default=5, ge=1, le=220)
    variacao_a_perc: float = Field(default=0.0, ge=-100.0, le=500.0)
    variacao_b_perc: float = Field(default=0.0, ge=-100.0, le=500.0)
    model_config = ConfigDict(extra="ignore")
