import contextlib
import io
import json
import shutil
import socket
import ssl
import subprocess
import tempfile
import threading
import time
import unittest
from http.client import HTTPConnection, HTTPSConnection
from pathlib import Path
from unittest.mock import patch

from test_audio_tx import FakeDac
from test_ptt import PttPort
from test_radio_settings import SettingsPort
from test_rotor import RotorBroker
from test_wsjtx import status_packet

from bricoham_remote_station.android_agent import ANDROID_AGENT_PATH, ANDROID_AGENT_PROTOCOL
from bricoham_remote_station.diagnostic_reports import DiagnosticRuntime
from bricoham_remote_station.secure_http import SecureHTTPServer, SecureRequestHandler
from bricoham_remote_station.security import Role, TokenAuthenticator
from bricoham_remote_station.server import (
    CoordinatorHTTPServer,
)
from bricoham_remote_station.server import (
    _parse_args as coordinator_args,
)
from bricoham_remote_station.simulator import DeterministicSimulator
from bricoham_remote_station.transport_security import (
    AgentLink,
    server_tls_context,
    validate_client_origin,
)
from bricoham_remote_station.websocket_transport import (
    WebSocketError,
    connect_websocket,
)
from bricoham_station_agent.audio_tx import AudioTransmitter, TxAudioConfig
from bricoham_station_agent.cat import CatConfig, SerialCat
from bricoham_station_agent.ptt import PttConfig, PttController
from bricoham_station_agent.radio_settings import RadioSettingsConfig
from bricoham_station_agent.rotor import RotorConfig, RotorController
from bricoham_station_agent.server import (
    StationAgentHTTPServer,
)
from bricoham_station_agent.server import (
    _parse_args as agent_args,
)
from bricoham_station_agent.wsjtx import WsjtxReceiver


