import asyncio
import json
from typing import Dict, Set

from app.core.config import settings
RESYNC_EVENT = {"type": "resync_required"}


class SSELimitExceeded(Exception):
    """Raised before starting a stream when its process/user connection cap is full."""


class _ConnectionRegistry:
    """Shared active-connection accounting for note and user event streams."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._identities: Dict[asyncio.Queue, str] = {}

    async def acquire(self, queue: asyncio.Queue, identity: str) -> None:
        async with self._lock:
            if len(self._identities) >= settings.SSE_MAX_CONNECTIONS_PER_PROCESS:
                raise SSELimitExceeded("process SSE connection limit reached")
            if sum(1 for current in self._identities.values() if current == identity) >= settings.SSE_MAX_CONNECTIONS_PER_USER:
                raise SSELimitExceeded("SSE connection limit reached for identity")
            self._identities[queue] = identity

    async def release(self, queue: asyncio.Queue) -> None:
        async with self._lock:
            self._identities.pop(queue, None)


_connection_registry = _ConnectionRegistry()


class _Broadcaster:
    def __init__(self) -> None:
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def _subscribe(self, channel_id: str, identity: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=settings.SSE_QUEUE_MAX_SIZE)
        async with self._lock:
            await _connection_registry.acquire(queue, identity)
            self._subscribers.setdefault(channel_id, set()).add(queue)
        return queue

    async def _unsubscribe(self, channel_id: str, queue: asyncio.Queue) -> None:
        async with self._lock:
            subscribers = self._subscribers.get(channel_id)
            if subscribers is not None:
                subscribers.discard(queue)
                if not subscribers:
                    self._subscribers.pop(channel_id, None)
            await _connection_registry.release(queue)

    async def _publish(self, channel_id: str, data: dict) -> None:
        async with self._lock:
            queues = list(self._subscribers.get(channel_id, set()))

        try:
            event_size = len(json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        except (TypeError, ValueError):
            event_size = settings.SSE_MAX_EVENT_BYTES + 1
        too_large = event_size > settings.SSE_MAX_EVENT_BYTES

        for queue in queues:
            if getattr(queue, "_nottex_overflowed", False):
                continue
            if too_large or queue.full():
                while not queue.empty():
                    try:
                        queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break
                queue.put_nowait(RESYNC_EVENT)
                queue._nottex_overflowed = True
                continue
            queue.put_nowait(data)


class NoteBroadcaster(_Broadcaster):
    """In-process SSE publisher for note update events."""

    async def subscribe(self, note_id: str, subscriber_id: str) -> asyncio.Queue:
        return await self._subscribe(note_id, subscriber_id)

    async def unsubscribe(self, note_id: str, queue: asyncio.Queue) -> None:
        await self._unsubscribe(note_id, queue)

    async def publish(self, note_id: str, data: dict) -> None:
        await self._publish(note_id, data)


class UserBroadcaster(_Broadcaster):
    """In-process SSE publisher for per-user global update events."""

    async def subscribe(self, user_id: str) -> asyncio.Queue:
        return await self._subscribe(user_id, user_id)

    async def unsubscribe(self, user_id: str, queue: asyncio.Queue) -> None:
        await self._unsubscribe(user_id, queue)

    async def publish(self, user_id: str, data: dict) -> None:
        await self._publish(user_id, data)


note_broadcaster = NoteBroadcaster()
user_broadcaster = UserBroadcaster()
