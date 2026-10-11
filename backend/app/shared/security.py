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


def hash_one_time_token(token: str) -> str:
    """
    Return a one-way digest suitable for storing high-entropy one-time tokens.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


_TOTP_CIPHERTEXT_PREFIX = "enc:v1:"


def _totp_fernet():
    try:
        from cryptography.fernet import Fernet
    except ImportError as exc:
        raise RuntimeError("cryptography is required to protect TOTP secrets") from exc

    key = settings.TOTP_ENCRYPTION_KEY
    if not key:
        key = base64.urlsafe_b64encode(
            hashlib.sha256(b"nottex:totp:v1:" + settings.SECRET_KEY.encode("utf-8")).digest()
        ).decode("ascii")
    return Fernet(key.encode("ascii"))


def encrypt_totp_secret(secret: str) -> str:
    if secret.startswith(_TOTP_CIPHERTEXT_PREFIX):
        return secret
    ciphertext = _totp_fernet().encrypt(secret.encode("utf-8")).decode("ascii")
    return f"{_TOTP_CIPHERTEXT_PREFIX}{ciphertext}"


def decrypt_totp_secret(secret: str) -> str:
    if not secret.startswith(_TOTP_CIPHERTEXT_PREFIX):
        return secret
    from cryptography.fernet import InvalidToken

    try:
        encrypted_value = secret[len(_TOTP_CIPHERTEXT_PREFIX):].encode("ascii")
        return _totp_fernet().decrypt(encrypted_value).decode("utf-8")
    except (InvalidToken, UnicodeDecodeError, ValueError) as exc:
        raise RuntimeError("Unable to decrypt stored TOTP secret; check TOTP_ENCRYPTION_KEY") from exc


async def migrate_legacy_totp_secrets(users_collection) -> int:
    """Encrypt pre-existing plaintext TOTP seeds before the API becomes ready."""
    cursor = users_collection.find(
        {"$or": [{"totp_secret": {"$type": "string"}}, {"pending_totp_secret": {"$type": "string"}}]},
        {"totp_secret": 1, "pending_totp_secret": 1},
    )
    migrated = 0
    async for user in cursor:
        updates = {}
        originals = {}
        for field in ("totp_secret", "pending_totp_secret"):
            value = user.get(field)
            if isinstance(value, str) and not value.startswith(_TOTP_CIPHERTEXT_PREFIX):
                updates[field] = encrypt_totp_secret(value)
                originals[field] = value
        if updates:
            selector = {"_id": user["_id"], **originals}
            result = await users_collection.update_one(selector, {"$set": updates})
            migrated += result.modified_count
    if migrated:
        logger.warning("Encrypted legacy plaintext TOTP secrets during startup: %s", migrated)
    return migrated


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


def generate_totp_secret() -> str:
    """
    Generates a secure random 32-character base32 secret for TOTP.
    """
    try:
        import pyotp
        return pyotp.random_base32()
    except ImportError:
        random_bytes = secrets.token_bytes(20)
        return base64.b32encode(random_bytes).decode("utf-8").replace("=", "")


def get_totp_uri(secret: str, email: str, issuer: Optional[str] = None) -> str:
    """
    Generates the otpauth:// URI string for QR code generation.
    """
    app_name = issuer or settings.APP_NAME
    try:
        import pyotp
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=app_name)
    except ImportError:
        from urllib.parse import quote
        safe_issuer = quote(app_name)
        safe_email = quote(email)
        return f"otpauth://totp/{safe_issuer}:{safe_email}?secret={secret}&issuer={safe_issuer}&algorithm=SHA1&digits=6&period=30"


def verify_totp_code(secret: str, code: str, valid_window: int = 1) -> bool:
    """
    Verifies a 6-digit TOTP code against the secret key.
    Allows a time window (valid_window=1 permits +/- 30 seconds drift).
    """
    clean_code = str(code).strip()
    if not clean_code.isdigit() or len(clean_code) != 6:
        return False

    try:
        import pyotp
        totp = pyotp.TOTP(secret)
        return bool(totp.verify(clean_code, valid_window=valid_window))
    except ImportError:
        import struct
        import time

        curr_time = int(time.time()) // 30
        try:
            padded_secret = secret.upper()
            padding = "=" * ((8 - len(padded_secret) % 8) % 8)
            key = base64.b32decode(padded_secret + padding)
        except Exception:
            return False

        for offset in range(-valid_window, valid_window + 1):
            time_step = curr_time + offset
            msg = struct.pack(">Q", time_step)
            h = hmac.new(key, msg, hashlib.sha1).digest()
            o = h[19] & 15
            token_int = (struct.unpack(">I", h[o : o + 4])[0] & 0x7FFFFFFF) % 1000000
            token_str = str(token_int).zfill(6)
            if hmac.compare_digest(token_str, clean_code):
                return True

        return False

