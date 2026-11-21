"""Bounded PCM WebSockets; credentials travel only in the first encrypted message."""

import json
import logging
import select
import socket
import ssl
import threading
import time
from collections import deque
from collections.abc import Callable
from http.server import BaseHTTPRequestHandler

from wsproto import Connection, ConnectionType
from wsproto.events import (
    AcceptConnection,
    BytesMessage,
    CloseConnection,
    Ping,
    Pong,
    Request,
    TextMessage,
)
from wsproto.handshake import H11Handshake
from wsproto.utilities import LocalProtocolError, RemoteProtocolError

LOGGER = logging.getLogger("bricoham.websocket")
PROTOCOL = "bricoham.pcm-tx.v1"
TX_AUDIO_PATH = "/api/v1/audio/tx"
MAX_MESSAGE = 4096


class WebSocketError(Exception):
    pass


class WebSocketPeer:
    def __init__(
        self,
        sock: socket.socket,
        connection: Connection,
        read: Callable[[int], bytes] | None = None,
        peek: Callable[[int], bytes] | None = None,
    ) -> None:
        self.sock = sock
        self.connection = connection
        self.read = read or sock.recv
        self._peek = peek
        self._lock = threading.Lock()
        self._send_lock = threading.Lock()
        self._events = deque()

    def send(self, value: str | bytes) -> None:
        if len(value.encode("utf-8") if isinstance(value, str) else value) > MAX_MESSAGE:
            raise WebSocketError("audio_tx_message_too_large")
        try:
            with self._send_lock:
                with self._lock:
                    data = self.connection.send(
                        TextMessage(data=value)
                        if isinstance(value, str)
                        else BytesMessage(data=value)
                    )
                self.sock.sendall(data)
        except (LocalProtocolError, RemoteProtocolError) as error:
            raise WebSocketError("audio_tx_protocol_error") from error

    def send_json(self, value: dict[str, object]) -> None:
        self.send(json.dumps(value, separators=(",", ":")))

    def receive(self, timeout: float = 2) -> str | bytes:
        deadline = time.monotonic() + timeout
        content = bytearray()
        size = controls = fragments = 0
        try:
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise WebSocketError("audio_tx_message_timeout")
                if not self._events:
                    with self._lock:
                        self._events.extend(self.connection.events())
                    if not self._events:
                        self.sock.settimeout(remaining)
                        data = self.read(MAX_MESSAGE)
                        if not data:
                            raise WebSocketError("audio_tx_disconnected")
                        with self._lock:
                            self.connection.receive_data(data)
                            self._events.extend(self.connection.events())
                        continue
                event = self._events.popleft()
                if isinstance(event, CloseConnection):
                    raise WebSocketError("audio_tx_disconnected")
                if isinstance(event, Ping | Pong):
                    controls += 1
                    if controls > 16:
                        raise WebSocketError("audio_tx_control_limit")
                    if isinstance(event, Ping):
                        with self._send_lock:
                            with self._lock:
                                response = self.connection.send(event.response())
                            self.sock.sendall(response)
                    continue
                if not isinstance(event, TextMessage | BytesMessage):
                    raise WebSocketError("audio_tx_protocol_error")
                fragments += 1
                size += len(
                    event.data.encode("utf-8") if isinstance(event.data, str) else event.data
                )
                if size > MAX_MESSAGE or fragments > 32:
                    raise WebSocketError("audio_tx_message_too_large")
                content.extend(
                    event.data.encode("utf-8") if isinstance(event.data, str) else event.data
                )
                if event.message_finished:
                    return (
                        content.decode("utf-8")
                        if isinstance(event, TextMessage)
                        else bytes(content)
                    )
        except (LocalProtocolError, RemoteProtocolError) as error:
            raise WebSocketError("audio_tx_protocol_error") from error

    def close(self) -> None:
        try:
            self.sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            LOGGER.debug("WebSocket already disconnected")
        finally:
            self.sock.close()

    def _buffered(self) -> bool:
        if self._peek is None:
            return False
        # Bytes already pulled into the handler's buffered reader are invisible to select().
        previous = self.sock.gettimeout()
        try:
            self.sock.settimeout(0)
            return len(self._peek(1)) > 0
        except (OSError, ValueError):
            return False
        finally:
            self.sock.settimeout(previous)

    def pending(self) -> bool:
        with self._lock:
            self._events.extend(self.connection.events())
        return (
            bool(self._events)
            or (isinstance(self.sock, ssl.SSLSocket) and self.sock.pending() > 0)
            or self._buffered()
        )


