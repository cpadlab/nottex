import hmac
import hashlib
import json
import base64
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from app.core.config import settings
from app.shared.logger import get_logger

logger = get_logger(__name__)

try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError
    from argon2.low_level import Type

    _argon2_hasher = PasswordHasher(
        time_cost=2,
        memory_cost=65536,
        parallelism=1,
        hash_len=32,
        salt_len=16,
        type=Type.ID,
    )

except ImportError:
    _argon2_hasher = None
    logger.warning("argon2-cffi not installed. Please install argon2-cffi for production Argon2id hashing.")


def hash_password(password: str) -> str:
    """
    Hashes a password using Argon2id.
    Falls back to PBKDF2-HMAC-SHA256 if argon2-cffi is not yet installed.
    """
    if _argon2_hasher is not None:
        return _argon2_hasher.hash(password)

    salt = secrets.token_hex(16)
    kdf = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"pbkdf2:sha256:100000${salt}${kdf.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against an Argon2id (or fallback) hash.
    """
    if _argon2_hasher is not None and not hashed_password.startswith("pbkdf2:"):
        try:
            return _argon2_hasher.verify(hashed_password, plain_password)
        except Exception:
            return False

    if hashed_password.startswith("pbkdf2:"):
        try:
            _, _, salt, stored_hash = hashed_password.split("$")
            kdf = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
            return hmac.compare_digest(kdf.hex(), stored_hash)
        except Exception:
            return False

    return False


def generate_verification_token() -> str:
    """
    Generates a secure, single-use URL-safe token for email verification.
    """
    return secrets.token_urlsafe(32)


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a JWT access token using HMAC-SHA256.
    """
    try:
        import jwt
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    except ImportError:
        to_encode = data.copy()
        expire = int((datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))).timestamp())
        to_encode.update({"exp": expire})

        header = {"alg": "HS256", "typ": "JWT"}
        header_b64 = _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        payload_b64 = _base64url_encode(json.dumps(to_encode, separators=(",", ":")).encode("utf-8"))

        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        sig_b64 = _base64url_encode(signature)

        return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a JWT access token.
    Returns the payload dictionary if valid and not expired, None otherwise.
    """
    try:
        import jwt
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except ImportError:
        try:
            parts = token.split(".")
            if len(parts) != 3:
                return None

            header_b64, payload_b64, sig_b64 = parts
            signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
            expected_sig = _base64url_encode(
                hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
            )
            if not hmac.compare_digest(sig_b64, expected_sig):
                return None

            payload_bytes = _base64url_decode(payload_b64)
            payload = json.loads(payload_bytes.decode("utf-8"))

            exp = payload.get("exp")
            if exp:
                now_ts = int(datetime.now(timezone.utc).timestamp())
                if now_ts > exp:
                    return None

            return payload
        except Exception:
            return None
    except Exception:
        return None

