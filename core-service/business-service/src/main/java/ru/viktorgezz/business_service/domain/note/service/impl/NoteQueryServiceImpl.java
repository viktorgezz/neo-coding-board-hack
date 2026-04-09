package ru.viktorgezz.business_service.domain.note.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.domain.note.dto.NoteListResponse;
import ru.viktorgezz.business_service.domain.note.dto.NoteResponse;
import ru.viktorgezz.business_service.domain.note.mapper.NoteMapper;
import ru.viktorgezz.business_service.domain.note.repo.NotePagingRepo;
import ru.viktorgezz.business_service.domain.note.repo.NoteRepo;
import ru.viktorgezz.business_service.domain.note.service.intrf.NoteQueryService;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.exception.ErrorCode;

import java.util.List;
import java.util.UUID;

/**
 * Реализация сервиса чтения данных заметок.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoteQueryServiceImpl implements NoteQueryService {

    private final NoteRepo noteRepo;
    private final NotePagingRepo notePagingRepo;
    private final RoomRepo roomRepo;

    @Override
    public NoteListResponse getRoomNotes(UUID idRoom) {
        checkRoomExists(idRoom);

        final List<NoteResponse> notes = noteRepo.findByRoomIdOrderByTimeCreatedAsc(idRoom)
                .stream()
                .map(NoteMapper::toResponse)
                .toList();

        return new NoteListResponse(notes);
    }

    @Override
    public Page<NoteResponse> getRoomNotesPaged(UUID idRoom, int page, int size) {
        checkRoomExists(idRoom);

        final Pageable pageable = PageRequest.of(page, size, Sort.by("timeCreated").ascending());
        return notePagingRepo.findByRoomId(idRoom, pageable)
                .map(NoteMapper::toResponse);
    }

    private void checkRoomExists(UUID idRoom) {
        if (!roomRepo.existsById(idRoom)) {
            throw new BusinessException(ErrorCode.ROOM_NOT_FOUND, idRoom);
        }
    }
}
