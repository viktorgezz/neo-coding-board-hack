from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Literal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, ValidationError


UserRole = Literal["candidate", "interviewer"]

MAX_TEXT_BYTES = 512 * 1024


class CodeIn(BaseModel):
    text_content: str = Field(max_length=MAX_TEXT_BYTES)
    id_language: str = Field(default="", max_length=256)


class CodeUpdateOut(BaseModel):
    type: Literal["update"] = "update"
    text_content: str
    id_language: str
    version: int
    from_role: UserRole
    timestamp: float


class CodeSnapshotOut(BaseModel):
    type: Literal["snapshot"] = "snapshot"
    text_content: str
    id_language: str
    version: int


@dataclass
class RoomCodeState:
    text_content: str = ""
    id_language: str = ""
    version: int = 0


@dataclass
class Participant:
    websocket: WebSocket
    role: UserRole


class ConnectionManager:
    def __init__(self) -> None:
        self.rooms: dict[str, list[Participant]] = {}
        self.room_state: dict[str, RoomCodeState] = {}
        self.session_started_at: dict[str, float] = {}

    def _ensure_room_state(self, interview_id: str) -> RoomCodeState:
        if interview_id not in self.room_state:
            self.room_state[interview_id] = RoomCodeState()
        return self.room_state[interview_id]

    async def connect(self, interview_id: str, websocket: WebSocket, role: UserRole) -> Participant:
        await websocket.accept()
        participant = Participant(websocket=websocket, role=role)
        self.rooms.setdefault(interview_id, []).append(participant)
        self.session_started_at.setdefault(interview_id, time.monotonic())
        self._ensure_room_state(interview_id)
        return participant

    def disconnect(self, interview_id: str, participant: Participant) -> None:
        room_participants = self.rooms.get(interview_id)
        if room_participants is None:
            return
        if participant in room_participants:
            room_participants.remove(participant)
        if not room_participants:
            self.rooms.pop(interview_id, None)
            self.session_started_at.pop(interview_id, None)
            self.room_state.pop(interview_id, None)

    def room_elapsed(self, interview_id: str) -> float:
        started_at = self.session_started_at.get(interview_id)
        if started_at is None:
            return 0.0
        return round(time.monotonic() - started_at, 3)

    def apply_code_update(self, interview_id: str, payload: CodeIn) -> int:
        state = self._ensure_room_state(interview_id)
        state.text_content = payload.text_content
        state.id_language = payload.id_language
        state.version += 1
        return state.version

    def snapshot(self, interview_id: str) -> CodeSnapshotOut:
        state = self._ensure_room_state(interview_id)
        return CodeSnapshotOut(
            text_content=state.text_content,
            id_language=state.id_language,
            version=state.version,
        )

    async def broadcast_to_others(
        self,
        interview_id: str,
        sender: Participant,
        payload: CodeUpdateOut,
    ) -> None:
        for participant in list(self.rooms.get(interview_id, [])):
            if participant is sender:
                continue
            try:
                await participant.websocket.send_json(payload.model_dump())
            except Exception:
                self.disconnect(interview_id, participant)


app = FastAPI(title="NEO Code WS Service", version="1.0.0")
manager = ConnectionManager()


@app.websocket("/ws/{interview_id}/{user_role}")
async def code_ws(interview_id: str, user_role: str, websocket: WebSocket) -> None:
    if user_role not in ("candidate", "interviewer"):
        await websocket.close(code=1008, reason="user_role must be candidate or interviewer")
        return

    role: UserRole = user_role  # type: ignore[assignment]
    participant = await manager.connect(interview_id, websocket, role)
    try:
        await websocket.send_json(manager.snapshot(interview_id).model_dump())
        while True:
            raw_message = await websocket.receive_json()
            try:
                code_in = CodeIn.model_validate(raw_message)
            except ValidationError as exc:
                await websocket.send_json({"error": "invalid_code_payload", "details": exc.errors()})
                continue

            new_version = manager.apply_code_update(interview_id, code_in)
            outgoing = CodeUpdateOut(
                text_content=code_in.text_content,
                id_language=code_in.id_language,
                version=new_version,
                from_role=role,
                timestamp=manager.room_elapsed(interview_id),
            )
            await manager.broadcast_to_others(interview_id, participant, outgoing)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(interview_id, participant)
