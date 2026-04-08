import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
from database import get_db
from schemas import (
    AISummaryResponse,
    CandidateReport,
    InterviewerAssessment,
    SessionHistory,
)
from services.get_metrics import GetMetrics

router = APIRouter()


@router.post("/api/v1/rooms/{idRoom}/history", status_code=201, tags=["Data Ingestion"])
def save_history(
    idRoom: uuid.UUID,
    history: SessionHistory,
    session: Session = Depends(get_db),
):
    """Принимает данные от внешнего сервиса и сохраняет их"""
    crud.save_room_history(session, idRoom, history)
    return {"message": "Data successfully imported"}

@router.post("/api/v1/rooms/{idRoom}/metrics/increment-paste", tags=["Real-time Metrics"])
def increment_paste(idRoom: uuid.UUID, session: Session = Depends(get_db)):
    current = crud.increment_pastes(session, idRoom)
    return {"current_pastes": current}

@router.post("/api/v1/rooms/{idRoom}/metrics/increment-tab-switch", tags=["Real-time Metrics"])
def increment_tab_switch(idRoom: uuid.UUID, session: Session = Depends(get_db)):
    current = crud.increment_switches(session, idRoom)
    return {"current_switches": current}

@router.post("/api/v1/rooms/{idRoom}/interviewer-assessment", tags=["Reports & AI"])
def save_assessment(
    idRoom: uuid.UUID,
    assessment: InterviewerAssessment,
    session: Session = Depends(get_db),
):
    crud.save_assessment(session, idRoom, assessment)
    return {"message": "Assessment saved"}

@router.get("/api/v1/rooms/{idRoom}/candidate-report", response_model=CandidateReport, tags=["Reports & AI"])
def get_report(idRoom: uuid.UUID, session: Session = Depends(get_db)):
    """Отчёт: таймлайн и сложность считаются по сессии, radar — из БД, comparative — по пиру-комнатам."""
    payload = GetMetrics(session, idRoom).get_candidate_report()
    return CandidateReport.model_validate(payload)

@router.get("/api/v1/rooms/{idRoom}/ai-summary", response_model=AISummaryResponse, tags=["Reports & AI"])
def get_ai_summary(idRoom: uuid.UUID, session: Session = Depends(get_db)):
    """ИИ-анализ (Заглушка)"""
    # Здесь будет вызов LangChain или SDK GigaChat/YandexGPT
    summary = AISummaryResponse(
        positivePoints=["Использовал современные конструкции Kotlin"],
        negativePoints=["Подозрение на плагиат: резкий скачок сложности при Paste"],
        aiRecommendation="Не рекомендуется к найму из-за аномального поведения."
    )
    crud.save_ai_summary(session, idRoom, summary)
    return summary
