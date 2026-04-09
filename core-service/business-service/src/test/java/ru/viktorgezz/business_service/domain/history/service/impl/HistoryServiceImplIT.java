package ru.viktorgezz.business_service.domain.history.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import ru.viktorgezz.business_service.domain.code.CodeSnapshot;
import ru.viktorgezz.business_service.domain.code.repo.CodeSnapshotRepo;
import ru.viktorgezz.business_service.domain.note.Note;
import ru.viktorgezz.business_service.domain.note.repo.NoteRepo;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.domain.user.Role;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.repo.UserRepo;
import ru.viktorgezz.business_service.integration.history.client.HistoryClient;
import ru.viktorgezz.business_service.integration.history.client.dto.RoomHistoryRequest;
import ru.viktorgezz.business_service.testconfig.AbstractIntegrationPostgresTest;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Интеграционные тесты для HistoryServiceImpl")
class HistoryServiceImplIT extends AbstractIntegrationPostgresTest {

    @Autowired
    private HistoryServiceImpl serviceHistory;

    @Autowired
    private RoomRepo repoRoom;

    @Autowired
    private CodeSnapshotRepo repoCodeSnapshot;

    @Autowired
    private NoteRepo repoNote;

    @Autowired
    private UserRepo repoUser;

    @MockitoBean
    private HistoryClient clientHistoryMock;

    private User userInterviewer;

    @BeforeEach
    void setUp() {
        repoNote.deleteAll();
        repoCodeSnapshot.deleteAll();
        repoRoom.deleteAll();
        repoUser.deleteAll();

        userInterviewer = new User("interviewer_h", "password", Role.INTERVIEWER);
        userInterviewer = repoUser.save(userInterviewer);
    }

    @AfterEach
    void tearDown() {
        repoNote.deleteAll();
        repoCodeSnapshot.deleteAll();
        repoRoom.deleteAll();
        repoUser.deleteAll();
    }

    @Test
    @DisplayName("Сбор и отправка истории комнаты со снимками и заметками проходит успешно")
    void collectAndSendHistoryAsync_validRoom_sendsAggregatedHistory() {
        // Arrange
        Instant timeStart = Instant.now().minusSeconds(3600);
        Instant timeEnd = Instant.now();
        Room roomTarget = new Room("History Room", "Java", RoomStatus.FINISHED, timeStart);
        roomTarget.setDateStart(timeStart);
        roomTarget.setDateEnd(timeEnd);
        roomTarget = repoRoom.save(roomTarget);

        CodeSnapshot codeFirst = new CodeSnapshot("System.out.println()", "java", timeStart.plusSeconds(10), "00:10", null, userInterviewer, roomTarget);
        repoCodeSnapshot.save(codeFirst);

        Note noteFirst = new Note("Хороший кандидат", "00:20", timeStart.plusSeconds(20), roomTarget, userInterviewer);
        repoNote.save(noteFirst);

        // Act
        serviceHistory.collectAndSendHistoryAsync(roomTarget.getId());

        // Assert
        ArgumentCaptor<RoomHistoryRequest> captorRequest = ArgumentCaptor.forClass(RoomHistoryRequest.class);
        verify(clientHistoryMock, timeout(3000)).sendHistory(eq(roomTarget.getId()), captorRequest.capture());

        RoomHistoryRequest sentRequest = captorRequest.getValue();
        assertThat(sentRequest).isNotNull();
        assertThat(sentRequest.startTime()).isEqualTo(timeStart.toString());
        assertThat(sentRequest.endTime()).isEqualTo(timeEnd.toString());

        assertThat(sentRequest.codeSnapshots()).hasSize(1);
        assertThat(sentRequest.codeSnapshots().getFirst().code()).isEqualTo("System.out.println()");
        assertThat(sentRequest.codeSnapshots().getFirst().language()).isEqualTo("java");

        assertThat(sentRequest.interviewerNotes()).hasSize(1);
        assertThat(sentRequest.interviewerNotes().getFirst().text()).isEqualTo("Хороший кандидат");
    }

    @Test
    @DisplayName("Если комната не найдена, отправка не происходит")
    void collectAndSendHistoryAsync_roomNotFound_doesNotCallClient() {
        // Arrange
        UUID idRoomRandom = UUID.randomUUID();

        // Act
        try {
            serviceHistory.collectAndSendHistoryAsync(idRoomRandom);
        } catch (Exception ignored) {
            // Исключение может перехватываться AsyncUncaughtExceptionHandler или выбрасываться напрямую
        }

        // Assert
        try {
            Thread.sleep(500); // Даем время для асинхронного потока (хотя вызов должен был быстрой упасть из-за ошибки в БД)
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        verifyNoInteractions(clientHistoryMock);
    }
}
