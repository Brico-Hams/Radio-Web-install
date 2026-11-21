import unittest
from unittest.mock import patch

from bricoham_remote_station.security import MIN_TOKEN_LENGTH, Role, TokenAuthenticator

ADMIN_TOKEN = "a" * MIN_TOKEN_LENGTH
LISTENER_TOKEN = "b" * MIN_TOKEN_LENGTH


class TokenAuthenticatorTests(unittest.TestCase):
    def test_admin_token_is_required_from_environment(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaisesRegex(ValueError, "BRICOHAM_ADMIN_TOKEN"):
                TokenAuthenticator.from_environment()

    def test_short_and_duplicate_tokens_are_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "al menos"):
            TokenAuthenticator({Role.ADMIN: "too-short"})
        with self.assertRaisesRegex(ValueError, "ASCII"):
            TokenAuthenticator({Role.ADMIN: "á" * MIN_TOKEN_LENGTH})
        with self.assertRaisesRegex(ValueError, "distinto"):
            TokenAuthenticator({Role.ADMIN: ADMIN_TOKEN, Role.LISTENER: ADMIN_TOKEN})

    def test_authentication_requires_bearer_scheme_and_exact_secret(self) -> None:
        auth = TokenAuthenticator({Role.ADMIN: ADMIN_TOKEN})
        self.assertEqual(auth.authenticate(f"Bearer {ADMIN_TOKEN}"), Role.ADMIN)
        self.assertIsNone(auth.authenticate(ADMIN_TOKEN))
        self.assertIsNone(auth.authenticate(f"Bearer {ADMIN_TOKEN}x"))
        self.assertIsNone(auth.authenticate(f"Bearer {ADMIN_TOKEN} "))
        self.assertIsNone(auth.authenticate(f"Bearer {'á' * MIN_TOKEN_LENGTH}"))
        self.assertIsNone(auth.authenticate(None))

    def test_tokens_map_to_distinct_roles(self) -> None:
        auth = TokenAuthenticator({Role.ADMIN: ADMIN_TOKEN, Role.LISTENER: LISTENER_TOKEN})
        self.assertEqual(auth.authenticate(f"Bearer {LISTENER_TOKEN}"), Role.LISTENER)


if __name__ == "__main__":
    unittest.main()
