import asyncio
from typing import Dict, Set
from app.shared.logger import get_logger

logger = get_logger(__name__)


class NoteBroadcaster:
    """
    In-memory publisher/subscriber manager for real-time Server-Sent Events (SSE).
    Allows clients editing notes concurrently across multiple devices or users
    to receive instant notifications whenever a note is updated.
    """

    def __init__(self):
        """
        """
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()


    async def subscribe(self, note_id: str) -> asyncio.Queue:
        """
        """
        queue: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            if note_id not in self._subscribers:
                self._subscribers[note_id] = set()
            self._subscribers[note_id].add(queue)
        logger.debug(f"Client subscribed to note {note_id} events. Total subscribers: {len(self._subscribers[note_id])}")
        return queue


    async def unsubscribe(self, note_id: str, queue: asyncio.Queue) -> None:
        """
        """
        async with self._lock:
            if note_id in self._subscribers:
                self._subscribers[note_id].discard(queue)
                if not self._subscribers[note_id]:
                    del self._subscribers[note_id]
        logger.debug(f"Client unsubscribed from note {note_id} events.")


    async def publish(self, note_id: str, data: dict) -> None:
        """
        """
        async with self._lock:
            queues = list(self._subscribers.get(note_id, set()))

        for queue in queues:
            try:
                queue.put_nowait(data)
            except Exception as e:
                logger.error(f"Error publishing SSE event to queue: {e}")


class UserBroadcaster:
    """
    In-memory publisher/subscriber manager for global user-level Server-Sent Events (SSE).
    Notifies when:
    - A new note is created on another device
    - A note is trashed/restored/deleted
    - A note is shared with the user
    - A workspace is modified
    """

    def __init__(self):
        """
        """
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, user_id: str) -> asyncio.Queue:
        """
        """
        queue: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            if user_id not in self._subscribers:
                self._subscribers[user_id] = set()
            self._subscribers[user_id].add(queue)
        logger.debug(f"Client subscribed to user {user_id} global events.")
        return queue

    async def unsubscribe(self, user_id: str, queue: asyncio.Queue) -> None:
        """
        """
        async with self._lock:
            if user_id in self._subscribers:
                self._subscribers[user_id].discard(queue)
                if not self._subscribers[user_id]:
                    del self._subscribers[user_id]
        logger.debug(f"Client unsubscribed from user {user_id} global events.")

    async def publish(self, user_id: str, data: dict) -> None:
        """
        """
        async with self._lock:
            queues = list(self._subscribers.get(user_id, set()))

        for queue in queues:
            try:
                queue.put_nowait(data)
            except Exception as e:
                logger.error(f"Error publishing user SSE event to queue: {e}")


note_broadcaster = NoteBroadcaster()
user_broadcaster = UserBroadcaster()

