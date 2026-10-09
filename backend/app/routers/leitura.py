from fastapi import APIRouter, HTTPException, Query

from ..leitura_semanal import montar_leitura

router = APIRouter(prefix="/api", tags=["leitura-semanal"])


@router.get("/leitura-semanal")
def leitura_semanal(forcar: bool = Query(False)):
    try:
        return montar_leitura(forcar=forcar)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
