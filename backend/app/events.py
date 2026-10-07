"""Pub/sub em processo para o apuramento paralelo (SSE)."""

from __future__ import annotations

import queue
import threading
from typing import Any

_lock = threading.Lock()
_subscribers: list[queue.Queue] = []
_MAX_FILA = 64


def subscrever() -> queue.Queue:
    canal: queue.Queue = queue.Queue(maxsize=_MAX_FILA)
    with _lock:
        _subscribers.append(canal)
    return canal


def cancelar(canal: queue.Queue) -> None:
    with _lock:
        if canal in _subscribers:
            _subscribers.remove(canal)


def publicar_ata(evento: dict[str, Any]) -> None:
    with _lock:
        mortos: list[queue.Queue] = []
        for canal in _subscribers:
            try:
                canal.put_nowait(evento)
            except queue.Full:
                mortos.append(canal)
        for canal in mortos:
            _subscribers.remove(canal)
