import json
import logging
import time
import uuid
from contextvars import ContextVar
from datetime import UTC, datetime

from fastapi import Request
from fastapi.responses import JSONResponse
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

request_id_context: ContextVar[str] = ContextVar("request_id", default="-")
logger = logging.getLogger("angola.api")
_configured = False


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "service": "angola-campaign-api",
            "request_id": request_id_context.get(),
            "message": record.getMessage(),
        }
        for field in ("http_method", "path", "status_code", "duration_ms"):
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_observability(endpoint: str | None) -> tuple:
    global _configured
    if not _configured:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        logger.handlers.clear()
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False

        readers = []
        if endpoint:
            from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter

            readers.append(
                PeriodicExportingMetricReader(
                    OTLPMetricExporter(endpoint=f"{endpoint.rstrip('/')}/v1/metrics"),
                    export_interval_millis=10_000,
                )
            )
        metrics.set_meter_provider(MeterProvider(metric_readers=readers))
        _configured = True

    meter = metrics.get_meter("angola.api")
    return (
        meter.create_histogram("http.server.duration", unit="ms", description="HTTP request duration"),
        meter.create_counter("http.server.errors", unit="1", description="HTTP 5xx responses"),
    )


async def request_logging_middleware(request: Request, call_next):
    supplied_id = request.headers.get("x-request-id", "")
    try:
        request_id = str(uuid.UUID(supplied_id))
    except (ValueError, AttributeError):
        request_id = str(uuid.uuid4())

    request.state.request_id = request_id
    token = request_id_context.set(request_id)
    started = time.perf_counter()
    status_code = 500
    try:
        settings = request.app.state.settings
        if settings.rate_limit_enabled:
            now = time.monotonic()
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                ip = forwarded.split(",")[0].strip()
            elif request.headers.get("cf-connecting-ip"):
                ip = request.headers.get("cf-connecting-ip").strip()
            elif request.client:
                ip = request.client.host
            else:
                ip = "unknown"
            windows = request.app.state.rate_limit_windows
            window_started, count = windows.get(ip, (now, 0))
            if now - window_started >= 60:
                window_started, count = now, 0
            count += 1
            windows[ip] = (window_started, count)
            if len(windows) > 4096:
                expired_before = now - 60
                for known_ip, (started_at, _) in list(windows.items()):
                    if started_at < expired_before:
                        windows.pop(known_ip, None)
            if count > settings.rate_limit_per_minute:
                status_code = 429
                response = JSONResponse(
                    status_code=429,
                    headers={"X-Request-ID": request_id, "Retry-After": "60"},
                    content={"sucesso": False, "erro": "Limite de requisições excedido.", "request_id": request_id},
                )
                return response
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception:
        logger.exception("Unhandled HTTP request exception")
        raise
    finally:
        duration_ms = (time.perf_counter() - started) * 1000
        histogram = getattr(request.app.state, "request_duration", None)
        error_counter = getattr(request.app.state, "request_errors", None)
        route = request.scope.get("route")
        route_path = getattr(route, "path", request.url.path)
        attributes = {"http.request.method": request.method, "http.route": route_path, "http.response.status_code": status_code}
        if histogram:
            histogram.record(duration_ms, attributes)
        if error_counter and status_code >= 500:
            error_counter.add(1, attributes)
        logger.info(
            "HTTP request completed",
            extra={
                "http_method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": round(duration_ms, 2),
            },
        )
        request_id_context.reset(token)
