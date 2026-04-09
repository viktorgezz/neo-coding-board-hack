package ru.viktorgezz.business_service.domain.code.service.impl;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.viktorgezz.business_service.domain.code.CodeSnapshot;
import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotListResponse;
import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotResponse;
import ru.viktorgezz.business_service.domain.code.mapper.CodeSnapshotMapper;
import ru.viktorgezz.business_service.domain.code.repo.CodeSnapshotRepo;
import ru.viktorgezz.business_service.domain.code.service.intrf.CodeQueryService;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.exception.ErrorCode;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CodeQueryServiceImpl implements CodeQueryService {

    private final CodeSnapshotRepo codeSnapshotRepo;
    private final RoomRepo roomRepo;

    @Override
    public CodeSnapshotResponse getLatestCode(UUID idRoom) {
        checkRoomExists(idRoom);
        CodeSnapshot snapshot = codeSnapshotRepo.findTopByRoomIdOrderByTimeCreatedDesc(idRoom).orElse(null);
        return CodeSnapshotMapper.toResponse(snapshot);
    }

    @Override
    public CodeSnapshotListResponse getAllSnapshots(UUID idRoom) {
        checkRoomExists(idRoom);
        List<CodeSnapshot> snapshots = codeSnapshotRepo.findByRoomIdOrderByTimeCreatedAsc(idRoom);
        List<CodeSnapshotResponse> mappedSnapshots = snapshots.stream()
                .map(CodeSnapshotMapper::toResponse)
                .toList();
        return new CodeSnapshotListResponse(mappedSnapshots);
    }

    private void checkRoomExists(UUID idRoom) {
        if (!roomRepo.existsById(idRoom)) {
            throw new BusinessException(ErrorCode.ROOM_NOT_FOUND, idRoom);
        }
    }
}
