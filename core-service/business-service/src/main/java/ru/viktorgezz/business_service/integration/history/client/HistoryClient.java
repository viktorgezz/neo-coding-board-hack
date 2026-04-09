package ru.viktorgezz.business_service.integration.history.client;

import ru.viktorgezz.business_service.integration.history.client.dto.RoomHistoryRequest;

import java.util.UUID;

public interface HistoryClient {
    void sendHistory(UUID idRoom, RoomHistoryRequest request);
}
