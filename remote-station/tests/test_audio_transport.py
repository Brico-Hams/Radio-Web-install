"""TLS audio transport tests use synthetic callback data, never a physical ADC."""

import contextlib
import json
import shutil
import ssl
import struct
import subprocess
import sys
import threading
import unittest
import uuid
from http.client import HTTPSConnection, IncompleteRead
from pathlib import Path
from unittest.mock import patch

from test_audio_rx import FakeSoundDevice

from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import CoordinatorHTTPServer
from bricoham_remote_station.simulator import DeterministicSimulator
from bricoham_remote_station.transport_security import AgentLink, server_tls_context
from bricoham_station_agent.audio import AudioCapture, AudioConfig
from bricoham_station_agent.server import StationAgentHTTPServer


class AudioTlsTransportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        openssl = shutil.which("openssl")
        git_openssl = Path(r"C:\Program Files\Git\usr\bin\openssl.exe")
        if openssl is None and git_openssl.is_file():
            openssl = str(git_openssl)
        if openssl is None:
            raise unittest.SkipTest("OpenSSL required for TLS audio integration tests")
        directory = Path("tests") / f"_audio_tls_{uuid.uuid4().hex}"
        directory.mkdir()

        def cleanup() -> None:
            for name in ("server.cnf", "server.key", "server.crt"):
                (directory / name).unlink(missing_ok=True)
            directory.rmdir()

        cls.addClassCleanup(cleanup)
        config, key, cert = (
            directory / name for name in ("server.cnf", "server.key", "server.crt")
        )
        config.write_text(
            "[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=extensions\n"
            "[dn]\nCN=localhost\n[extensions]\n"
            "subjectAltName=IP:127.0.0.1,DNS:wrong.example\n"
            "basicConstraints=critical,CA:TRUE\n"
            "keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign\n"
            "subjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid:always\n",
            encoding="ascii",
        )
        subprocess.run(
            [
                openssl,
                "req",
                "-x509",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-days",
                "1",
                "-config",
                str(config),
                "-keyout",
                str(key),
                "-out",
                str(cert),
            ],
            check=True,
            capture_output=True,
        )
        cls.cert = cert
        cls.tls = server_tls_context(cert, key)
        cls.client_tls = ssl.create_default_context(cafile=cert)

    def setUp(self) -> None:
        self.stack = contextlib.ExitStack()
        self.addCleanup(self.stack.close)
        self.sd = FakeSoundDevice()
        self.sd.live = True
        self.stack.enter_context(patch.dict(sys.modules, {"sounddevice": self.sd}))
        self.user_tokens = {Role.ADMIN: "a" * 32, Role.LISTENER: "u" * 32, Role.GUEST: "g" * 32}
        self.link_token = "l" * 32
        self.agent_guest = "z" * 32
        self.capture = AudioCapture(AudioConfig(3, 8000, 20, "Station ADC"))
        self.agent = self.running(
            StationAgentHTTPServer(
                0,
                TokenAuthenticator({Role.ADMIN: self.link_token, Role.GUEST: self.agent_guest}),
                lambda: [],
                tls_context=self.tls,
                audio=self.capture,
            )
        )
        self.host = self.coordinator(self.link_token)

    def running(self, server):
        thread = threading.Thread(target=server.serve_forever)
        thread.start()
        stopped = False

        def stop() -> None:
            nonlocal stopped
            if not stopped:
                stopped = True
                server.shutdown()
                server.server_close()
                thread.join(3)
                self.assertFalse(thread.is_alive())

        self.stack.callback(stop)
        server.stop_test_server = stop
        return server

    def coordinator(self, token: str):
        return self.running(
            CoordinatorHTTPServer(
                ("127.0.0.1", 0),
                TokenAuthenticator(self.user_tokens),
                DeterministicSimulator(),
                tls_context=self.tls,
                agent_link=AgentLink(
                    f"https://127.0.0.1:{self.agent.server_address[1]}", token, self.cert
                ),
                client_origins=("https://console.example",),
            )
        )

    def request(self, server, token: str, path: str = "/api/v1/audio/stream"):
        conn = HTTPSConnection(
            "127.0.0.1", server.server_address[1], context=self.client_tls, timeout=5
        )
        conn.request(
            "GET",
            path,
            headers={"Authorization": f"Bearer {token}", "Origin": "https://console.example"},
        )
        return conn, conn.getresponse()

    def test_tls_auth_bhr1_busy_and_disconnect(self) -> None:
        for server, token, expected in (
            (self.host, "wrong", 401),
            (self.host, self.user_tokens[Role.GUEST], 403),
            (self.agent, "wrong", 401),
            (self.agent, self.agent_guest, 403),
        ):
            conn, response = self.request(server, token)
            self.assertEqual(response.status, expected)
            response.read()
            conn.close()
        self.assertEqual(self.sd.opened, [])
        conn, response = self.request(self.host, self.user_tokens[Role.LISTENER])
        self.assertEqual(response.status, 200)
        self.assertEqual(
            response.getheader("Access-Control-Allow-Origin"), "https://console.example"
        )
        self.assertEqual(response.read(12), struct.pack("<4sIHH", b"BHR1", 8000, 1, 16))
        self.assertEqual(response.read(4), struct.pack("<I", 320))
        self.assertEqual(response.read(320), b"\x34\x12" * 160)
        other, busy = self.request(self.host, self.user_tokens[Role.LISTENER])
        self.assertEqual(busy.status, 409)
        self.assertEqual(json.loads(busy.read())["error"]["code"], "audio_busy")
        other.close()
        response.close()
        conn.close()
        self.assertTrue(self.sd.closed.wait(2))

    def test_dedicated_link_authentication_and_role_do_not_open_adc(self) -> None:
        for token in ("bad" * 11, self.agent_guest):
            host = self.coordinator(token)
            conn, response = self.request(host, self.user_tokens[Role.LISTENER])
            self.assertEqual(response.status, 502)
            self.assertEqual(
                json.loads(response.read())["error"]["code"], "station_agent_request_failed"
            )
            conn.close()
        self.assertEqual(self.sd.opened, [])

    def test_bad_upstream_certificate_hostname_never_opens_adc(self) -> None:
        host = self.running(
            CoordinatorHTTPServer(
                ("127.0.0.1", 0),
                TokenAuthenticator(self.user_tokens),
                DeterministicSimulator(),
                tls_context=self.tls,
                agent_link=AgentLink(
                    f"https://localhost:{self.agent.server_address[1]}", self.link_token, self.cert
                ),
            )
        )
        conn, response = self.request(host, self.user_tokens[Role.LISTENER])
        self.assertEqual(response.status, 502)
        self.assertEqual(json.loads(response.read())["error"]["code"], "station_agent_audio_failed")
        conn.close()
        self.assertEqual(self.sd.opened, [])

    def test_overflow_truncates_tls_stream_and_closes_capture(self) -> None:
        self.sd.live = False
        conn, response = self.request(self.host, self.user_tokens[Role.LISTENER])
        self.assertEqual(response.status, 200)
        self.assertEqual(response.read(12), struct.pack("<4sIHH", b"BHR1", 8000, 1, 16))
        callback = self.sd.opened[0]["callback"]
        for _ in range(10):
            callback(b"\x00\x00" * 160, 160, None, None)
        with self.assertRaises((IncompleteRead, OSError)):
            response.read()
        self.assertTrue(self.sd.closed.wait(2))
        response.close()
        conn.close()

    def test_coordinator_tls_shutdown_closes_capture(self) -> None:
        conn, response = self.request(self.host, self.user_tokens[Role.LISTENER])
        self.assertEqual(response.status, 200)
        self.assertEqual(response.read(12), struct.pack("<4sIHH", b"BHR1", 8000, 1, 16))
        self.host.stop_test_server()
        self.assertTrue(self.sd.closed.wait(2))
        response.close()
        conn.close()

    def test_agent_tls_shutdown_truncates_stream_and_closes_capture(self) -> None:
        conn, response = self.request(self.host, self.user_tokens[Role.LISTENER])
        self.assertEqual(response.status, 200)
        self.assertEqual(response.read(12), struct.pack("<4sIHH", b"BHR1", 8000, 1, 16))
        self.agent.stop_test_server()
        self.assertTrue(self.sd.closed.wait(2))
        with self.assertRaises((IncompleteRead, OSError)):
            response.read()
        response.close()
        conn.close()
