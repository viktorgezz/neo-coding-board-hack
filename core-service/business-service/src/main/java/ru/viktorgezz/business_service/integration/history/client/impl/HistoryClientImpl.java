package ru.viktorgezz.business_service.integration.history.client.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import ru.viktorgezz.business_service.integration.history.client.HistoryClient;
import ru.viktorgezz.business_service.integration.history.client.dto.RoomHistoryRequest;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class HistoryClientImpl implements HistoryClient {

    private final RestClient historyRestClient;

    @Value("${app.integration.history.endpoint}")
    private String endpoint;

    @Override
    public void sendHistory(UUID idRoom, RoomHistoryRequest request) {
        try {
            String url = endpoint.replace("{idRoom}", idRoom.toString());
            log.debug("Sending history for room {} to {}", idRoom, url);

            historyRestClient.post()
                    .uri(url)
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();

            log.debug("Successfully sent history for room {}", idRoom);
        } catch (Exception e) {
            log.error("Failed to send history for room {}: {}", idRoom, e.getMessage(), e);
        }
    }
}
