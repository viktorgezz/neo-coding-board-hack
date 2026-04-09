package ru.viktorgezz.business_service.domain.note.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.domain.note.Note;
import ru.viktorgezz.business_service.domain.note.dto.NoteCreateRequest;
import ru.viktorgezz.business_service.domain.note.dto.NoteResponse;
import ru.viktorgezz.business_service.domain.note.dto.NoteUpdateRequest;
import ru.viktorgezz.business_service.domain.note.mapper.NoteMapper;
import ru.viktorgezz.business_service.domain.note.repo.NoteRepo;
import ru.viktorgezz.business_service.domain.note.service.intrf.NoteCommandService;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.domain.room.util.TimeOffsetUtils;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.exception.ErrorCode;

import java.time.Instant;
import java.util.UUID;

import static ru.viktorgezz.business_service.domain.user.util.CurrentUserUtils.getCurrentUser;

/**
 * Реализация сервиса модификации данных заметок.
 */
@Service
@RequiredArgsConstructor
public class NoteCommandServiceImpl implements NoteCommandService {

    private final NoteRepo noteRepo;
    private final RoomRepo roomRepo;

    @Override
    @Transactional
    public NoteResponse createNote(UUID idRoom, NoteCreateRequest request) {
        final Room room = roomRepo.findById(idRoom)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND, idRoom));

        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.ROOM_NOT_ACTIVE, idRoom);
        }

        final User interviewer = getCurrentUser();
        final Instant now = Instant.now();
        final String timeOffset = TimeOffsetUtils.calculate(room.getDateStart(), now);

        final Note note = new Note(
                request.textContent(),
                timeOffset,
                now,
                room,
                interviewer
        );

        final Note savedNote = noteRepo.save(note);
        return NoteMapper.toResponse(savedNote);
    }

    @Override
    @Transactional
    public NoteResponse updateNote(UUID idRoom, Long idNote, NoteUpdateRequest request) {
        final Note note = noteRepo.findByIdAndRoomId(idNote, idRoom)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTE_NOT_FOUND, idNote, idRoom));

        note.setTextContent(request.textContent());
        note.setTimeUpdated(Instant.now());

        final Note updatedNote = noteRepo.save(note);
        return NoteMapper.toResponse(updatedNote);
    }

    @Override
    @Transactional
    public void deleteNote(UUID idRoom, Long idNote) {
        final Note note = noteRepo.findByIdAndRoomId(idNote, idRoom)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTE_NOT_FOUND, idNote, idRoom));
        noteRepo.delete(note);
    }
}

