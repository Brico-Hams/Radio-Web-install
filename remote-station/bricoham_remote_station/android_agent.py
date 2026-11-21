"""Single-session, read-only FTX USB relay over an authenticated outbound WebSocket."""

import json
import logging
import secrets
import threading
import time
from dataclasses import asdict, dataclass, field, is_dataclass
from http import HTTPStatus

from bricoham_remote_station.cat_diagnostics import read_profiles
from bricoham_remote_station.websocket_transport import WebSocketPeer

LOGGER = logging.getLogger("bricoham.android_agent")
ANDROID_AGENT_PATH = "/api/v1/android-agent/connect"
ANDROID_AGENT_PROTOCOL = "bricoham.android-agent.readonly.v1"
_ERRORS = frozenset(
    {"cat_io_failed", "cat_timeout", "cat_invalid_response", "cat_request_rejected", "cat_busy"}
)


class AndroidAgentError(Exception):
    def __init__(self, code: str, status: HTTPStatus = HTTPStatus.SERVICE_UNAVAILABLE) -> None:
        super().__init__(code)
        self.status = status


@dataclass
class _Query:
    command: str
    identifier: str = field(default_factory=lambda: secrets.token_hex(16))
    done: threading.Event = field(default_factory=threading.Event)
    reply: str | None = None
    error: AndroidAgentError | None = None


def _object(message: str | bytes) -> dict[str, object]:
    if not isinstance(message, str):
        raise AndroidAgentError("android_agent_invalid_reply", HTTPStatus.BAD_GATEWAY)

    def unique(pairs: list[tuple[str, object]]) -> dict[str, object]:
        result: dict[str, object] = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("Duplicate field")
            result[key] = value
        return result

    try:
        value = json.loads(message, object_pairs_hook=unique)
    except (ValueError, RecursionError) as error:
        raise AndroidAgentError("android_agent_invalid_reply", HTTPStatus.BAD_GATEWAY) from error
    if not isinstance(value, dict):
        raise AndroidAgentError("android_agent_invalid_reply", HTTPStatus.BAD_GATEWAY)
    return value


