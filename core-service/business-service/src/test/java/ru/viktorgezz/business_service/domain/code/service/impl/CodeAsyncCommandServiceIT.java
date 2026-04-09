package ru.viktorgezz.business_service.domain.code.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import ru.viktorgezz.business_service.domain.code.dto.CodeSnapshotWsRequest;
import ru.viktorgezz.business_service.domain.code.repo.CodeSnapshotRepo;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.testconfig.AbstractIntegrationPostgresTest;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Интеграционные тесты для CodeAsyncCommandService")
class CodeAsyncCommandServiceIT extends AbstractIntegrationPostgresTest {

    @Autowired
    private CodeAsyncCommandService serviceCommandAsyncCode;

    @Autowired
    private CodeSnapshotRepo repoSnapshotCode;

    @Autowired
    private RoomRepo repoRoom;

    @AfterEach
    void tearDown() {
        repoSnapshotCode.deleteAll();
        repoRoom.deleteAll();
    }

    @Test
    @DisplayName("Успешное извлечение из очереди и сохранение в бд")
    void flushQueue_queueHasSnapshots_snapshotsSavedToDb() {
        // Arrange
        Room roomTest = new Room("Тестовая комната", "Android", RoomStatus.ACTIVE, Instant.now());
        roomTest.setDateStart(Instant.now().minusSeconds(120));
        roomTest = repoRoom.save(roomTest);

        UUID roomIdTest = roomTest.getId();

        CodeSnapshotWsRequest requestWs = new CodeSnapshotWsRequest(null, null, roomIdTest, "KOTLIN", "fun main() {}");

        // Act
        serviceCommandAsyncCode.processIncomingSnapshot(requestWs);
        serviceCommandAsyncCode.flushQueue();

        // Assert
        var snapshotsSaved = repoSnapshotCode.findAll();
        assertThat(snapshotsSaved).hasSize(1);

        var snapshotFirst = snapshotsSaved.getFirst();
        assertThat(snapshotFirst.getTextCode()).isEqualTo("fun main() {}");
        assertThat(snapshotFirst.getLanguage()).isEqualTo("KOTLIN");
        assertThat(snapshotFirst.getRoom().getId()).isEqualTo(roomIdTest);
        assertThat(snapshotFirst.getTimeOffset()).isNotNull();
    }

    @Test
    @DisplayName("Игнорирование пустой очереди без ошибок")
    void flushQueue_queueIsEmpty_noErrorsAndNoSaves() {
        // Act
        serviceCommandAsyncCode.flushQueue();

        // Assert
        var snapshotsSaved = repoSnapshotCode.findAll();
        assertThat(snapshotsSaved).isEmpty();
    }

    @Test
    @DisplayName("Нагрузочное тестирование: 100 снимков / сек в течении 10 сек")
    void processIncomingSnapshot_highLoad_savesAllCorrectly() throws InterruptedException {
        // Arrange
        Room roomTest = new Room("Нагрузочная комната", "HighLoad", RoomStatus.ACTIVE, Instant.now());
        roomTest.setDateStart(Instant.now().minusSeconds(120));
        roomTest = repoRoom.save(roomTest);

        UUID idRoomTest = roomTest.getId();
        int secondsTotal = 10;
        int snapshotsPerSecond = 100;
        int totalRequests = secondsTotal * snapshotsPerSecond;

        ExecutorService executorService = Executors.newFixedThreadPool(20);

        // Act
        for (int i = 0; i < secondsTotal; i++) {
            CountDownLatch latchSecond = new CountDownLatch(snapshotsPerSecond);
            for (int j = 0; j < snapshotsPerSecond; j++) {
                final int index = j;
                final int sec = i;
                executorService.submit(() -> {
                    try {
                        CodeSnapshotWsRequest requestWs = new CodeSnapshotWsRequest(null, null, idRoomTest, "JAVA", "Код " + sec + " " + index);
                        serviceCommandAsyncCode.processIncomingSnapshot(requestWs);
                    } finally {
                        latchSecond.countDown();
                    }
                });
            }
            // Ждем пока все 100 запросов текущей "секунды" поступят в очередь
            latchSecond.await();
            
            // Имитируем вызов шедулера, который забирает накопившийся за секунду батч
            serviceCommandAsyncCode.flushQueue();
        }
        
        executorService.shutdown();

        // Assert
        var snapshotsSaved = repoSnapshotCode.findAll();
        assertThat(snapshotsSaved).hasSize(totalRequests);
    }
}
