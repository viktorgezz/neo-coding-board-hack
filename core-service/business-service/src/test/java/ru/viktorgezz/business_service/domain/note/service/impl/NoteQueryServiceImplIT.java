package ru.viktorgezz.business_service.domain.note.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import ru.viktorgezz.business_service.domain.note.Note;
import ru.viktorgezz.business_service.domain.note.dto.NoteResponse;
import ru.viktorgezz.business_service.domain.note.repo.NoteRepo;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.domain.user.Role;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.repo.UserRepo;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.testconfig.AbstractIntegrationPostgresTest;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Интеграционные тесты для NoteQueryServiceImpl")
class NoteQueryServiceImplIT extends AbstractIntegrationPostgresTest {

    @Autowired
    private NoteQueryServiceImpl serviceQueryNote;

    @Autowired
    private NoteRepo repoNote;

    @Autowired
    private RoomRepo repoRoom;

    @Autowired
    private UserRepo repoUser;

    private User userInterviewer;

    @BeforeEach
    void setUp() {
        repoNote.deleteAll();
        repoRoom.deleteAll();
        repoUser.deleteAll();

        userInterviewer = new User("interviewer_nq", "password", Role.INTERVIEWER);
        userInterviewer = repoUser.save(userInterviewer);
    }

    @AfterEach
    void tearDown() {
        repoNote.deleteAll();
        repoRoom.deleteAll();
        repoUser.deleteAll();
    }

    @Test
    @DisplayName("Если комната найдена, то возвращаются все её заметки (без пагинации)")
    void getRoomNotes_roomExists_returnsMappedNotes() {
        // Arrange
        Room roomTarget = new Room("Тестовая комната", "Android", RoomStatus.ACTIVE, Instant.now());
        roomTarget = repoRoom.save(roomTarget);

        Note noteFirst = new Note("Заметка 1", "00:00", Instant.now().minusSeconds(10), roomTarget, userInterviewer);
        Note noteSecond = new Note("Заметка 2", "00:05", Instant.now(), roomTarget, userInterviewer);
        repoNote.save(noteFirst);
        repoNote.save(noteSecond);

        // Act
        var responseList = serviceQueryNote.getRoomNotes(roomTarget.getId());

        // Assert
        assertThat(responseList).isNotNull();
        assertThat(responseList.listNotes()).hasSize(2);
        assertThat(responseList.listNotes().getFirst().textContent()).isEqualTo("Заметка 1");
        assertThat(responseList.listNotes().get(1).textContent()).isEqualTo("Заметка 2");
    }

    @Test
    @DisplayName("Если комната не найдена при запросе всех заметок - выбрасывается ошибка")
    void getRoomNotes_roomNotFound_throwsBusinessException() {
        // Arrange
        UUID idRoomRandom = UUID.randomUUID();

        // Act & Assert
        assertThatThrownBy(() -> serviceQueryNote.getRoomNotes(idRoomRandom))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Если комната найдена, метод возвращает постраничный результат заметок")
    void getRoomNotesPaged_roomExists_returnsPagedNotes() {
        // Arrange
        Room roomTarget = new Room("Комната с пагинацией", "QA", RoomStatus.ACTIVE, Instant.now());
        roomTarget = repoRoom.save(roomTarget);

        Note noteFirst = new Note("Страница 1", "00:00", Instant.now(), roomTarget, userInterviewer);
        repoNote.save(noteFirst);

        // Act
        Page<NoteResponse> pageResult = serviceQueryNote.getRoomNotesPaged(roomTarget.getId(), 0, 10);

        // Assert
        assertThat(pageResult).isNotNull();
        assertThat(pageResult.getTotalElements()).isEqualTo(1);
        assertThat(pageResult.getContent().getFirst().textContent()).isEqualTo("Страница 1");
    }
}
