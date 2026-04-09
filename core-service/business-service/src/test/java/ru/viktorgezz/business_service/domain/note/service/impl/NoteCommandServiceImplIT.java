package ru.viktorgezz.business_service.domain.note.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.domain.note.Note;
import ru.viktorgezz.business_service.domain.note.dto.NoteCreateRequest;
import ru.viktorgezz.business_service.domain.note.dto.NoteUpdateRequest;
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

@DisplayName("Интеграционные тесты для NoteCommandServiceImpl")
class NoteCommandServiceImplIT extends AbstractIntegrationPostgresTest {

    @Autowired
    private NoteCommandServiceImpl serviceCommandNote;

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

        userInterviewer = new User("interviewer_nc", "password", Role.INTERVIEWER);
        userInterviewer = repoUser.save(userInterviewer);

        var authenticationToken = new UsernamePasswordAuthenticationToken(userInterviewer, null, userInterviewer.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authenticationToken);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        repoNote.deleteAll();
        repoRoom.deleteAll();
        repoUser.deleteAll();
    }

    @Test
    @Transactional
    @DisplayName("Успешное создание заметки, если комната активна")
    void createNote_roomActiveAndValidRequest_createsNote() {
        // Arrange
        Room roomTarget = new Room("Комната 1", "Rust", RoomStatus.ACTIVE, Instant.now());
        roomTarget.setDateStart(Instant.now().minusSeconds(60));
        roomTarget = repoRoom.save(roomTarget);

        NoteCreateRequest requestCreate = new NoteCreateRequest("кандидат знает синтаксис");

        // Act
        var responseCreated = serviceCommandNote.createNote(roomTarget.getId(), requestCreate);

        // Assert
        assertThat(responseCreated).isNotNull();
        var noteSaved = repoNote.findById(Long.parseLong(responseCreated.id())).orElseThrow();
        assertThat(noteSaved.getTextContent()).isEqualTo("кандидат знает синтаксис");
        assertThat(noteSaved.getInterviewer().getId()).isEqualTo(userInterviewer.getId());
    }

    @Test
    @DisplayName("Создание заметки в неактивной комнате выбрасывает ошибку")
    void createNote_roomNotActive_throwsBusinessException() {
        // Arrange
        Room roomTarget = new Room("Комната 2", "Go", RoomStatus.CREATED, Instant.now());
        roomTarget = repoRoom.save(roomTarget);

        NoteCreateRequest requestCreate = new NoteCreateRequest("Текст");

        // Act & Assert
        final Room finalRoomTarget = roomTarget;
        assertThatThrownBy(() -> serviceCommandNote.createNote(finalRoomTarget.getId(), requestCreate))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @Transactional
    @DisplayName("Успешное обновление существующей заметки")
    void updateNote_validRequest_updatesContent() {
        // Arrange
        Room roomTarget = new Room("Комната 3", "Python", RoomStatus.ACTIVE, Instant.now());
        roomTarget = repoRoom.save(roomTarget);

        Note noteTarget = new Note("Старый текст", "01:00", Instant.now(), roomTarget, userInterviewer);
        noteTarget = repoNote.save(noteTarget);

        NoteUpdateRequest requestUpdate = new NoteUpdateRequest("Новый текст");

        // Act
        var responseUpdate = serviceCommandNote.updateNote(roomTarget.getId(), noteTarget.getId(), requestUpdate);

        // Assert
        assertThat(responseUpdate).isNotNull();
        var noteSaved = repoNote.findById(noteTarget.getId()).orElseThrow();
        assertThat(noteSaved.getTextContent()).isEqualTo("Новый текст");
        assertThat(noteSaved.getTimeUpdated()).isNotNull();
    }

    @Test
    @DisplayName("Обновление несуществующей заметки выбрасывает ошибку")
    void updateNote_noteNotFound_throwsBusinessException() {
        // Arrange
        UUID idRoomRandom = UUID.randomUUID();
        Long idNoteRandom = 999L;
        NoteUpdateRequest requestUpdate = new NoteUpdateRequest("update");

        // Act & Assert
        assertThatThrownBy(() -> serviceCommandNote.updateNote(idRoomRandom, idNoteRandom, requestUpdate))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Успешное удаление существующей заметки")
    void deleteNote_noteExists_deletesNote() {
        // Arrange
        Room roomTarget = new Room("Комната 4", "JS", RoomStatus.ACTIVE, Instant.now());
        roomTarget = repoRoom.save(roomTarget);

        Note noteTarget = new Note("К удалению", "00:10", Instant.now(), roomTarget, userInterviewer);
        noteTarget = repoNote.save(noteTarget);

        // Act
        serviceCommandNote.deleteNote(roomTarget.getId(), noteTarget.getId());

        // Assert
        var emptyNote = repoNote.findById(noteTarget.getId());
        assertThat(emptyNote).isEmpty();
    }
}
