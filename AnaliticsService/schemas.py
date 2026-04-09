from datetime import datetime
from typing import List
from pydantic import BaseModel, Field

# --- Схемы данных (Schemas) ---

class CodeSnapshot(BaseModel):
    timestamp: str
    code: str
    language: str

class InterviewerNote(BaseModel):
    timestamp: str
    text: str

class SessionHistory(BaseModel):
    startTime: datetime
    endTime: datetime
    codeSnapshots: List[CodeSnapshot]
    interviewerNotes: List[InterviewerNote]

class InterviewerAssessment(BaseModel):
    systemDesign: int = Field(ge=1, le=5)
    codeReadability: int = Field(ge=1, le=5)
    communicationSkills: int = Field(ge=1, le=5)
    coachability: int = Field(ge=1, le=5)
    verdict: str # PASSED, FAILED

class TimelineEvent(BaseModel):
    timestamp: str
    type: str # PASTE, TAB_SWITCH, NOTE
    label: str

class ComplexityPoint(BaseModel):
    timestamp: str
    complexity: int

class RadarMetrics(BaseModel):
    systemDesign: int
    codeReadability: int
    communication: int
    coachability: int
    technicalScore: int
    integrity: int

class CurvePoint(BaseModel):
    x: float
    y: float

class Comparative(BaseModel):
    candidateZScore: float
    percentile: int
    distributionCurve: List[CurvePoint]

class CandidateReport(BaseModel):
    summary: dict
    timelineEvents: List[TimelineEvent]
    complexityTrend: List[ComplexityPoint]
    radarMetrics: RadarMetrics
    comparative: Comparative

class AISummaryResponse(BaseModel):
    positivePoints: List[str]
    negativePoints: List[str]
    aiRecommendation: str
