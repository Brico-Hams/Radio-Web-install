import socket
import unittest

from wsproto import Connection, ConnectionType
from wsproto.events import BytesMessage, Ping, TextMessage

from bricoham_remote_station.websocket_transport import (
    WebSocketError,
    WebSocketPeer,
    read_auth_token,
)


class WebSocketTransportTests(unittest.TestCase):
    def setUp(self):
        server, client = socket.socketpair()
        self.peer = WebSocketPeer(server, Connection(ConnectionType.SERVER))
        self.client = client
        self.encoder = Connection(ConnectionType.CLIENT)
        self.addCleanup(self.peer.close)
        self.addCleanup(client.close)

    def test_fragmented_pcm_and_control_frames_preserve_exact_payload(self):
        self.client.sendall(
            self.encoder.send(BytesMessage(data=b"a" * 960, message_finished=False))
            + self.encoder.send(Ping(payload=b"keepalive"))
            + self.encoder.send(BytesMessage(data=b"b" * 960))
        )
        self.assertEqual(self.peer.receive(), b"a" * 960 + b"b" * 960)

    def test_oversize_message_is_rejected_with_bounded_reads(self):
        self.client.sendall(self.encoder.send(BytesMessage(data=b"x" * 4097)))
        with self.assertRaisesRegex(WebSocketError, "message_too_large"):
            self.peer.receive()

    def test_ping_flood_cannot_replace_pcm(self):
        self.client.sendall(b"".join(self.encoder.send(Ping(payload=b"")) for _ in range(17)))
        with self.assertRaisesRegex(WebSocketError, "control_limit"):
            self.peer.receive()

    def test_pending_sees_frames_already_buffered_by_the_handler_reader(self):
        reader = self.peer.sock.makefile("rb")
        self.addCleanup(reader.close)
        peer = WebSocketPeer(
            self.peer.sock, Connection(ConnectionType.SERVER), reader.read1, reader.peek
        )
        self.assertFalse(peer.pending())
        self.client.sendall(
            self.encoder.send(TextMessage(data='{"token":"secret"}'))
            + self.encoder.send(BytesMessage(data=b"p" * 1920))
        )
        reader.peek(1)
        self.assertTrue(peer.pending())
        self.assertEqual(read_auth_token(peer), "secret")
        self.assertTrue(peer.pending())
        self.assertEqual(peer.receive(), b"p" * 1920)
        self.assertFalse(peer.pending())

    def test_token_is_only_accepted_as_exact_first_json_object(self):
        self.client.sendall(self.encoder.send(TextMessage(data='{"token":"secret","extra":true}')))
        with self.assertRaisesRegex(WebSocketError, "invalid_auth"):
            read_auth_token(self.peer)
