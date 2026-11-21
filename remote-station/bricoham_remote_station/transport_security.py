import ipaddress
import re
import ssl
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit


def server_tls_context(
    cert: Path | None, key: Path | None, *, client_ca: Path | None = None
) -> ssl.SSLContext | None:
    if (cert is None) != (key is None):
        raise ValueError("TLS requiere certificado y clave privada juntos.")
    if cert is None:
        if client_ca is not None:
            raise ValueError("mTLS requiere certificado y clave TLS del servidor.")
        return None
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(cert, key, password="")
    if client_ca is not None:
        context.load_verify_locations(cafile=client_ca)
        context.verify_mode = ssl.CERT_REQUIRED
    return context


def validate_listen(host: str, context: ssl.SSLContext | None) -> None:
    address = ipaddress.IPv4Address(host)
    if not address.is_loopback and context is None:
        raise ValueError("La escucha fuera de loopback requiere TLS; HTTP remoto está prohibido.")


def validate_client_origin(origin: str) -> str:
    parsed = urlsplit(origin)
    if (
        parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or parsed.path
        or not parsed.hostname
        or parsed.scheme not in ("https", "capacitor")
        or (parsed.scheme == "capacitor" and parsed.netloc != "localhost")
        or origin != f"{parsed.scheme}://{parsed.netloc}"
        or "*" in origin
        or not origin.isascii()
        or (parsed.port is not None and not 1 <= parsed.port <= 65535)
    ):
        raise ValueError("El origen debe ser HTTPS exacto o capacitor://localhost; no admite '*'.")
    return origin


@dataclass(frozen=True)
class AgentLink:
    url: str
    token: str = field(repr=False)
    ca_file: Path | None = None
    client_cert: Path | None = None
    client_key: Path | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        if (self.client_cert is None) != (self.client_key is None):
            raise ValueError("mTLS requiere certificado y clave del cliente juntos.")
        parsed = urlsplit(self.url)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.path not in ("", "/")
            or parsed.query
            or parsed.fragment
            or parsed.username is not None
            or parsed.password is not None
            or (parsed.port is not None and not 1 <= parsed.port <= 65535)
            or self.url != f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        ):
            raise ValueError("El agente requiere URL base HTTPS, sin credenciales ni ruta.")
        if re.fullmatch(r"[A-Za-z0-9._~-]{32,512}", self.token) is None:
            raise ValueError("Configura token dedicado de enlace: 32 a 512 caracteres seguros.")

    def context(self) -> ssl.SSLContext:
        context = ssl.create_default_context(cafile=self.ca_file)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        if self.client_cert is not None:
            context.load_cert_chain(self.client_cert, self.client_key, password="")
        return context
