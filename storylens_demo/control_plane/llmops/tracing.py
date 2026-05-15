"""Tracing — per-job stage timing and structured logging."""
from __future__ import annotations

import logging
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field

log = logging.getLogger("storylens.trace")


@dataclass
class StageTrace:
    stage: str
    trace_id: str
    job_id: str
    started_at: float = field(default_factory=time.monotonic)
    ended_at: float | None = None
    latency_ms: int = 0
    meta: dict = field(default_factory=dict)

    def finish(self, **meta) -> "StageTrace":
        self.ended_at = time.monotonic()
        self.latency_ms = int((self.ended_at - self.started_at) * 1000)
        self.meta.update(meta)
        log.info(
            "[trace] job=%s trace=%s stage=%s latency=%dms %s",
            self.job_id, self.trace_id, self.stage, self.latency_ms,
            " ".join(f"{k}={v}" for k, v in self.meta.items()),
        )
        return self


def new_trace_id() -> str:
    return str(uuid.uuid4())[:8]


@contextmanager
def trace_stage(job_id: str, stage: str, trace_id: str | None = None):
    t = StageTrace(stage=stage, trace_id=trace_id or new_trace_id(), job_id=job_id)
    try:
        yield t
    finally:
        if t.ended_at is None:
            t.finish()