class SecureTransportTests(unittest.TestCase):
    def android_host(self):
        return self.running(CoordinatorHTTPServer(
            ("127.0.0.1", 0), self.auth, DeterministicSimulator(),
            tls_context=self.ip_context, android_agent_token=self.link_token,
        ))

    def android_peer(self, host, token=None, *, origin=None):
        peer = connect_websocket(
            "127.0.0.1", host.server_address[1],
            context=ssl.create_default_context(cafile=self.ip_cert),
            path=ANDROID_AGENT_PATH, protocol=ANDROID_AGENT_PROTOCOL, origin=origin,
        )
        self.addCleanup(peer.close)
        peer.send_json({"token": token or self.link_token})
        return peer

    def android_request(self, host, path, token=None):
        connection = HTTPSConnection(
            "127.0.0.1", host.server_address[1],
            context=ssl.create_default_context(cafile=self.ip_cert), timeout=5,
        )
        try:
            connection.request(
                "GET", path, headers={"Authorization": f"Bearer {token or self.user_token}"},
            )
            response = connection.getresponse()
            return response.status, json.loads(response.read())
        finally:
            connection.close()

    def test_android_link_reads_canonical_cat_without_legacy_agent_fallback(self):
        host = self.android_host()
        with patch("bricoham_remote_station.server.HTTPConnection") as legacy:
            self.assertEqual(self.android_request(host, "/api/v1/cat")[0], 503)
            peer = self.android_peer(host)
            peer.send_json({
                "type": "hello", "identity": "ID0840;",
                "vid": 0x10C4, "pid": 0xEA70, "port": 0,
            })
            self.assertEqual(json.loads(peer.receive())["type"], "ready")
            status, inventory = self.android_request(host, "/api/v1/devices")
            self.assertEqual(status, 200)
            self.assertNotIn("serial_number", inventory["devices"][0])
            errors = []

            def respond(peer, errors):
                try:
                    request = json.loads(peer.receive())
                    self.assertEqual(request["type"], "query")
                    self.assertEqual(request["command"], "FA")
                    peer.send_json({
                        "type": "reply", "id": request["id"],
                        "identity": "ID0840;", "reply": "FA014200000;",
                    })
                except (AssertionError, OSError, WebSocketError) as error:
                    errors.append(error)

            worker = threading.Thread(target=respond, args=(peer, errors))
            worker.start()
            status, result = self.android_request(host, "/api/v1/cat?command=FA")
            worker.join(timeout=3)
            self.assertFalse(worker.is_alive())
            self.assertEqual(errors, [])
            self.assertEqual(status, 200)
            self.assertEqual(result["frequency_hz"], 14_200_000)
            self.assertFalse(result["data_is_simulated"])
            self.assertFalse(result["tx_control_enabled"])
            for path in (
                "/api/v1/cat?command=TX1", "/api/v1/cat?command=FA&command=TX",
                "/api/v1/cat?command=FA&extra=x", "/api/v1/cat?command=",
            ):
                self.assertEqual(self.android_request(host, path)[0], 400)
            for path in (
                "/api/v1/digital", "/api/v1/rotor", "/api/v1/radio-settings",
                "/api/v1/ptt", "/api/v1/audio", "/api/v1/audio/stream",
                "/api/v1/audio/tx",
            ):
                status, result = self.android_request(host, path)
                self.assertEqual(status, 501)
                self.assertEqual(result["error"]["code"], "android_agent_operation_unsupported")
            self.assertEqual(self.android_request(host, "/api/v1/cat", self.link_token)[0], 401)
            legacy.assert_not_called()

    def test_android_link_rejects_user_token_wrong_identity_and_duplicate_session(self):
        host = self.android_host()
        peer = self.android_peer(host, self.user_token)
        self.assertEqual(json.loads(peer.receive())["code"], "android_agent_unauthorized")
        wrong = self.android_peer(host)
        wrong.send_json({
            "type": "hello", "identity": "ID0670;",
            "vid": 0x10C4, "pid": 0xEA70, "port": 0,
        })
        self.assertEqual(json.loads(wrong.receive())["code"], "android_agent_invalid_hello")
        peer = self.android_peer(host)
        hello = {
            "type": "hello", "identity": "ID0840;",
            "vid": 0x10C4, "pid": 0xEA70, "port": 0,
        }
        peer.send_json(hello)
        self.assertEqual(json.loads(peer.receive())["type"], "ready")
        duplicate = self.android_peer(host)
        duplicate.send_json(hello)
        self.assertEqual(
            json.loads(duplicate.receive())["code"], "android_agent_already_connected"
        )
        with self.assertRaises(WebSocketError):
            self.android_peer(host, origin="https://evil.example")
        self.assertEqual(self.android_request(host, "/api/v1/cat")[0], 200)

    def test_android_link_requires_tls_distinct_token_and_exclusive_source(self):
        for kwargs in (
            {},
            {"tls_context": self.ip_context, "android_agent_token": self.user_token},
            {"tls_context": self.ip_context, "android_agent_token": "x" * 31},
            {"tls_context": self.ip_context, "android_agent_token": "x" * 32 + "\t"},
            {"tls_context": self.ip_context,
             "agent_link": AgentLink("https://localhost:8788", "z" * 32, self.cert)},
        ):
            with self.subTest(kwargs=tuple(kwargs)):
                config = {"android_agent_token": self.link_token, **kwargs}
                with self.assertRaises(ValueError):
                    CoordinatorHTTPServer(
                        ("127.0.0.1", 0), self.auth, DeterministicSimulator(), **config,
                    )
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            coordinator_args(["--android-agent"])

    def test_android_relay_rejects_unmatched_reply_and_undocumented_if_shift(self):
        for command, reply, identifier, expected, code in (
            ("FA", "FA014200000;", "wrong", 502, "android_agent_invalid_reply"),
            ("FA", "FB014200000;", None, 502, "android_agent_invalid_reply"),
            ("IF", "IF" + "00000" + "014200000" + "+0000" + "00200" + "00" + "3;",
             None, 409, "cat_invalid_response"),
        ):
            with self.subTest(command=command):
                host = self.android_host()
                peer = self.android_peer(host)
                peer.send_json({
                    "type": "hello", "identity": "ID0840;",
                    "vid": 0x10C4, "pid": 0xEA70, "port": 0,
                })
                self.assertEqual(json.loads(peer.receive())["type"], "ready")
                errors = []

                def respond(peer, identifier, reply, errors):
                    try:
                        request = json.loads(peer.receive())
                        peer.send_json({
                            "type": "reply", "id": identifier or request["id"],
                            "identity": "ID0840;", "reply": reply,
                        })
                    except (OSError, WebSocketError) as error:
                        errors.append(error)

                worker = threading.Thread(target=respond, args=(peer, identifier, reply, errors))
                worker.start()
                status, result = self.android_request(host, f"/api/v1/cat?command={command}")
                worker.join(timeout=3)
                self.assertFalse(worker.is_alive())
                self.assertEqual(errors, [])
                self.assertEqual(status, expected)
                self.assertEqual(result["error"]["code"], code)

    def test_digital_halt_crosses_validated_tls_links_and_requires_client_origin(self):
        receiver = WsjtxReceiver(0, "WSJT-X", commands_enabled=True)
        agent = self.running(
            StationAgentHTTPServer(
                0,
                TokenAuthenticator({Role.ADMIN: self.link_token}),
                lambda: [],
                wsjtx=receiver,
                tls_context=self.ip_context,
            )
        )
        host = self.coordinator(
            agent,
            hostname="127.0.0.1",
            ca_file=self.ip_cert,
            tls_context=self.ip_context,
            client_origins=("https://console.example",),
        )
        client_context = ssl.create_default_context(cafile=self.ip_cert)
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sender:
            sender.settimeout(1)
            sender.sendto(status_packet(), ("127.0.0.1", receiver.port))
            deadline = time.monotonic() + 1
            while not receiver.snapshot()["commands_ready"]:
                if time.monotonic() >= deadline:
                    self.fail("WSJT-X peer was not received")
                time.sleep(0.01)
            for origin, expected in (
                ("https://evil.example", 403),
                ("https://console.example", 200),
            ):
                connection = HTTPSConnection(
                    "127.0.0.1",
                    host.server_address[1],
                    context=client_context,
                    timeout=5,
                )
                try:
                    connection.request(
                        "POST",
                        "/api/v1/digital",
                        body=json.dumps(
                            {
                                "operation": "halt_tx",
                                "request_id": "tls-halt-request-0001",
                            }
                        ),
                        headers={
                            "Authorization": f"Bearer {self.user_token}",
                            "Content-Type": "application/json",
                            "Origin": origin,
                        },
                    )
                    response = connection.getresponse()
                    payload = json.loads(response.read())
                    self.assertEqual(response.status, expected)
                    if expected == 200:
                        self.assertEqual(
                            response.getheader("Access-Control-Allow-Origin"),
                            origin,
                        )
                        self.assertEqual(payload["delivery"], "sent_unconfirmed")
                        self.assertFalse(payload["transmission_stopped_confirmed"])
                finally:
                    connection.close()
            self.assertEqual(
                sender.recvfrom(1024)[0],
                b"\xad\xbc\xcb\xda\x00\x00\x00\x03\x00\x00\x00\x08\x00\x00\x00\x06WSJT-X\x00",
            )
            connection = HTTPSConnection(
                "127.0.0.1",
                host.server_address[1],
                context=client_context,
                timeout=5,
            )
            try:
                connection.request(
                    "OPTIONS",
                    "/api/v1/digital",
                    headers={
                        "Origin": "https://console.example",
                        "Access-Control-Request-Method": "POST",
                        "Access-Control-Request-Headers": "authorization,content-type",
                    },
                )
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                response.read()
            finally:
                connection.close()

    def test_diagnostic_upload_verifies_tls_and_requires_boolean_acknowledgement(self):
        class Receiver(SecureRequestHandler):
            acknowledgement = b'{"accepted":true}'
            received = []

            def do_POST(self):
                body = self.rfile.read(int(self.headers["Content-Length"]))
                self.received.append(json.loads(body))
                self.send_response(202)
                self.send_header("Content-Length", str(len(self.acknowledgement)))
                self.end_headers()
                self.wfile.write(self.acknowledgement)

        with SecureHTTPServer(("127.0.0.1", 0), Receiver, tls_context=self.ip_context) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                url = f"https://127.0.0.1:{server.server_address[1]}"
                with DiagnosticRuntime(
                    "station-agent",
                    Path(self.directory.name) / "diagnostic",
                    opt_in=True,
                    token="d" * 32,
                    url=url,
                    ca=self.ip_cert,
                ) as runtime:
                    self.assertTrue(runtime.flush_remote())
                    self.assertEqual(len(Receiver.received), 1)
                    for acknowledgement in (
                        b'{"accepted":1}',
                        b'{"accepted":true,"id":1}',
                        b"{",
                        b" " * 257,
                    ):
                        Receiver.acknowledgement = acknowledgement
                        runtime.record("operation_failed", "cat", "error")
                        self.assertFalse(runtime.flush_remote())
                count = len(Receiver.received)
                with DiagnosticRuntime(
                    "station-agent",
                    Path(self.directory.name) / "untrusted-diagnostic",
                    opt_in=True,
                    token="d" * 32,
                    url=url,
                ) as runtime:
                    self.assertFalse(runtime.flush_remote())
                self.assertEqual(len(Receiver.received), count)
            finally:
                server.shutdown()
                worker.join(timeout=3)

    @classmethod
    def setUpClass(cls) -> None:
        openssl = shutil.which("openssl")
        git_openssl = Path(r"C:\Program Files\Git\usr\bin\openssl.exe")
        if openssl is None and git_openssl.is_file():
            openssl = str(git_openssl)
        if openssl is None:
            raise unittest.SkipTest(
                "OpenSSL is required to generate temporary TLS test certificates"
            )
        cls.directory = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.directory.cleanup)
        cls.cert = Path(cls.directory.name) / "server.crt"
        cls.key = Path(cls.directory.name) / "server.key"
        cls.ip_cert = Path(cls.directory.name) / "ipv4.crt"
        for name, san in (("server", "DNS:localhost"), ("ipv4", "IP:127.0.0.1")):
            common_name = "localhost" if name == "server" else "127.0.0.1"
            config = Path(cls.directory.name) / f"{name}.cnf"
            config.write_text(
                "[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=extensions\n"
                f"[dn]\nCN={common_name}\n[extensions]\nsubjectAltName={san}\n"
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
                    str(Path(cls.directory.name) / f"{name}.key"),
                    "-out",
                    str(Path(cls.directory.name) / f"{name}.crt"),
                ],
                check=True,
                capture_output=True,
            )
        cls.context = server_tls_context(cls.cert, cls.key)
        cls.ip_context = server_tls_context(cls.ip_cert, Path(cls.directory.name) / "ipv4.key")
        cls.client_cert = Path(cls.directory.name) / "client.crt"
        cls.client_key = Path(cls.directory.name) / "client.key"
        client_csr = Path(cls.directory.name) / "client.csr"
        client_extensions = Path(cls.directory.name) / "client.ext"
        client_extensions.write_text(
            "basicConstraints=critical,CA:FALSE\n"
            "keyUsage=critical,digitalSignature,keyEncipherment\n"
            "extendedKeyUsage=clientAuth\n",
            encoding="ascii",
        )
        for command in (
            [
                openssl,
                "req",
                "-new",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-subj",
                "/CN=BricoHam Test Coordinator",
                "-keyout",
                str(cls.client_key),
                "-out",
                str(client_csr),
            ],
            [
                openssl,
                "x509",
                "-req",
                "-in",
                str(client_csr),
                "-CA",
                str(cls.cert),
                "-CAkey",
                str(cls.key),
                "-CAcreateserial",
                "-CAserial",
                str(Path(cls.directory.name) / "client-ca.srl"),
                "-days",
                "1",
                "-sha256",
                "-extfile",
                str(client_extensions),
                "-out",
                str(cls.client_cert),
            ],
        ):
            subprocess.run(command, check=True, capture_output=True)

    def setUp(self) -> None:
        self.user_token = "u" * 32
        self.link_token = "l" * 32
        self.auth = TokenAuthenticator({Role.ADMIN: self.user_token})
        self.servers = contextlib.ExitStack()
        self.addCleanup(self.servers.close)

    def running(self, server):
        thread = threading.Thread(target=server.serve_forever)
        thread.start()

        def stop():
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)
            self.assertFalse(thread.is_alive())

        self.servers.callback(stop)
        return server

    def agent(self):
        return self.running(
            StationAgentHTTPServer(
                0,
                TokenAuthenticator({Role.ADMIN: self.link_token}),
                lambda: [],
                tls_context=self.context,
            )
        )

    def request(self, server, path="/api/v1/devices", *, method="GET", headers=None):
        connection = HTTPConnection(*server.server_address, timeout=3)
        try:
            connection.request(
                method,
                path,
                headers={
                    "Authorization": f"Bearer {self.user_token}",
                    **(headers or {}),
                },
            )
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), json.loads(response.read())
        finally:
            connection.close()

    def coordinator(self, agent, *, hostname="localhost", ca_file=None, **kwargs):
        return self.running(
            CoordinatorHTTPServer(
                ("127.0.0.1", 0),
                self.auth,
                DeterministicSimulator(),
                agent_link=AgentLink(
                    f"https://{hostname}:{agent.server_address[1]}",
                    self.link_token,
                    ca_file or self.cert,
                ),
                **kwargs,
            )
        )

    def test_https_proxy_validates_certificate_and_uses_dedicated_link_token(self) -> None:
        agent = self.agent()
        server = self.coordinator(agent)
        status, _, payload = self.request(server)
        self.assertEqual(status, 200)
        self.assertEqual(payload["devices"], [])
        self.assertNotEqual(self.user_token, self.link_token)

    def test_rotor_commands_cross_two_validated_tls_links_with_origin_enforcement(self) -> None:
        broker = RotorBroker()
        self.servers.callback(broker.stop)
        rotor = RotorController(
            RotorConfig(broker.server_address[1], "TLS test", 0, 360, 0, 0, True)
        )
        self.servers.callback(rotor.close)
        agent = self.running(
            StationAgentHTTPServer(
                0,
                TokenAuthenticator({Role.ADMIN: self.link_token}),
                lambda: [],
                tls_context=self.ip_context,
                rotor=rotor,
            )
        )
        host = self.coordinator(
            agent,
            hostname="127.0.0.1",
            ca_file=self.ip_cert,
            tls_context=self.ip_context,
            client_origins=("https://console.example",),
        )
        client_context = ssl.create_default_context(cafile=self.ip_cert)

        def post(payload, origin="https://console.example", path="/api/v1/rotor"):
            connection = HTTPSConnection(
                "127.0.0.1", host.server_address[1], context=client_context, timeout=5
            )
            try:
                connection.request(
                    "POST",
                    path,
                    body=json.dumps(payload),
                    headers={
                        "Authorization": f"Bearer {self.user_token}",
                        "Content-Type": "application/json",
                        "Origin": origin,
                    },
                )
                response = connection.getresponse()
                result = json.loads(response.read())
                return response.status, response.getheader("Access-Control-Allow-Origin"), result
            finally:
                connection.close()

        self.assertEqual(post({"operation": "stop"}, "https://evil.example")[0], 403)
        self.assertEqual(broker.commands, [])
        status, origin, result = post(
            {
                "operation": "move",
                "request_id": "tls-rotor-request-0001",
                "azimuth_deg": 110,
                "elevation_deg": 0,
            }
        )
        self.assertEqual(status, 200)
        self.assertEqual(origin, "https://console.example")
        self.assertEqual(broker.position, (110, 0))
        self.assertEqual(post({"operation": "renew", "lease_id": result["lease_id"]})[0], 200)
        self.assertFalse(post({"operation": "stop"})[2]["lease_active"])
        self.assertEqual(broker.commands[-1], "+S")
        port = SettingsPort()
        agent.cat = SerialCat(
            CatConfig("IC-7300", "COM_TEST", 19200),
            settings=RadioSettingsConfig(True, 120, True),
        )
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=port):
            status, origin, observed = post(
                {
                    "operation": "set_power",
                    "request_id": "tls-power-request-0001",
                    "power_level": 100,
                },
                path="/api/v1/radio-settings",
            )
        self.assertEqual(status, 200)
        self.assertEqual(origin, "https://console.example")
        self.assertEqual(observed["power_level"], 100)
        self.assertIn(bytes.fromhex("FEFE94E0140A0100FD"), port.writes)
        agent.cat.close()
        ftx_port = PttPort()
        agent.cat = SerialCat(
            CatConfig("FTX-1", "COM_TEST", 38400),
            settings=RadioSettingsConfig(
                True,
                50,
                False,
                frequency_adjustment_enabled=True,
                mode_adjustment_enabled=True,
            ),
        )
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=ftx_port):
            status, origin, observed = post(
                {
                    "operation": "set_power",
                    "request_id": "tls-ftx-power-request-0001",
                    "power_level": 40,
                },
                path="/api/v1/radio-settings",
            )
        self.assertEqual(status, 200)
        self.assertEqual(origin, "https://console.example")
        self.assertEqual(observed["power_unit"], "watts_setpoint")
        self.assertEqual((observed["power_head"], observed["power_level"]), ("SPA-1", 40))
        self.assertEqual(ftx_port.writes.count(b"PC2040;"), 1)
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=ftx_port):
            status, _, observed = post(
                {
                    "operation": "set_frequency",
                    "request_id": "tls-ftx-frequency-request-0001",
                    "receiver": "SUB",
                    "frequency_hz": 7_100_000,
                },
                path="/api/v1/radio-settings",
            )
        self.assertEqual(status, 200)
        self.assertEqual(observed["receivers"]["SUB"]["frequency_hz"], 7_100_000)
        self.assertEqual(ftx_port.writes.count(b"FB007100000;"), 1)
        agent.ptt = PttController(agent.cat, PttConfig(True, 14_200_000, 14_300_000, 45, 5))
        with patch("bricoham_station_agent.cat.serial.Serial", return_value=ftx_port):
            self.assertEqual(post({"operation": "stop"}, path="/api/v1/ptt")[0], 200)
            status, _, started = post(
                {"operation": "start", "request_id": "tls-ptt-start-request-0001"},
                path="/api/v1/ptt",
            )
            self.assertEqual(status, 200)
            self.assertTrue(started["lease_active"])
            self.assertEqual(ftx_port.tx, 1)
            status, _, stopped = post({"operation": "stop"}, path="/api/v1/ptt")
            self.assertEqual(status, 200)
            self.assertTrue(stopped["rx_confirmed"])
            self.assertEqual(ftx_port.tx, 0)

    def test_voice_websocket_crosses_two_tls_hops_with_mtls_and_audio_loss_stops_ptt(self):
        sd = FakeDac()
        port = PttPort()
        for patcher in (
            patch.dict("sys.modules", {"sounddevice": sd}),
            patch("bricoham_station_agent.cat.serial.Serial", return_value=port),
        ):
            patcher.start()
            self.servers.callback(patcher.stop)
        cat = SerialCat(CatConfig("FTX-1", "COM_TEST", 38400))
        audio = AudioTransmitter(TxAudioConfig(4, "Station USB DAC", 2, 1))
        ptt = PttController(cat, PttConfig(True, 14_200_000, 14_300_000, 30, 5), tx_audio=audio)
        agent = self.running(
            StationAgentHTTPServer(
                0,
                TokenAuthenticator({Role.ADMIN: self.link_token}),
                lambda: [],
                cat=cat,
                ptt=ptt,
                tls_context=server_tls_context(
                    self.ip_cert,
                    Path(self.directory.name) / "ipv4.key",
                    client_ca=self.cert,
                ),
            )
        )
        link = AgentLink(
            f"https://127.0.0.1:{agent.server_address[1]}",
            self.link_token,
            self.ip_cert,
            self.client_cert,
            self.client_key,
        )
        listener = "r" * 32
        host = self.running(
            CoordinatorHTTPServer(
                ("127.0.0.1", 0),
                TokenAuthenticator({Role.ADMIN: self.user_token, Role.LISTENER: listener}),
                DeterministicSimulator(),
                agent_link=link,
                tls_context=self.ip_context,
            )
        )
        client_context = ssl.create_default_context(cafile=self.ip_cert)
        origin = f"https://127.0.0.1:{host.server_address[1]}"
        with self.assertRaises(WebSocketError):
            connect_websocket(
                *host.server_address, context=client_context, origin="https://attacker.example"
            )
        with self.assertRaises(ssl.SSLCertVerificationError):
            connect_websocket(
                *host.server_address,
                context=ssl.create_default_context(cafile=self.cert),
                origin=origin,
            )
        with self.assertRaises(OSError):
            connect_websocket(*agent.server_address, context=client_context)
        for token in ("bad-token", listener):
            peer = connect_websocket(*host.server_address, context=client_context, origin=origin)
            try:
                peer.send_json({"token": token})
                self.assertEqual(json.loads(peer.receive())["event"], "error")
            finally:
                peer.close()
        self.assertEqual(port.writes, [])
        self.assertEqual(sd.opened, [])
        peer = connect_websocket(*host.server_address, context=client_context, origin=origin)
        peer.send_json({"token": self.user_token})
        prepared = json.loads(peer.receive(timeout=5))
        self.assertEqual(prepared["event"], "prepared")
        self.assertTrue(all(not any(block) for block in sd.output))
        finished = threading.Event()
        failures = []

        def capture():
            try:
                while not finished.is_set():
                    peer.send(b"\x34\x12" * 960)
                    sd.tick()
                    finished.wait(0.02)
            except (OSError, WebSocketError) as error:
                if not finished.is_set():
                    failures.append(type(error).__name__)

        producer = threading.Thread(target=capture)
        peer.send(b"\x34\x12" * 960)
        peer.send(b"\x34\x12" * 960)
        try:
            ready = json.loads(peer.receive())
            self.assertEqual(
                ready, {"event": "ready", "audio_session_id": prepared["audio_session_id"]}
            )
            producer.start()
            for payload in (
                {"operation": "stop"},
                {
                    "operation": "start",
                    "request_id": "tls-voice-start-request-0001",
                    "audio_session_id": ready["audio_session_id"],
                },
            ):
                connection = HTTPSConnection(
                    *host.server_address, context=client_context, timeout=5
                )
                try:
                    connection.request(
                        "POST",
                        "/api/v1/ptt",
                        body=json.dumps(payload),
                        headers={
                            "Authorization": f"Bearer {self.user_token}",
                            "Content-Type": "application/json",
                            "Origin": origin,
                        },
                    )
                    response = connection.getresponse()
                    self.assertEqual(response.status, 200, response.read())
                finally:
                    connection.close()
            self.assertEqual(port.tx, 1)
            self.assertEqual(sd.tick(), b"\0\0\x34\x12" * 960)
        finally:
            finished.set()
            peer.close()
            if producer.ident is not None:
                producer.join(3)
        self.assertFalse(producer.is_alive())
        self.assertEqual(failures, [])
        deadline = time.monotonic() + 1.5
        while port.tx and time.monotonic() < deadline:
            time.sleep(0.02)
        self.assertEqual(port.tx, 0)
        self.assertEqual(sd.tick(), bytes(3840))

    def test_malformed_https_agent_status_returns_an_explicit_proxy_error(self) -> None:
        class MalformedHandler(SecureRequestHandler):
            def do_GET(self):
                self.wfile.write(b"HTTP/1.1 INVALID status\r\n\r\n")
                self.close_connection = True

        agent = self.running(
            SecureHTTPServer(
                ("127.0.0.1", 0),
                MalformedHandler,
                tls_context=self.context,
            )
        )
        server = self.coordinator(agent)
        status, _, payload = self.request(server)
        self.assertEqual(status, 502)
        self.assertEqual(payload["error"]["code"], "station_agent_invalid_response")

    def test_untrusted_or_hostname_mismatched_agent_is_rejected_without_fallback(self) -> None:
        agent = self.agent()
        for hostname, ca in (("127.0.0.1", self.cert), ("localhost", None)):
            with self.subTest(hostname=hostname, trusted=ca is not None):
                server = self.running(
                    CoordinatorHTTPServer(
                        ("127.0.0.1", 0),
                        self.auth,
                        DeterministicSimulator(),
                        agent_link=AgentLink(
                            f"https://{hostname}:{agent.server_address[1]}",
                            self.link_token,
                            ca,
                        ),
                    )
                )
                status, _, payload = self.request(server)
                self.assertEqual(status, 502)
                self.assertEqual(payload["error"]["code"], "station_agent_tls_failed")

    def test_remote_plaintext_and_unsafe_origin_or_link_configuration_fail_closed(self) -> None:
        with self.assertRaises(ValueError):
            CoordinatorHTTPServer(("0.0.0.0", 0), self.auth, DeterministicSimulator())
        with self.assertRaises(ValueError):
            StationAgentHTTPServer(0, self.auth, lambda: [], host="0.0.0.0")
        for origin in ("*", "http://host.test", "https://host.test/path", "https://u@host.test"):
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                validate_client_origin(origin)
        for url in ("http://host.test", "https://u:p@host.test", "https://host.test/?token=x"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                AgentLink(url, self.link_token)
        with self.assertRaises(ValueError):
            AgentLink("https://host.test", "short")
        with self.assertRaises(ValueError):
            server_tls_context(self.cert, None)
        with self.assertRaises(ValueError):
            CoordinatorHTTPServer(
                ("127.0.0.1", 0),
                self.auth,
                DeterministicSimulator(),
                agent_link=AgentLink("https://localhost", self.user_token, self.cert),
            )

    def test_mtls_requires_a_trusted_client_before_http_and_keeps_bearer_roles(self) -> None:
        inventory_calls = []
        guest_token = "g" * 32
        agent = self.running(
            StationAgentHTTPServer(
                0,
                TokenAuthenticator({Role.ADMIN: self.link_token, Role.GUEST: guest_token}),
                lambda: inventory_calls.append(True) or [],
                tls_context=server_tls_context(
                    self.ip_cert, Path(self.directory.name) / "ipv4.key", client_ca=self.cert
                ),
            )
        )
        url = f"https://127.0.0.1:{agent.server_address[1]}"
        for client_cert, client_key in (
            (None, None),
            (self.ip_cert, Path(self.directory.name) / "ipv4.key"),
        ):
            link = AgentLink(url, self.link_token, self.ip_cert, client_cert, client_key)
            host = self.running(
                CoordinatorHTTPServer(
                    ("127.0.0.1", 0),
                    self.auth,
                    DeterministicSimulator(),
                    agent_link=link,
                )
            )
            status, _, error = self.request(host)
            self.assertEqual(status, 502)
            self.assertEqual(error["error"]["code"], "station_agent_tls_failed")
            self.assertEqual(inventory_calls, [])

        link = AgentLink(url, self.link_token, self.ip_cert, self.client_cert, self.client_key)
        for token, expected in ((None, 401), (self.user_token, 401), (guest_token, 403)):
            connection = HTTPSConnection(*agent.server_address, timeout=3, context=link.context())
            try:
                connection.request(
                    "GET",
                    "/api/v1/devices",
                    headers={} if token is None else {"Authorization": f"Bearer {token}"},
                )
                response = connection.getresponse()
                response.read()
                self.assertEqual(response.status, expected)
            finally:
                connection.close()
        self.assertEqual(inventory_calls, [])
        host = self.running(
            CoordinatorHTTPServer(
                ("127.0.0.1", 0),
                self.auth,
                DeterministicSimulator(),
                agent_link=link,
            )
        )
        self.assertEqual(self.request(host)[0], 200)
        self.assertEqual(inventory_calls, [True])

        wrong_name = AgentLink(
            f"https://localhost:{agent.server_address[1]}",
            self.link_token,
            self.ip_cert,
            self.client_cert,
            self.client_key,
        )
        host = self.running(
            CoordinatorHTTPServer(
                ("127.0.0.1", 0),
                self.auth,
                DeterministicSimulator(),
                agent_link=wrong_name,
            )
        )
        status, _, error = self.request(host)
        self.assertEqual(status, 502)
        self.assertEqual(error["error"]["code"], "station_agent_tls_failed")
        self.assertEqual(inventory_calls, [True])

    def test_mtls_partial_credentials_and_plaintext_configuration_fail_at_startup(self) -> None:
        with self.assertRaises(ValueError):
            server_tls_context(None, None, client_ca=self.cert)
        for cert, key in ((self.client_cert, None), (None, self.client_key)):
            with self.assertRaises(ValueError):
                AgentLink("https://localhost", self.link_token, self.cert, cert, key)
        with self.assertRaises(ssl.SSLError):
            AgentLink(
                "https://localhost", self.link_token, self.cert, self.client_cert, self.key
            ).context()
        with self.assertRaises(OSError):
            server_tls_context(self.cert, self.key, client_ca=Path(self.directory.name) / "missing")
        for parser, arguments in (
            (agent_args, ["--tls-client-ca", "clients.pem"]),
            (coordinator_args, ["--station-agent-client-cert", "client.pem"]),
            (
                coordinator_args,
                [
                    "--station-agent-client-cert",
                    "client.pem",
                    "--station-agent-client-key",
                    "key.pem",
                ],
            ),
        ):
            with patch("sys.stderr"), self.assertRaises(SystemExit) as error:
                parser(arguments)
            self.assertEqual(error.exception.code, 2)

    def test_request_logs_do_not_include_authorization_or_query_secrets(self) -> None:
        agent = self.agent()
        server = self.coordinator(agent)
        with self.assertLogs("bricoham.http", level="INFO") as logs:
            status, _, _ = self.request(server, "/api/v1/devices?token=hidden_query_secret")
        self.assertEqual(status, 200)
        self.assertNotIn(self.user_token, "\n".join(logs.output))
        self.assertNotIn(self.link_token, "\n".join(logs.output))
        self.assertNotIn("hidden_query_secret", "\n".join(logs.output))

    def test_https_cors_allows_only_explicit_origins_headers_and_methods(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            server = self.running(
                CoordinatorHTTPServer(
                    ("127.0.0.1", 0),
                    self.auth,
                    DeterministicSimulator(),
                    tls_context=self.context,
                    client_origins=("https://localhost",),
                    logbook_database=Path(directory) / "contacts.sqlite3",
                )
            )
            client_context = ssl.create_default_context(cafile=self.cert)
            for origin, headers, method, path, expected in (
                ("https://localhost", "Authorization", "GET", "/api/v1/devices", 200),
                ("https://evil.test", "Authorization", "GET", "/api/v1/devices", 403),
                ("https://localhost", "X-Unsafe", "GET", "/api/v1/devices", 403),
                ("https://localhost", "Authorization", "POST", "/api/v1/cat", 403),
                (
                    "https://localhost",
                    "Authorization, Content-Type",
                    "POST",
                    "/api/v1/logbook",
                    200,
                ),
                (
                    "https://localhost",
                    "Authorization, Content-Type",
                    "POST",
                    "/api/v1/rotor",
                    200,
                ),
                (
                    "https://localhost",
                    "Authorization, Content-Type",
                    "POST",
                    "/api/v1/radio-settings",
                    200,
                ),
                ("https://localhost", "Authorization", "GET", "/healthz", 403),
            ):
                with self.subTest(origin=origin, headers=headers, method=method, path=path):
                    connection = HTTPSConnection(
                        "localhost",
                        server.server_address[1],
                        context=client_context,
                        timeout=3,
                    )
                    try:
                        connection.request(
                            "OPTIONS",
                            path,
                            headers={
                                "Origin": origin,
                                "Access-Control-Request-Headers": headers,
                                "Access-Control-Request-Method": method,
                            },
                        )
                        response = connection.getresponse()
                        response.read()
                        self.assertEqual(response.status, expected)
                        self.assertEqual(
                            response.getheader("Access-Control-Allow-Origin"),
                            origin if origin == "https://localhost" else None,
                        )
                    finally:
                        connection.close()
            # Export also needs CORS headers; JSON response helpers are not used here.
            connection = HTTPSConnection(
                "localhost",
                server.server_address[1],
                context=client_context,
                timeout=3,
            )
            try:
                connection.request(
                    "GET",
                    "/api/v1/logbook/adif",
                    headers={
                        "Origin": "https://localhost",
                        "Authorization": f"Bearer {self.user_token}",
                    },
                )
                response = connection.getresponse()
                response.read()
                self.assertEqual(response.status, 200)
                self.assertEqual(
                    response.getheader("Access-Control-Allow-Origin"), "https://localhost"
                )
            finally:
                connection.close()
            server.shutdown()
            server.server_close()

    def test_stalled_tls_handshake_does_not_block_other_clients(self) -> None:
        agent = self.agent()
        with socket.create_connection(agent.server_address, timeout=2):
            client_context = ssl.create_default_context(cafile=self.cert)
            connection = HTTPSConnection(
                "localhost",
                agent.server_address[1],
                context=client_context,
                timeout=2,
            )
            try:
                connection.request("GET", "/healthz")
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                response.read()
            finally:
                connection.close()
