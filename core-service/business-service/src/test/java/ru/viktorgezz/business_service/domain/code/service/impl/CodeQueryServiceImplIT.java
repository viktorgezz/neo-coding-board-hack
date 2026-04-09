package ru.viktorgezz.business_service.domain.code.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import ru.viktorgezz.business_service.domain.code.CodeSnapshot;
import ru.viktorgezz.business_service.domain.code.repo.CodeSnapshotRepo;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.testconfig.AbstractIntegrationPostgresTest;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Интеграционные тесты для CodeQueryServiceImpl")
class CodeQueryServiceImplIT extends AbstractIntegrationPostgresTest {

    @Autowired
    private CodeQueryServiceImpl serviceQueryCode;

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
    @DisplayName("При отсутствующей комнате выбрасывается исключение")
    void getLatestCode_roomNotFound_throwsBusinessException() {
        // Arrange
        UUID idRoomRandom = UUID.randomUUID();

        // Act & Assert
        assertThatThrownBy(() -> serviceQueryCode.getLatestCode(idRoomRandom))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("При отсутствии снапшотов возвращается null от маппера")
    void getLatestCode_roomExistsWithoutSnapshots_returnsNull() {
        // Arrange
        Room roomTest = new Room("Тест-комната", "Тестировщик", RoomStatus.ACTIVE, Instant.now());
        roomTest = repoRoom.save(roomTest);

        // Act
        var responseLatest = serviceQueryCode.getLatestCode(roomTest.getId());

        // Assert
        assertThat(responseLatest).isNull();
    }

    @Test
    @DisplayName("Возвращается свежий снапшот если они есть")
    void getLatestCode_roomExistsWithSnapshots_returnsLatestSnapshot() {
        // Arrange
        Room roomTest = new Room("Тест-комната 2", "Senior Java", RoomStatus.ACTIVE, Instant.now());
        roomTest = repoRoom.save(roomTest);

        CodeSnapshot snapshotOld = new CodeSnapshot("код 1", "JAVA", Instant.now().minusSeconds(10), "00:01", null, null, roomTest);
        CodeSnapshot snapshotNew = new CodeSnapshot("код 2", "JAVA", Instant.now(), "00:10", null, null, roomTest);
        
        repoSnapshotCode.save(snapshotOld);
        repoSnapshotCode.save(snapshotNew);

        // Act
        var responseLatest = serviceQueryCode.getLatestCode(roomTest.getId());

        // Assert
        assertThat(responseLatest).isNotNull();
        assertThat(responseLatest.getTextCode()).isEqualTo("код 2");
        assertThat(responseLatest.getTimeOffset()).isEqualTo("00:10");
    }

    @Test
    @DisplayName("При отсутствующей комнате (список) выбрасывается исключение")
    void getAllSnapshots_roomNotFound_throwsBusinessException() {
        // Arrange
        UUID idRoomRandom = UUID.randomUUID();

        // Act & Assert
        assertThatThrownBy(() -> serviceQueryCode.getAllSnapshots(idRoomRandom))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Возвращается список отсортированный по времени создания")
    void getAllSnapshots_roomExistsWithSnapshots_returnsSortedSnapshots() {
        // Arrange
        Room roomTest = new Room("Тест комната 3", "Go Developer", RoomStatus.ACTIVE, Instant.now());
        roomTest = repoRoom.save(roomTest);

        CodeSnapshot snapshotSecond = new CodeSnapshot("func check()", "GO", Instant.now().plusSeconds(5), "00:05", null, null, roomTest);
        CodeSnapshot snapshotFirst = new CodeSnapshot("func init()", "GO", Instant.now(), "00:00", null, null, roomTest);

        repoSnapshotCode.save(snapshotSecond);
        repoSnapshotCode.save(snapshotFirst);

        // Act
        var responseList = serviceQueryCode.getAllSnapshots(roomTest.getId());

        // Assert
        assertThat(responseList).isNotNull();
        assertThat(responseList.getContent()).hasSize(2);
        assertThat(responseList.getContent().get(0).getTextCode()).isEqualTo("func init()");
        assertThat(responseList.getContent().get(1).getTextCode()).isEqualTo("func check()");
    }
}
