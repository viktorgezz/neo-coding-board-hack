package ru.viktorgezz.business_service.domain.note.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ru.viktorgezz.business_service.domain.note.dto.*;
import ru.viktorgezz.business_service.domain.note.service.intrf.NoteCommandService;
import ru.viktorgezz.business_service.domain.note.service.intrf.NoteQueryService;

import java.util.UUID;

/**
 * REST-контроллер для управления заметками интервьюера.
 */
@RestController
@RequestMapping("/api/v1/rooms/{idRoom}/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteCommandService noteCommandService;
    private final NoteQueryService noteQueryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse createNote(
            @PathVariable UUID idRoom,
            @RequestBody @Valid final NoteCreateRequest request
    ) {
        return noteCommandService.createNote(idRoom, request);
    }

    @GetMapping
    public NoteListResponse getRoomNotes(@PathVariable UUID idRoom) {
        return noteQueryService.getRoomNotes(idRoom);
    }

    @GetMapping("/paged")
    public Page<NoteResponse> getRoomNotesPaged(
            @PathVariable UUID idRoom,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return noteQueryService.getRoomNotesPaged(idRoom, page, size);
    }

    @PatchMapping("/{idNote}")
    public NoteResponse updateNote(
            @PathVariable UUID idRoom,
            @PathVariable Long idNote,
            @RequestBody @Valid final NoteUpdateRequest request
    ) {
        return noteCommandService.updateNote(idRoom, idNote, request);
    }

    @DeleteMapping("/{idNote}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNote(
            @PathVariable UUID idRoom,
            @PathVariable Long idNote
    ) {
        noteCommandService.deleteNote(idRoom, idNote);
    }
}