def accept_websocket(
    handler: BaseHTTPRequestHandler, *, path: str = TX_AUDIO_PATH, protocol: str = PROTOCOL
) -> WebSocketPeer:
    if (
        handler.path != path
        or handler.request_version != "HTTP/1.1"
        or handler.headers.get("Transfer-Encoding") is not None
        or handler.headers.get_all("Content-Length", []) not in ([], ["0"])
        or len(handler.headers.get_all("Host", [])) != 1
    ):
        raise WebSocketError("audio_tx_invalid_upgrade")
    handshake = H11Handshake(ConnectionType.SERVER)
    try:
        handshake.initiate_upgrade_connection(
            [
                (key.encode("ascii"), value.encode("ascii"))
                for key, value in handler.headers.items()
            ],
            handler.path,
        )
        events = list(handshake.events())
        if (
            len(events) != 1
            or not isinstance(events[0], Request)
            or events[0].subprotocols != [protocol]
        ):
            raise WebSocketError("audio_tx_invalid_upgrade")
        response = handshake.send(AcceptConnection(subprotocol=protocol))
    except (ValueError, UnicodeError, LocalProtocolError, RemoteProtocolError) as error:
        raise WebSocketError("audio_tx_invalid_upgrade") from error
    handler.close_connection = True
    handler.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    handler.connection.settimeout(2)
    handler.connection.sendall(response)
    assert handshake.connection is not None
    return WebSocketPeer(
        handler.connection, handshake.connection, handler.rfile.read1, handler.rfile.peek
    )


def connect_websocket(
    host: str,
    port: int,
    *,
    context: ssl.SSLContext | None = None,
    origin: str | None = None,
    path: str = TX_AUDIO_PATH,
    protocol: str = PROTOCOL,
) -> WebSocketPeer:
    sock = socket.create_connection((host, port), timeout=2)
    connected = False
    try:
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        if context is not None:
            sock = context.wrap_socket(sock, server_hostname=host)
        handshake = H11Handshake(ConnectionType.CLIENT)
        headers = [(b"origin", origin.encode("ascii"))] if origin else []
        sock.sendall(
            handshake.send(
                Request(
                    host=f"{host}:{port}",
                    target=path,
                    subprotocols=[protocol],
                    extra_headers=headers,
                )
            )
        )
        deadline = time.monotonic() + 2
        count = 0
        while time.monotonic() < deadline:
            sock.settimeout(max(0.001, deadline - time.monotonic()))
            data = sock.recv(4096)
            count += len(data)
            if not data or count > 16384:
                raise WebSocketError("audio_tx_upgrade_failed")
            handshake.receive_data(data)
            for event in handshake.events():
                if not isinstance(event, AcceptConnection) or event.subprotocol != protocol:
                    raise WebSocketError("audio_tx_upgrade_failed")
                assert handshake.connection is not None
                connected = True
                return WebSocketPeer(sock, handshake.connection)
        raise WebSocketError("audio_tx_upgrade_timeout")
    except (LocalProtocolError, RemoteProtocolError) as error:
        raise WebSocketError("audio_tx_upgrade_failed") from error
    finally:
        if not connected:
            sock.close()


def read_auth_token(peer: WebSocketPeer) -> str:
    message = peer.receive()
    try:
        value = json.loads(message) if isinstance(message, str) else None
    except (ValueError, RecursionError) as error:
        raise WebSocketError("audio_tx_invalid_auth") from error
    if (
        not isinstance(value, dict)
        or set(value) != {"token"}
        or not isinstance(value["token"], str)
    ):
        raise WebSocketError("audio_tx_invalid_auth")
    return value["token"]


def bridge_audio(client: WebSocketPeer, agent: WebSocketPeer) -> None:
    last_pcm = last_reply = time.monotonic()
    while True:
        remaining = min(last_pcm + 0.3, last_reply + 2) - time.monotonic()
        if remaining <= 0:
            raise WebSocketError("audio_tx_message_timeout")
        available = [peer.sock for peer in (client, agent) if peer.pending()]
        if not available:
            available, _, _ = select.select([client.sock, agent.sock], [], [], min(0.05, remaining))
        for peer, destination in ((client, agent), (agent, client)):
            if peer.sock not in available:
                continue
            remaining = min(last_pcm + 0.3, last_reply + 2) - time.monotonic()
            message = peer.receive(timeout=max(0.001, remaining))
            if peer is client:
                if not isinstance(message, bytes) or len(message) != 1920:
                    raise WebSocketError("audio_tx_invalid_frame")
                last_pcm = time.monotonic()
            else:
                if not isinstance(message, str):
                    raise WebSocketError("audio_tx_unexpected_reply")
                last_reply = time.monotonic()
            destination.send(message)
