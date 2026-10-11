import json
from typing import Any, Awaitable, Callable


class RequestBodyLimitMiddleware:
    def __init__(self, app: Callable[..., Awaitable[None]], max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def _reject(self, send: Callable[..., Awaitable[None]]) -> None:
        body = json.dumps({"detail": "error.request_too_large"}).encode("utf-8")
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})

    async def __call__(self, scope: dict[str, Any], receive: Callable[..., Awaitable[dict]], send: Callable[..., Awaitable[None]]) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                if int(content_length) > self.max_bytes:
                    await self._reject(send)
                    return
            except ValueError:
                pass

        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > self.max_bytes:
                await self._reject(send)
                return
            if not message.get("more_body", False):
                break

        buffered_message = {
            "type": "http.request",
            "body": bytes(body),
            "more_body": False,
        }
        delivered = False

        async def replay_receive() -> dict:
            nonlocal delivered
            if not delivered:
                delivered = True
                return buffered_message
            return await receive()

        await self.app(scope, replay_receive, send)
