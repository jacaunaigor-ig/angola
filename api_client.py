"""
Cliente HTTP para consumo da API RESTful do GPS Eleitoral Angola 2027
Fornece tratamento de estados (Online, Offline, Carregamento, Vazio e Modo Demonstração).
Em conformidade estrita com o Princípio de Honestidade dos Dados.
"""

import os
import json
import requests
from typing import Dict, Any, Optional, Tuple

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001/api")
TIMEOUT_SECONDS = 3.5

class ApiClient:
    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url.rstrip("/")

    def verificar_saude(self) -> Tuple[bool, Dict[str, Any]]:
        """
        Consulta o status real do backend e da extensão PostGIS.
        Nunca retorna um status falso de 'conectado' se a API falhar.
        """
        try:
            resp = requests.get(f"{self.base_url}/health", timeout=TIMEOUT_SECONDS)
            if resp.status_code == 200:
                data = resp.json()
                return True, {
                    "status": "ONLINE",
                    "ambiente": data.get("ambiente", "production"),
                    "postgis": data.get("postgis", "Detectado"),
                    "horario_servidor": data.get("horario_servidor")
                }
            return False, {"status": "DEGRADADO", "codigo_http": resp.status_code}
        except Exception as e:
            return False, {"status": "OFFLINE", "erro": str(e)}

    def obter_relatorio_qualidade(self) -> Dict[str, Any]:
        """Obtém o relatório de qualidade de carga do pipeline ETL."""
        try:
            resp = requests.get(f"{self.base_url}/territorio/relatorio-qualidade", timeout=TIMEOUT_SECONDS)
            if resp.status_code == 200:
                return resp.json().get("relatorio", {})
        except Exception:
            pass
        
        # Fallback local auditado
        report_path = os.path.join(os.path.dirname(__file__), "data", "relatorio_qualidade_carga.json")
        if os.path.exists(report_path):
            with open(report_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"status": "SEM_DADOS", "mensagem": "Nenhum relatório de qualidade disponível."}

    def obter_versoes_malha(self) -> list:
        """Lista as versões político-administrativas (DPA 2016 e DPA 2024)."""
        try:
            resp = requests.get(f"{self.base_url}/territorio/versoes", timeout=TIMEOUT_SECONDS)
            if resp.status_code == 200:
                return resp.json().get("versoes", [])
        except Exception:
            pass
        return [
            {"codigo": "DPA_2016_18P", "nome": "DPA Lei 18/16 (18 Províncias)", "ano_vigencia": 2016},
            {"codigo": "DPA_2024_21P", "nome": "Nova DPA 2024 (21 Províncias)", "ano_vigencia": 2024}
        ]

    def obter_unidades_territoriais(self, versao: str = "DPA_2016_18P", formato: str = "json") -> Tuple[bool, Any, str]:
        """
        Retorna as unidades territoriais com métricas eleitorais e zonamento.
        Retorna: (sucesso_api, dados, proveniencia)
        """
        try:
            url = f"{self.base_url}/territorio/unidades?versao={versao}&formato={formato}"
            resp = requests.get(url, timeout=TIMEOUT_SECONDS)
            if resp.status_code == 200:
                return True, resp.json(), "OFICIAL (API)"
        except Exception:
            pass

        # Fallback local em data/raw/ com etiquetação de proveniência
        raw_file = "malha_angola_dpa2024.geojson" if "2024" in versao else "malha_angola_dpa2016.geojson"
        local_path = os.path.join(os.path.dirname(__file__), "data", "raw", raw_file)
        
        if os.path.exists(local_path):
            with open(local_path, "r", encoding="utf-8") as f:
                geo = json.load(f)
                return False, geo, "OFICIAL / ARQUIVO LOCAL (MODO DEMONSTRAÇÃO)"

        return False, None, "SEM_DADOS"

    def obter_resumo_nacional(self, campanha_id: Optional[str] = None) -> Tuple[bool, Dict[str, Any], str]:
        """Obtém os totais de terreno do War Room."""
        try:
            params = f"?campanha_id={campanha_id}" if campanha_id else ""
            resp = requests.get(f"{self.base_url}/war-room/resumo-nacional{params}", timeout=TIMEOUT_SECONDS)
            if resp.status_code == 200:
                data = resp.json()
                return True, data, "OFICIAL (API)"
        except Exception:
            pass

        return False, {}, "SIMULADO (MODO DEMONSTRAÇÃO)"

    def obter_apuramento_paralelo(self, campanha_id: Optional[str] = None) -> Tuple[bool, Dict[str, Any], str]:
        """Obtém a consolidação do apuramento paralelo do Dia D."""
        try:
            params = f"?campanha_id={campanha_id}" if campanha_id else ""
            resp = requests.get(f"{self.base_url}/dia-d/apuramento-paralelo{params}", timeout=TIMEOUT_SECONDS)
            if resp.status_code == 200:
                data = resp.json()
                return True, data, "OFICIAL (API)"
        except Exception:
            pass

        return False, {}, "SIMULADO (MODO DEMONSTRAÇÃO)"

    def obter_discurso_territorializado(self, municipio: str, campanha_id: Optional[str] = None) -> Tuple[bool, Dict[str, Any], str]:
        """Obtém o discurso tático e promessas para um município."""
        try:
            params = f"?campanha_id={campanha_id}" if campanha_id else ""
            resp = requests.get(f"{self.base_url}/discurso-territorializado/{municipio}{params}", timeout=TIMEOUT_SECONDS)
            if resp.status_code == 200:
                data = resp.json()
                return True, data, "ESTIMADO / MODELADO (API)"
        except Exception:
            pass

        return False, {}, "SIMULADO (MODO DEMONSTRAÇÃO)"

    def simular_zonamento(self, votos_partido: int, votos_oposicao: int, total_validos: int, limiar_bastiao: float, limiar_oposicao: float) -> Dict[str, Any]:
        """Envia parâmetros para o motor de zonamento e retorna a classificação com fórmula."""
        try:
            resp = requests.post(
                f"{self.base_url}/zonamento/simular",
                json={
                    "votos_partido": votos_partido,
                    "votos_oposicao": votos_oposicao,
                    "total_validos": total_validos,
                    "limiar_bastiao_margem": limiar_bastiao,
                    "limiar_oposicao_margem": limiar_oposicao
                },
                timeout=TIMEOUT_SECONDS
            )
            if resp.status_code == 200:
                return resp.json().get("resultado", {})
        except Exception:
            pass

        # Cálculo local determinístico idêntico
        margem = round(((votos_partido - votos_oposicao) / max(total_validos, 1)) * 100, 2)
        if margem >= limiar_bastiao:
            zon = "BASTIAO"
        elif margem <= limiar_oposicao:
            zon = "OPOSICAO"
        else:
            zon = "CAMPO_BATALHA"
        return {
            "zonamento": zon,
            "margem_perc": margem,
            "formula_aplicada": f"Margem ({margem}%) calculada por ({votos_partido} - {votos_oposicao}) / {total_validos} * 100."
        }
