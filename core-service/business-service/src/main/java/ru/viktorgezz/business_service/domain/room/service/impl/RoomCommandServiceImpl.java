package ru.viktorgezz.business_service.domain.room.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.auth.dto.AuthenticationResponse;
import ru.viktorgezz.business_service.auth.dto.RegistrationCandidateRequest;
import ru.viktorgezz.business_service.auth.service.AuthenticationService;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.dto.FinishRoomResponse;
import ru.viktorgezz.business_service.domain.room.dto.RoomCreateRequest;
import ru.viktorgezz.business_service.domain.room.dto.RoomCreateResponse;
import ru.viktorgezz.business_service.domain.room.dto.StartRoomResponse;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.domain.room.service.intrf.RoomCommandService;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.exception.ErrorCode;
import ru.viktorgezz.security.service.JwtService;

import java.time.Instant;
import java.util.UUID;

import static ru.viktorgezz.business_service.domain.user.util.CurrentUserUtils.getCurrentUser;

/**
 * Реализация сервиса модификации данных комнат.
 */
@Service
@RequiredArgsConstructor
public class RoomCommandServiceImpl implements RoomCommandService {

    /** Must match frontend route {@code /session/:id/join} */
    private static final String JOIN_URL_TEMPLATE = "%s/session/%s/join";

    private final RoomRepo roomRepo;
    private final AuthenticationService authenticationService;
    private final JwtService jwtService;
    private final ru.viktorgezz.business_service.domain.user.service.intrf.UserQueryService userQueryService;

    @Value("${security.origin.frontend}")
    private String frontendOrigin;

    @Override
    @Transactional
    public RoomCreateResponse createRoom(RoomCreateRequest request) {
        final User currentUser = getCurrentUser();

        final Room room = new Room(
                request.titleRoom(),
                request.nameVacancy(),
                RoomStatus.CREATED,
                Instant.now()
        );
        room.getInterviewers().add(currentUser);

        final Room savedRoom = roomRepo.save(room);
        final String url = String.format(JOIN_URL_TEMPLATE, frontendOrigin, savedRoom.getId());

        return new RoomCreateResponse(
                savedRoom.getId().toString(),
                url
        );
    }

    @Override
    @Transactional
    public void deleteRoom(UUID idRoom) {
        final Room room = roomRepo.findById(idRoom)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND, idRoom));
        roomRepo.delete(room);
    }

    @Override
    @Transactional
    public AuthenticationResponse registerCandidate(UUID idRoom, RegistrationCandidateRequest request) {
        final Room room = roomRepo.findById(idRoom)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND, idRoom));

        if (room.getCandidate() != null) {
            throw new BusinessException(ErrorCode.CANDIDATE_ALREADY_REGISTERED, idRoom);
        }

        final AuthenticationResponse response = authenticationService.registerCandidate(request);

        final String username = jwtService.extractUsername(response.accessToken());
        final User candidateUser = userQueryService.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND, username));

        room.setCandidate(candidateUser.getCandidate());
        roomRepo.save(room);

        return response;
    }

    @Override
    @Transactional
    public FinishRoomResponse finishRoom(UUID idRoom) {
        final Room room = roomRepo.findById(idRoom)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND, idRoom));

        if (room.getStatus() == RoomStatus.FINISHED) {
            throw new BusinessException(ErrorCode.ROOM_ALREADY_FINISHED, idRoom);
        }

        final Instant now = Instant.now();
        room.setStatus(RoomStatus.FINISHED);
        room.setDateEnd(now);
        roomRepo.save(room);

        return new FinishRoomResponse(
                room.getId().toString(),
                now
        );
    }

    @Override
    @Transactional
    public StartRoomResponse startRoom(UUID idRoom) {
        final Room room = roomRepo.findById(idRoom)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND, idRoom));

        if (room.getStatus() != RoomStatus.CREATED) {
            throw new BusinessException(ErrorCode.ROOM_NOT_IN_CREATED_STATUS, idRoom);
        }

        final Instant now = Instant.now();
        room.setStatus(RoomStatus.ACTIVE);
        room.setDateStart(now);
        roomRepo.save(room);

        return new StartRoomResponse(
                room.getId().toString(),
                RoomStatus.ACTIVE.name(),
                now
        );
    }
}
