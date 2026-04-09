"""JWT verification (RSA RS256), aligned with core-service security module."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import PyJWTError

ACCESS_TOKEN_TYPE = "ACCESS_TOKEN"
ALGORITHMS = ["RS256"]

_public_key_pem: str | None = None


def warmup_jwt_public_key(path: str) -> None:
    """Load PEM at startup; raises RuntimeError if the file is missing."""
    global _public_key_pem
    resolved = Path(path)
    if not resolved.is_file():
        raise RuntimeError(
            f"JWT public key file not found: {path}. "
            "Set JWT_PUBLIC_KEY_PATH or run AnaliticsService/scripts/generate-jwt-keys.sh"
        )
    _public_key_pem = resolved.read_text(encoding="utf-8")


def _get_public_key() -> str:
    if _public_key_pem is None:
        raise RuntimeError("JWT public key not loaded; call warmup_jwt_public_key at startup")
    return _public_key_pem


@dataclass(frozen=True)
class CurrentUser:
    sub: str
    role: str
    id: int | None


def _normalize_role(role: str) -> str:
    r = role.strip().upper()
    if r == "ADMIN":
        return "SUPERUSER"
    return r


def _decode_access_token(token: str) -> CurrentUser:
    try:
        payload = jwt.decode(
            token,
            _get_public_key(),
            algorithms=ALGORITHMS,
            options={"require": ["exp", "sub"]},
        )
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    if payload.get("token_type") != ACCESS_TOKEN_TYPE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role_raw = payload.get("role")
    if not isinstance(role_raw, str) or not role_raw.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing role in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")
    if not isinstance(sub, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    uid = payload.get("id")
    user_id: int | None
    if uid is None:
        user_id = None
    elif isinstance(uid, bool):
        user_id = None
    elif isinstance(uid, int):
        user_id = uid
    else:
        try:
            user_id = int(uid)
        except (TypeError, ValueError):
            user_id = None

    return CurrentUser(sub=sub, role=_normalize_role(role_raw), id=user_id)


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _decode_access_token(credentials.credentials)


def require_roles(*allowed: str) -> Callable[..., CurrentUser]:
    allowed_set = {_normalize_role(r) for r in allowed}

    async def _dep(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
        if user.role == "SUPERUSER":
            return user
        if user.role not in allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _dep
