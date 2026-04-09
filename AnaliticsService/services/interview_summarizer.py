"""Генерация AI-резюме интервью поверх клиента GigaChat."""

from __future__ import annotations

import json
import uuid
from typing import Any, TypedDict

from sqlalchemy.orm import Session

from schemas import AISummaryResponse, CandidateReport
from .giga_chat_client import GigaChatClient
from .get_metrics import GetMetrics


class SummaryResponse(TypedDict):
    """Нормализованный ответ AI-резюме для API/CLI."""

    positivePoints: list[str]
    negativePoints: list[str]
    aiRecommendation: str


class InterviewSummarizer(GigaChatClient):
    """Генерирует краткое резюме по отчёту собеседования."""

    SYSTEM_PROMPT = (
    """Ты — экспертный технический рекрутер и аналитик данных в IT-компании. Твоя задача — анализировать результаты технических интервью с платформы Live Coding и формировать структурированное резюме для HR-департамента.

    ### ВХОДНЫЕ ДАННЫЕ:
    Тебе будет передан JSON-объект, содержащий:
    1. `summary`: Общая информация о сессии и вердикт интервьюера.
    2. `timelineEvents`: Хронологический список событий (заметки интервьюера, вставки кода Paste, переключения вкладок Tab Switch).
    3. `complexityTrend`: Динамика изменения сложности кода во времени.
    4. `radarMetrics`: Оценки hard и soft skills по 5-балльной шкале.
    5. `comparative`: Статистические показатели (Z-Score) относительно других кандидатов.

    ### ТВОЯ ЗАДАЧА:
    На основе анализа данных выдели ключевые позитивные и негативные моменты.

    ОСОБЫЕ ПРАВИЛА АНАЛИЗА:
    - Основной акцент делай на заметках интервьюера
    - Сопоставляй время событий. Если подозрительная активность (Paste) произошла ПОСЛЕ того, как интервьюер оставил финальную положительную заметку, не акцентируй на этом внимание как на попытке обмана.
    - Обращай внимание на "молчаливые паузы" в Timeline и сопоставляй их с техническим прогрессом.
    - Сделай анализ оценок интервьюера
    - Анализируй Z-оценку (для сопоставления с другими кандидатами)

    ### ФОРМАТ ОТВЕТА (СТРОГИЙ JSON):
    {
        "positivePoints": ["список из 3-5 конкретных сильных сторон"],
        "negativePoints": ["список из 1-3 слабых сторон или зон риска"],
        "aiRecommendation": "итоговое заключение в несколько предложений"
    }"""
    )

    @staticmethod
    def _normalize_summary(raw: dict[str, Any]) -> SummaryResponse:
        """Приводит ответ модели к ожидаемой схеме и подставляет безопасные значения по умолчанию."""
        aliases = {
            "positivePoints": ("positivePoints", "positive_points", "positives", "strongPoints"),
            "negativePoints": ("negativePoints", "negative_points", "negatives", "weakPoints"),
            "aiRecommendation": ("aiRecommendation", "ai_recommendation", "recommendation", "verdict"),
        }

        def pick(*names: str) -> Any:
            for n in names:
                if n in raw:
                    return raw[n]
            return None

        pos_raw = pick(*aliases["positivePoints"])
        neg_raw = pick(*aliases["negativePoints"])
        rec_raw = pick(*aliases["aiRecommendation"])

        positive = [str(x) for x in (pos_raw or [])] if isinstance(pos_raw, list) else []
        negative = [str(x) for x in (neg_raw or [])] if isinstance(neg_raw, list) else []
        recommendation = str(rec_raw).strip() if rec_raw is not None else ""

        if not recommendation:
            recommendation = "Недостаточно данных для рекомендации."

        return {
            "positivePoints": positive,
            "negativePoints": negative,
            "aiRecommendation": recommendation,
        }

    def get_summary(self, interview_data: dict[str, Any]) -> SummaryResponse:
        """Принимает JSON отчёта, отправляет в AI и возвращает структурированный ответ."""
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Проанализируй данные этого интервью и верни JSON: "
                    f"{json.dumps(interview_data, ensure_ascii=False)}"
                ),
            },
        ]

        raw_response = self.ask_ai(messages)

        content = ""
        try:
            content = raw_response["choices"][0]["message"]["content"]
            clean_json = content.strip().replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean_json)
            if not isinstance(parsed, dict):
                raise ValueError(f"Ожидался JSON-объект, получено: {type(parsed).__name__}")
            return self._normalize_summary(parsed)
        except (KeyError, IndexError, ValueError) as e:
            raise ValueError(f"Ошибка при обработке ответа AI: {e}. Содержимое: {content}")

    def get_summary_by_room_id(self, session: Session, room_id: uuid.UUID) -> AISummaryResponse:
        """Достаёт candidate-report по `room_id`, отправляет в AI и возвращает валидированный `AISummaryResponse`."""
        report_payload = GetMetrics(session, room_id).get_candidate_report()
        report = CandidateReport.model_validate(report_payload)
        summary = self.get_summary(report.model_dump())
        return AISummaryResponse.model_validate(summary)