class AndroidReadonlyAgent:
    def __init__(self) -> None:
        self.queries = {
            command: query
            for command, query in read_profiles()["FTX-1"].queries.items()
            if query.decoder is not None
        }
        self._condition = threading.Condition()
        self._request_lock = threading.Lock()
        self._peer: WebSocketPeer | None = None
        self._pending: _Query | None = None
        self._stopping = False

    def catalog(self) -> dict[str, object]:
        with self._condition:
            if self._peer is None or self._stopping:
                raise AndroidAgentError("android_agent_unavailable")
        return {
            "api_version": "v1",
            "model": "FTX-1",
            "status": "experimental",
            "hardware_validation_complete": False,
            "data_is_simulated": False,
            "queries": list(self.queries),
            "tx_control_enabled": False,
            "source": "android_usb",
            "read_only": True,
        }

    def inventory(self) -> dict[str, object]:
        self.catalog()
        return {
            "api_version": "v1",
            "schema_version": "1.0",
            "devices": [{
                "port": "android-usb-enhanced-0",
                "description": "Selected CP2105 Enhanced USB interface",
                "vid": "10C4",
                "pid": "EA70",
                "manufacturer": None,
                "product": "CP2105",
                "interface": "MI_00",
                "hwid": None,
                "classification": "unknown",
            }],
        }

    def read(self, command: str) -> dict[str, object]:
        query = self.queries.get(command)
        if query is None:
            raise AndroidAgentError("cat_invalid_query", HTTPStatus.BAD_REQUEST)
        if not self._request_lock.acquire(blocking=False):
            raise AndroidAgentError("cat_busy", HTTPStatus.CONFLICT)
        try:
            metadata = self.catalog()
            pending = _Query(command)
            with self._condition:
                peer = self._peer
                if peer is None or self._stopping:
                    raise AndroidAgentError("android_agent_unavailable")
                self._pending = pending
                self._condition.notify_all()
            if not pending.done.wait(3):
                self._detach(peer, AndroidAgentError("android_agent_request_timeout"))
                raise AndroidAgentError("android_agent_request_timeout")
            if pending.error is not None:
                raise pending.error
            reply = pending.reply
            if reply is None or query.decoder is None:
                raise AndroidAgentError("android_agent_invalid_reply", HTTPStatus.BAD_GATEWAY)
            try:
                decoded = query.decoder(reply.encode("ascii"))
            except (ValueError, UnicodeError) as error:
                LOGGER.warning("Android CAT reply rejected by model decoder")
                raise AndroidAgentError("cat_invalid_response", HTTPStatus.CONFLICT) from error
            return {
                **metadata,
                "command": command,
                "observed_at": time.time(),
                query.result_name: asdict(decoded) if is_dataclass(decoded) else decoded,
                "reply_hex": reply.encode("ascii").hex(),
            }
        finally:
            self._request_lock.release()

    def _detach(self, peer: WebSocketPeer, error: AndroidAgentError) -> None:
        with self._condition:
            if self._peer is peer:
                self._peer = None
                if self._pending is not None:
                    self._pending.error = error
                    self._pending.done.set()
                    self._pending = None
                self._condition.notify_all()
        peer.close()

    def serve(self, peer: WebSocketPeer) -> None:
        hello = _object(peer.receive())
        if (
            set(hello) != {"type", "identity", "vid", "pid", "port"}
            or hello["type"] != "hello"
            or hello["identity"] != "ID0840;"
            or type(hello["vid"]) is not int or hello["vid"] != 0x10C4
            or type(hello["pid"]) is not int or hello["pid"] != 0xEA70
            or type(hello["port"]) is not int or hello["port"] != 0
        ):
            raise AndroidAgentError("android_agent_invalid_hello", HTTPStatus.BAD_GATEWAY)
        with self._condition:
            if self._stopping:
                raise AndroidAgentError("android_agent_unavailable")
            if self._peer is not None:
                raise AndroidAgentError("android_agent_already_connected", HTTPStatus.CONFLICT)
            self._peer = peer
        try:
            peer.send_json({"type": "ready", "api_version": "v1", "read_only": True})
            while True:
                with self._condition:
                    if self._peer is not peer or self._stopping:
                        return
                    if self._pending is None:
                        self._condition.wait(1)
                    pending = self._pending
                    if self._peer is not peer or self._stopping:
                        return
                if pending is None:
                    peer.send_json({"type": "ping"})
                    if _object(peer.receive()) != {"type": "pong"}:
                        raise AndroidAgentError(
                            "android_agent_invalid_reply", HTTPStatus.BAD_GATEWAY
                        )
                    continue
                peer.send_json({
                    "type": "query", "id": pending.identifier, "command": pending.command,
                })
                result = _object(peer.receive())
                if result.get("id") != pending.identifier:
                    raise AndroidAgentError("android_agent_invalid_reply", HTTPStatus.BAD_GATEWAY)
                if set(result) == {"type", "id", "code"} and result["type"] == "error":
                    code = result["code"]
                    if not isinstance(code, str) or code not in _ERRORS:
                        raise AndroidAgentError(
                            "android_agent_invalid_reply", HTTPStatus.BAD_GATEWAY
                        )
                    pending.error = AndroidAgentError(code, HTTPStatus.CONFLICT)
                elif (
                    set(result) == {"type", "id", "identity", "reply"}
                    and result["type"] == "reply"
                    and result["identity"] == "ID0840;"
                    and isinstance(result["reply"], str)
                    and 1 <= len(result["reply"]) <= 64
                    and result["reply"].isascii()
                    and result["reply"].startswith(pending.command)
                ):
                    pending.reply = result["reply"]
                else:
                    raise AndroidAgentError("android_agent_invalid_reply", HTTPStatus.BAD_GATEWAY)
                with self._condition:
                    if self._peer is not peer or self._pending is not pending:
                        raise AndroidAgentError(
                            "android_agent_invalid_reply", HTTPStatus.BAD_GATEWAY
                        )
                    self._pending = None
                    pending.done.set()
        except AndroidAgentError as error:
            self._detach(peer, error)
            raise
        finally:
            self._detach(peer, AndroidAgentError("android_agent_unavailable"))

    def close(self) -> None:
        with self._condition:
            self._stopping = True
            peer = self._peer
            self._condition.notify_all()
        if peer is not None:
            self._detach(peer, AndroidAgentError("android_agent_unavailable"))
