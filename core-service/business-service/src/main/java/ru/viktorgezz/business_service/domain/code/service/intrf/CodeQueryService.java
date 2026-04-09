package ru.viktorgezz.business_service.domain.code.service.intrf;

import java.util.UUID;

import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotListResponse;
import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotResponse;

public interface CodeQueryService {

    CodeSnapshotResponse getLatestCode(UUID idRoom);

    CodeSnapshotListResponse getAllSnapshots(UUID idRoom);
}
