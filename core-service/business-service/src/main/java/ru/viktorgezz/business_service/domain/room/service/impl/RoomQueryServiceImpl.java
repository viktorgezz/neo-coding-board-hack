package ru.viktorgezz.business_service.domain.room.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.dto.JoinInfoResponse;
import ru.viktorgezz.business_service.domain.room.dto.RoomSummaryResponse;
import ru.viktorgezz.business_service.domain.room.mapper.RoomMapper;
import ru.viktorgezz.business_service.domain.room.repo.RoomPagingRepo;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.domain.room.service.intrf.RoomQueryService;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.util.CurrentUserUtils;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.exception.ErrorCode;

import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;

/**
 * Реализация сервиса чтения данных о комнатах.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoomQueryServiceImpl implements RoomQueryService {

    private final RoomPagingRepo roomPagingRepo;
    private final RoomRepo roomRepo;

    @Override
    public Page<RoomSummaryResponse> getRoomsByCurrentInterviewer(int page, int size) {
        final User currentUser = CurrentUserUtils.getCurrentUser();
        final Pageable pageable = PageRequest.of(page, size);

        return roomPagingRepo.findByInterviewersContaining(currentUser, pageable)
                .map(RoomMapper::toSummary);
    }

    @Override
    public Page<RoomSummaryResponse> getAllRooms(int page, int size, RoomStatus status) {
        final Pageable pageable = PageRequest.of(page, size);

        if (status != null) {
            return roomPagingRepo.findByStatus(status, pageable)
                    .map(RoomMapper::toSummary);
        }

        return roomPagingRepo.findAll(pageable)
                .map(RoomMapper::toSummary);
    }

    @Override
    public JoinInfoResponse getJoinInfo(UUID idRoom) {
        final Room room = roomRepo.findById(idRoom)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND, idRoom));

        return new JoinInfoResponse(
                room.getId().toString(),
                room.getNameVacancy(),
                room.getTitleRoom()
        );
    }
}
