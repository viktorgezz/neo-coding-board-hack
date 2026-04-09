package ru.viktorgezz.business_service.integration.history.client.dto;

import java.util.List;

public record RoomHistoryRequest(
        String startTime,
        String endTime,
        List<CodeSnapshotDto> codeSnapshots,
        List<InterviewerNoteDto> interviewerNotes
) {
}
