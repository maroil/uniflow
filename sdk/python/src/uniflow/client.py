from __future__ import annotations

import json
import uuid
import base64
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.request import urlopen, Request
from urllib.error import URLError

from .types import TrackOptions, IdentifyOptions, PageOptions, GroupOptions


DEFAULT_HOST = "https://ingest.uniflow.io"
DEFAULT_FLUSH_AT = 20
DEFAULT_FLUSH_INTERVAL = 10.0  # seconds


class UnifowClient:
    """
    Uniflow CDP Python tracking client.

    Usage::

        client = UnifowClient(write_key="your_write_key")
        client.track(TrackOptions(event="Button Clicked", user_id="user_123"))
        client.flush()
    """

    def __init__(
        self,
        write_key: str,
        host: str = DEFAULT_HOST,
        flush_at: int = DEFAULT_FLUSH_AT,
        flush_interval: float = DEFAULT_FLUSH_INTERVAL,
        debug: bool = False,
    ) -> None:
        self.write_key = write_key
        self.host = host.rstrip("/")
        self.flush_at = flush_at
        self.flush_interval = flush_interval
        self.debug = debug

        self._queue: List[Dict[str, Any]] = []
        self._lock = threading.Lock()
        self._timer: Optional[threading.Timer] = None
        self._start_flush_timer()

    # ── Public API ──────────────────────────────────────────────────────────

    def track(self, options: TrackOptions) -> None:
        """Record a user action."""
        self._enqueue({
            "type": "track",
            "event": options.event,
            "userId": options.user_id,
            "anonymousId": options.anonymous_id,
            "properties": options.properties,
            "timestamp": options.timestamp or self._now(),
            "messageId": str(uuid.uuid4()),
        })

    def identify(self, options: IdentifyOptions) -> None:
        """Set traits for a known user."""
        self._enqueue({
            "type": "identify",
            "userId": options.user_id,
            "anonymousId": options.anonymous_id,
            "traits": options.traits,
            "timestamp": options.timestamp or self._now(),
            "messageId": str(uuid.uuid4()),
        })

    def page(self, options: Optional[PageOptions] = None) -> None:
        """Record a page view."""
        opts = options or PageOptions()
        self._enqueue({
            "type": "page",
            "name": opts.name,
            "userId": opts.user_id,
            "anonymousId": opts.anonymous_id,
            "properties": opts.properties,
            "timestamp": opts.timestamp or self._now(),
            "messageId": str(uuid.uuid4()),
        })

    def group(self, options: GroupOptions) -> None:
        """Associate a user with a group / account."""
        self._enqueue({
            "type": "group",
            "groupId": options.group_id,
            "userId": options.user_id,
            "anonymousId": options.anonymous_id,
            "traits": options.traits,
            "timestamp": options.timestamp or self._now(),
            "messageId": str(uuid.uuid4()),
        })

    def flush(self) -> None:
        """Flush queued events synchronously."""
        with self._lock:
            if not self._queue:
                return
            batch = self._queue[:]
            self._queue.clear()

        self._send(batch)

    def shutdown(self) -> None:
        """Flush and stop the background timer."""
        if self._timer:
            self._timer.cancel()
        self.flush()

    # ── Internal ────────────────────────────────────────────────────────────

    def _enqueue(self, event: Dict[str, Any]) -> None:
        # Remove None values
        cleaned = {k: v for k, v in event.items() if v is not None}
        with self._lock:
            self._queue.append(cleaned)
            should_flush = len(self._queue) >= self.flush_at

        if should_flush:
            self.flush()

    def _send(self, events: List[Dict[str, Any]]) -> None:
        payload = json.dumps({
            "batch": events,
            "sentAt": self._now(),
        }).encode("utf-8")

        auth = base64.b64encode(f"{self.write_key}:".encode()).decode()
        req = Request(
            f"{self.host}/v1/batch",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Basic {auth}",
                "User-Agent": "uniflow-python/0.1.0",
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=10) as resp:
                if self.debug:
                    print(f"[uniflow] sent {len(events)} events, status={resp.status}")
        except URLError as exc:
            if self.debug:
                print(f"[uniflow] send failed: {exc}")
            # Re-queue events on failure (best-effort)
            with self._lock:
                self._queue = events + self._queue

    def _start_flush_timer(self) -> None:
        self._timer = threading.Timer(self.flush_interval, self._on_timer)
        self._timer.daemon = True
        self._timer.start()

    def _on_timer(self) -> None:
        self.flush()
        self._start_flush_timer()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
