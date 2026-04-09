package ru.viktorgezz.business_service.domain.history.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotListResponse;
import ru.viktorgezz.business_service.domain.code.service.intrf.CodeQueryService;
import ru.viktorgezz.business_service.domain.history.service.intrf.HistoryService;
import ru.viktorgezz.business_service.domain.note.dto.NoteListResponse;
import ru.viktorgezz.business_service.domain.note.service.intrf.NoteQueryService;
import ru.viktorgezz.business_service.domain.room.dto.RoomSummaryResponse;
import ru.viktorgezz.business_service.domain.room.service.intrf.RoomQueryService;
import ru.viktorgezz.business_service.integration.history.client.HistoryClient;
import ru.viktorgezz.business_service.integration.history.client.dto.CodeSnapshotDto;
import ru.viktorgezz.business_service.integration.history.client.dto.InterviewerNoteDto;
import ru.viktorgezz.business_service.integration.history.client.dto.RoomHistoryRequest;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class HistoryServiceImpl implements HistoryService {

    private final RoomQueryService roomQueryService;
    private final CodeQueryService codeQueryService;
    private final NoteQueryService noteQueryService;
    private final HistoryClient historyClient;

    @Async
    @Override
    @Transactional(readOnly = true)
    public void collectAndSendHistoryAsync(UUID idRoom) {
        log.info("Collecting history for room {}", idRoom);

        final RoomSummaryResponse room = roomQueryService.getRoomSummary(idRoom);
        final CodeSnapshotListResponse codeResponse = codeQueryService.getAllSnapshots(idRoom);
        final NoteListResponse noteResponse = noteQueryService.getRoomNotes(idRoom);

        List<CodeSnapshotDto> codeSnapshots = codeResponse
                .getContent()
                .stream()
                .map(c -> new CodeSnapshotDto(
                        c.getTimeCreated().toString(),
                        c.getTextCode(),
                        c.getLanguage()
                ))
                .toList();

        List<InterviewerNoteDto> interviewerNotes = noteResponse
                .listNotes()
                .stream()
                .map(n -> new InterviewerNoteDto(
                        n.timeCreated().toString(),
                        n.textContent()
                ))
                .toList();

        String startTimeStr = room.dateStart() != null ? room.dateStart().toString() : "";
        String endTimeStr = room.dateEnd() != null ? room.dateEnd().toString() : "";

        RoomHistoryRequest request = new RoomHistoryRequest(
                startTimeStr,
                endTimeStr,
                codeSnapshots,
                interviewerNotes
        );

        historyClient.sendHistory(idRoom, request);
    }
}
