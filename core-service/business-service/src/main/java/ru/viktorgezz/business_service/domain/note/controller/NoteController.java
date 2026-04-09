package ru.viktorgezz.business_service.domain.note.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ru.viktorgezz.business_service.domain.note.dto.NoteCreateRequest;
import ru.viktorgezz.business_service.domain.note.dto.NoteListResponse;
import ru.viktorgezz.business_service.domain.note.dto.NoteResponse;
import ru.viktorgezz.business_service.domain.note.dto.NoteUpdateRequest;
import ru.viktorgezz.business_service.domain.note.service.intrf.NoteCommandService;
import ru.viktorgezz.business_service.domain.note.service.intrf.NoteQueryService;

import java.util.UUID;

/**
 * REST-контроллер для управления заметками интервьюера.
 */
@RestController
@RequestMapping("/api/v1/rooms/{idRoom}/notes")
@RequiredArgsConstructor
@Tag(name = "Заметки", description = "Управление заметками интервьюера")
public class NoteController {

    private final NoteCommandService noteCommandService;
    private final NoteQueryService noteQueryService;

    @Operation(summary = "Создать новую заметку")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse createNote(
            @PathVariable UUID idRoom,
            @RequestBody @Valid final NoteCreateRequest request
    ) {
        return noteCommandService.createNote(idRoom, request);
    }

    @Operation(summary = "Получить все заметки комнаты (без пагинации)")
    @GetMapping
    public NoteListResponse getRoomNotes(@PathVariable UUID idRoom) {
        return noteQueryService.getRoomNotes(idRoom);
    }

    @Operation(summary = "Получить заметки комнаты с пагинацией")
    @GetMapping("/paged")
    public Page<NoteResponse> getRoomNotesPaged(
            @PathVariable UUID idRoom,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return noteQueryService.getRoomNotesPaged(idRoom, page, size);
    }

    @Operation(summary = "Обновить текст заметки")
    @PatchMapping("/{idNote}")
    public NoteResponse updateNote(
            @PathVariable UUID idRoom,
            @PathVariable Long idNote,
            @RequestBody @Valid final NoteUpdateRequest request
    ) {
        return noteCommandService.updateNote(idRoom, idNote, request);
    }

    @Operation(summary = "Удалить заметку")
    @DeleteMapping("/{idNote}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNote(
            @PathVariable UUID idRoom,
            @PathVariable Long idNote
    ) {
        noteCommandService.deleteNote(idRoom, idNote);
    }
}
