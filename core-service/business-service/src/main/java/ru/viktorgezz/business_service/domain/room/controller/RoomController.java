package ru.viktorgezz.business_service.domain.room.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ru.viktorgezz.business_service.auth.dto.AuthenticationResponse;
import ru.viktorgezz.business_service.auth.dto.RegistrationCandidateRequest;
import ru.viktorgezz.business_service.domain.history.service.intrf.HistoryService;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.dto.*;
import ru.viktorgezz.business_service.domain.room.service.intrf.RoomCommandService;
import ru.viktorgezz.business_service.domain.room.service.intrf.RoomQueryService;

import java.util.UUID;

/**
 * REST-контроллер для управления комнатами интервью.
 */
@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
@Tag(name = "Комнаты", description = "Управление комнатами для собеседований")
public class RoomController {

    private final RoomCommandService roomCommandService;
    private final RoomQueryService roomQueryService;
    private final HistoryService historyService;

    @Operation(summary = "Создать новую комнату")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoomCreateResponse createRoom(
            @RequestBody @Valid final RoomCreateRequest request
    ) {
        return roomCommandService.createRoom(request);
    }

    @Operation(summary = "Получить список комнат текущего интервьюера")
    @GetMapping
    public Page<RoomSummaryResponse> getRoomsList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return roomQueryService.getRoomsByCurrentInterviewer(page, size);
    }

    @Operation(summary = "Получить список всех комнат")
    @GetMapping("/all")
    public Page<RoomSummaryResponse> getAllRooms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) RoomStatus status
    ) {
        return roomQueryService.getAllRooms(page, size, status);
    }

    @Operation(summary = "Удалить комнату")
    @DeleteMapping("/{idRoom}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRoom(@PathVariable UUID idRoom) {
        roomCommandService.deleteRoom(idRoom);
    }

    @Operation(summary = "Получить информацию для подключения к комнате")
    @GetMapping("/join-info/{idRoom}")
    public JoinInfoResponse getJoinInfo(@PathVariable UUID idRoom) {
        return roomQueryService.getJoinInfo(idRoom);
    }

    @Operation(summary = "Зарегистрировать кандидата в комнату")
    @PostMapping("/register/{idRoom}")
    public AuthenticationResponse registerCandidate(
            @PathVariable UUID idRoom,
            @RequestBody @Valid final RegistrationCandidateRequest request
    ) {
        return roomCommandService.registerCandidate(idRoom, request);
    }

    @Operation(summary = "Завершить собеседование в комнате")
    @PatchMapping("/finish/{idRoom}")
    public FinishRoomResponse finishRoom(
            @PathVariable UUID idRoom
    ) {
        historyService.collectAndSendHistoryAsync(idRoom);
        return roomCommandService.finishRoom(idRoom);
    }

    @Operation(summary = "Начать собеседование в комнате")
    @PatchMapping("/start/{idRoom}")
    public StartRoomResponse startRoom(@PathVariable UUID idRoom) {
        return roomCommandService.startRoom(idRoom);
    }
}
