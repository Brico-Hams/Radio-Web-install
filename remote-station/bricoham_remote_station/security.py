import hmac
import os
from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum

MIN_TOKEN_LENGTH = 32


class Role(StrEnum):
    ADMIN = "admin"
    OPERATOR = "operator"
    LISTENER = "listener"
    GUEST = "guest"
    DIAGNOSTIC_REPORTER = "diagnostic_reporter"


@dataclass(frozen=True)
class TokenAuthenticator:
    tokens: Mapping[Role, str]

    @classmethod
    def from_environment(cls) -> "TokenAuthenticator":
        variables = {
            Role.ADMIN: "BRICOHAM_ADMIN_TOKEN",
            Role.OPERATOR: "BRICOHAM_OPERATOR_TOKEN",
            Role.LISTENER: "BRICOHAM_LISTENER_TOKEN",
            Role.GUEST: "BRICOHAM_GUEST_TOKEN",
            Role.DIAGNOSTIC_REPORTER: "BRICOHAM_DIAGNOSTIC_REPORTER_TOKEN",
        }
        tokens = {
            role: os.environ[name] for role, name in variables.items() if os.environ.get(name)
        }
        if Role.ADMIN not in tokens:
            raise ValueError("BRICOHAM_ADMIN_TOKEN es obligatorio.")
        return cls(tokens)

    def __post_init__(self) -> None:
        for role, token in self.tokens.items():
            if len(token) < MIN_TOKEN_LENGTH or token.strip() != token or not token.isascii():
                raise ValueError(
                    f"El token de {role.value} debe tener al menos "
                    f"{MIN_TOKEN_LENGTH} caracteres ASCII y no llevar espacios externos."
                )
        configured_tokens = list(self.tokens.values())
        if len(set(configured_tokens)) != len(configured_tokens):
            raise ValueError("Cada rol debe tener un token distinto.")

    def authenticate(self, authorization: str | None) -> Role | None:
        if authorization is None:
            return None
        scheme, separator, candidate = authorization.partition(" ")
        if (
            scheme.lower() != "bearer"
            or not separator
            or not candidate
            or candidate.strip() != candidate
            or not candidate.isascii()
        ):
            return None

        matched_role: Role | None = None
        for role, expected in self.tokens.items():
            if hmac.compare_digest(candidate, expected):
                matched_role = role
        return matched_role
