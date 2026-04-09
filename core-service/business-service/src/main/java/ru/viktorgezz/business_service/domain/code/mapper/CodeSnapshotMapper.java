package ru.viktorgezz.business_service.domain.code.mapper;

import ru.viktorgezz.business_service.domain.code.CodeSnapshot;
import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotResponse;

public class CodeSnapshotMapper {

    public static CodeSnapshotResponse toResponse(CodeSnapshot snapshot) {
        if (snapshot == null) {
            return null;
        }
        return new CodeSnapshotResponse(
                snapshot.getId().toString(),
                snapshot.getTextCode(),
                snapshot.getLanguage(),
                snapshot.getTimeCreated(),
                snapshot.getTimeOffset()
        );
    }
}
