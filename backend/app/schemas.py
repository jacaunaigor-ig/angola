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
