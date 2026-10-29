from fastapi import APIRouter, HTTPException, Query

from ..leitura_semanal import montar_leitura

router = APIRouter(prefix="/api", tags=["leitura-diaria"])


@router.get("/leitura-diaria")
@router.get("/leitura-semanal", include_in_schema=False)
def leitura_diaria(forcar: bool = Query(False)):
    try:
        return montar_leitura(forcar=forcar)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
