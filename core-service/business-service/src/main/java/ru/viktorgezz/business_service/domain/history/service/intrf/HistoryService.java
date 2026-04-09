package ru.viktorgezz.business_service.domain.history.service.intrf;

import java.util.UUID;

public interface HistoryService {
    void collectAndSendHistoryAsync(UUID idRoom);
}
