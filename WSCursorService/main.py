from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Literal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict, ValidationError


UserRole = Literal["candidate", "interviewer"]


class CursorIn(BaseModel):
    """Incoming cursor; extra keys (selection range) are forwarded to peers."""

    model_config = ConfigDict(extra="allow")

    line: int
    column: int


@dataclass
class Participant:
    websocket: WebSocket
    role: UserRole


class ConnectionManager:
    def __init__(self) -> None:
        self.rooms: dict[str, list[Participant]] = {}
        self.session_started_at: dict[str, float] = {}

    async def connect(self, interview_id: str, websocket: WebSocket, role: UserRole) -> Participant:
        await websocket.accept()
        participant = Participant(websocket=websocket, role=role)
        self.rooms.setdefault(interview_id, []).append(participant)
        self.session_started_at.setdefault(interview_id, time.monotonic())
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

    def room_elapsed(self, interview_id: str) -> float:
        started_at = self.session_started_at.get(interview_id)
        if started_at is None:
            return 0.0
        return round(time.monotonic() - started_at, 3)

    async def broadcast_to_others(self, interview_id: str, sender: Participant, payload: dict) -> None:
        for participant in list(self.rooms.get(interview_id, [])):
            if participant is sender:
                continue
            try:
                await participant.websocket.send_json(payload)
            except Exception:
                self.disconnect(interview_id, participant)


app = FastAPI(title="NEO Cursor WS Service", version="1.0.0")
manager = ConnectionManager()


@app.websocket("/ws/{interview_id}/{user_role}")
async def cursor_ws(interview_id: str, user_role: str, websocket: WebSocket) -> None:
    if user_role not in ("candidate", "interviewer"):
        await websocket.close(code=1008, reason="user_role must be candidate or interviewer")
        return

    role = user_role
    participant = await manager.connect(interview_id, websocket, role)
    try:
        while True:
            raw_message = await websocket.receive_json()
            try:
                cursor = CursorIn.model_validate(raw_message)
            except ValidationError as exc:
                await websocket.send_json({"error": "invalid_cursor_payload", "details": exc.errors()})
                continue

            base = cursor.model_dump(mode="json", exclude_none=True)
            outgoing: dict = {
                **base,
                "timestamp": manager.room_elapsed(interview_id),
                "from_role": role,
            }
            await manager.broadcast_to_others(interview_id, participant, outgoing)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(interview_id, participant)

