package ru.viktorgezz.business_service.domain.rooms.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.viktorgezz.business_service.auth.dto.AuthenticationResponse;
import ru.viktorgezz.business_service.auth.dto.RegistrationCandidateRequest;
import ru.viktorgezz.business_service.domain.rooms.RoomStatus;
import ru.viktorgezz.business_service.domain.rooms.dto.*;
import ru.viktorgezz.business_service.domain.rooms.service.intrf.RoomCommandService;
import ru.viktorgezz.business_service.domain.rooms.service.intrf.RoomQueryService;

import java.util.UUID;

/**
 * REST-контроллер для управления комнатами интервью.
 */
@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomCommandService roomCommandService;
    private final RoomQueryService roomQueryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoomCreateResponse createRoom(
            @RequestBody @Valid final RoomCreateRequest request
    ) {
        return roomCommandService.createRoom(request);
    }

    @GetMapping
    public Page<RoomSummaryResponse> getRoomsList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return roomQueryService.getRoomsByCurrentInterviewer(page, size);
    }

    @GetMapping("/all")
    public Page<RoomSummaryResponse> getAllRooms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) RoomStatus status
    ) {
        return roomQueryService.getAllRooms(page, size, status);
    }

    @DeleteMapping("/{idRoom}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRoom(@PathVariable UUID idRoom) {
        roomCommandService.deleteRoom(idRoom);
    }

    @GetMapping("/join-info/{idRoom}")
    public JoinInfoResponse getJoinInfo(@PathVariable UUID idRoom) {
        return roomQueryService.getJoinInfo(idRoom);
    }

    @PostMapping("/register/{idRoom}")
    public AuthenticationResponse registerCandidate(
            @PathVariable UUID idRoom,
            @RequestBody @Valid final RegistrationCandidateRequest request
    ) {
        return roomCommandService.registerCandidate(idRoom, request);
    }

    @PatchMapping("/finish/{idRoom}")
    public FinishRoomResponse finishRoom(
            @PathVariable UUID idRoom,
            @RequestBody @Valid final FinishRoomRequest request
    ) {
        return roomCommandService.finishRoom(idRoom, request);
    }

    @PatchMapping("/start/{idRoom}")
    public StartRoomResponse startRoom(@PathVariable UUID idRoom) {
        return roomCommandService.startRoom(idRoom);
    }
}
