"""
Credential protection.

Qualys passwords/tokens are NEVER stored in plaintext and NEVER sent back
to the browser. They are encrypted at rest with a Fernet key that lives
only in the backend's environment (.env), separate from the database file.
"""
from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _get_fernet() -> Fernet:
    key = settings.credential_encryption_key
    if not key:
        raise RuntimeError(
            "CREDENTIAL_ENCRYPTION_KEY is not set. Generate one with:\n"
            "  python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"\n"
            "and put it in backend/.env"
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_secret(plaintext: str) -> str:
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    f = _get_fernet()
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise RuntimeError("Could not decrypt stored Qualys credential. Was the encryption key rotated?") from exc
