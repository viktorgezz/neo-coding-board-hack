"""Низкоуровневый клиент GigaChat OAuth + chat completions."""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

_SERVICE_ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv() -> None:
    """Подгружает `AnaliticsService/.env` в `os.environ` (для запуска скрипта не из корня сервиса)."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(_SERVICE_ROOT / ".env")


_load_dotenv()


def _parse_json_response(response: requests.Response, what: str) -> Any:
    """Проверяет HTTP-статус и парсит JSON; иначе выбрасывает исключение с телом ответа."""
    try:
        response.raise_for_status()
    except requests.HTTPError as e:
        body = (response.text or "")[:4000]
        raise requests.HTTPError(
            f"{what}: HTTP {response.status_code} для {response.url!r}. Тело: {body!r}"
        ) from e
    raw = (response.text or "").strip()
    if not raw:
        raise ValueError(
            f"{what}: пустое тело ответа (HTTP {response.status_code}, URL {response.url!r}). "
            "Проверьте ключ, scope и доступность API."
        )
    try:
        return response.json()
    except ValueError as err:
        raise ValueError(
            f"{what}: ответ не JSON (HTTP {response.status_code}). Начало тела: {raw[:800]!r}"
        ) from err


@dataclass
class GigaChatSettings:
    """Параметры запросов к GigaChat (ключ лучше задать через переменную окружения GIGACHAT_AUTH_KEY)."""

    auth_key: str = ""
    chat_url: str = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"
    model: str = "GigaChat"
    max_tokens: int = 512

    def __post_init__(self) -> None:
        if not self.auth_key:
            self.auth_key = os.environ.get("GIGACHAT_AUTH_KEY", "").strip()


class GigaChatClient:
    """Получение access token и вызов чата GigaChat."""

    def __init__(self) -> None:
        self.settings = GigaChatSettings()
        self._url_chat: str | None = None
        self._headers_chat: dict[str, str] | None = None

    def _ensure_chat_session(self) -> None:
        """Ленивая OAuth-авторизация перед первым запросом к чату (без ключа — ValueError)."""
        if self._headers_chat is not None:
            return
        if not self.settings.auth_key:
            raise ValueError(
                "Не задан ключ GigaChat: укажите GIGACHAT_AUTH_KEY в окружении или в GigaChatSettings.auth_key"
            )
        access_token = self.get_access_token(self.settings.auth_key)
        self._url_chat = self.settings.chat_url
        self._headers_chat = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {access_token}",
        }

    @staticmethod
    def get_access_token(auth_key: str) -> str:
        """Запрашивает OAuth access_token по Basic auth."""
        url = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
        payload = {"scope": "GIGACHAT_API_PERS"}
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "RqUID": str(uuid.uuid4()),
            "Authorization": f"Basic {auth_key}",
        }
        response = requests.post(url, headers=headers, data=payload, verify=False, timeout=60)
        data = _parse_json_response(response, "OAuth GigaChat")
        token = data.get("access_token") if isinstance(data, dict) else None
        if not token:
            raise ValueError(f"OAuth: в ответе нет access_token: {data!r}")
        return str(token)

    def ask_ai(self, messages: list[dict[str, str]]) -> Any:
        """Отправляет сообщения в чат; возвращает распарсенный JSON ответа API."""
        self._ensure_chat_session()
        url_chat = self._url_chat
        headers_chat = self._headers_chat
        if not url_chat or not headers_chat:
            raise RuntimeError("GigaChat: сессия не инициализирована")
        payload_chat = {
            "model": self.settings.model,
            "messages": messages,
            "max_tokens": self.settings.max_tokens,
        }
        response = requests.post(
            url_chat,
            headers=headers_chat,
            json=payload_chat,
            verify=False,
            timeout=120,
        )
        return _parse_json_response(response, "GigaChat chat")
