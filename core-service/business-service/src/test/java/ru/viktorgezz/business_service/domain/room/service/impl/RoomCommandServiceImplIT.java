package ru.viktorgezz.business_service.domain.room.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import ru.viktorgezz.business_service.auth.dto.AuthenticationResponse;
import ru.viktorgezz.business_service.auth.dto.RegistrationCandidateRequest;
import ru.viktorgezz.business_service.auth.service.AuthenticationService;
import ru.viktorgezz.business_service.domain.candidate.Candidate;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.dto.RoomCreateRequest;
import ru.viktorgezz.business_service.domain.room.repo.RoomRepo;
import ru.viktorgezz.business_service.domain.user.Role;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.repo.UserRepo;
import ru.viktorgezz.business_service.domain.user.service.intrf.UserQueryService;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.testconfig.AbstractIntegrationPostgresTest;
import ru.viktorgezz.security.service.JwtService;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@DisplayName("Интеграционные тесты для RoomCommandServiceImpl")
class RoomCommandServiceImplIT extends AbstractIntegrationPostgresTest {

    @Autowired
    private RoomCommandServiceImpl serviceCommandRoom;

    @Autowired
    private RoomRepo repoRoom;

    @Autowired
    private UserRepo repoUser;

    @MockitoBean
    private AuthenticationService serviceAuthentication;

    @MockitoBean
    private JwtService serviceJwt;

    @MockitoBean
    private UserQueryService serviceQueryUser;

    private User userInterviewer;

    @BeforeEach
    void setUp() {
        repoRoom.deleteAll();
        repoUser.deleteAll();

        userInterviewer = new User("interviewer_cmd", "password", Role.INTERVIEWER);
        userInterviewer = repoUser.save(userInterviewer);

        var authenticationToken = new UsernamePasswordAuthenticationToken(userInterviewer, null, userInterviewer.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authenticationToken);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        repoRoom.deleteAll();
        repoUser.deleteAll();
    }

    @Test
    @Transactional
    @DisplayName("Успешное создание комнаты интервьюером")
    void createRoom_validRequest_returnsRoomCreated() {
        // Arrange
        RoomCreateRequest requestCreate = new RoomCreateRequest("Новая комната", "Python Developer");

        // Act
        var responseCreated = serviceCommandRoom.createRoom(requestCreate);

        // Assert
        assertThat(responseCreated).isNotNull();
        var roomSaved = repoRoom.findById(UUID.fromString(responseCreated.idRoom())).orElseThrow();
        assertThat(roomSaved.getTitleRoom()).isEqualTo("Новая комната");
        assertThat(roomSaved.getStatus()).isEqualTo(RoomStatus.CREATED);
        assertThat(roomSaved.getInterviewers()).contains(userInterviewer);
    }

    @Test
    @DisplayName("Удаление несуществующей комнаты выбрасывает ошибку")
    void deleteRoom_roomNotFound_throwsBusinessException() {
        // Arrange
        UUID idRoomRandom = UUID.randomUUID();

        // Act & Assert
        assertThatThrownBy(() -> serviceCommandRoom.deleteRoom(idRoomRandom))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Успешное удаление существующей комнаты")
    void deleteRoom_roomExists_deletesRoom() {
        // Arrange
        Room roomTarget = new Room("Удаляемая комната", "Ruby", RoomStatus.CREATED, Instant.now());
        roomTarget = repoRoom.save(roomTarget);
        UUID idRoomTarget = roomTarget.getId();

        // Act
        serviceCommandRoom.deleteRoom(idRoomTarget);

        // Assert
        var roomOptional = repoRoom.findById(idRoomTarget);
        assertThat(roomOptional).isEmpty();
    }

    @Test
    @DisplayName("Успешный старт созданной комнаты")
    void startRoom_roomCreated_roomStarted() {
        // Arrange
        Room roomTarget = new Room("Стартовая", "Rust", RoomStatus.CREATED, Instant.now());
        roomTarget = repoRoom.save(roomTarget);

        // Act
        var responseStarted = serviceCommandRoom.startRoom(roomTarget.getId());

        // Assert
        assertThat(responseStarted.status()).isEqualTo("ACTIVE");
        var roomSaved = repoRoom.findById(roomTarget.getId()).orElseThrow();
        assertThat(roomSaved.getStatus()).isEqualTo(RoomStatus.ACTIVE);
        assertThat(roomSaved.getDateStart()).isNotNull();
    }

    @Test
    @DisplayName("Старт уже запущенной комнаты выбрасывает исключение")
    void startRoom_roomAlreadyStarted_throwsBusinessException() {
        // Arrange
        Room roomTarget = new Room("Активная", "Ruby", RoomStatus.ACTIVE, Instant.now());
        roomTarget = repoRoom.save(roomTarget);

        final Room finalRoomTarget = roomTarget;
        assertThatThrownBy(() -> serviceCommandRoom.startRoom(finalRoomTarget.getId()))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Успешное завершение активной комнаты")
    void finishRoom_roomActive_roomFinished() {
        // Arrange
        Room roomTarget = new Room("Завершаемая", "JS", RoomStatus.ACTIVE, Instant.now());
        roomTarget = repoRoom.save(roomTarget);

        // Act
        var responseFinished = serviceCommandRoom.finishRoom(roomTarget.getId());

        // Assert
        assertThat(responseFinished).isNotNull();
        var roomSaved = repoRoom.findById(roomTarget.getId()).orElseThrow();
        assertThat(roomSaved.getStatus()).isEqualTo(RoomStatus.FINISHED);
        assertThat(roomSaved.getDateEnd()).isNotNull();
    }

    @Test
    @DisplayName("Регистрация кандидата привязывает пользователя к комнате")
    void registerCandidate_validCandidate_bindsToRoom() {
        // Arrange
        Room roomTarget = new Room("Собеседование", "PHP", RoomStatus.CREATED, Instant.now());
        roomTarget = repoRoom.save(roomTarget);

        RegistrationCandidateRequest requestRegister = new RegistrationCandidateRequest("Иванов Иван");
        AuthenticationResponse responseMockAuth = new AuthenticationResponse("accessToken", "refreshToken", "Bearer");
        
        User userCandidate = new User("candidate_test", "password", Role.CANDIDATE);
        Candidate candidateInfo = new Candidate("Иванов Иван", userCandidate);
        userCandidate.setCandidate(candidateInfo);

        // Сохраняем в БД, чтобы сущность перестала быть Transient
        userCandidate = repoUser.save(userCandidate);

        when(serviceAuthentication.registerCandidate(any())).thenReturn(responseMockAuth);
        when(serviceJwt.extractUsername("accessToken")).thenReturn("candidate_test");
        when(serviceQueryUser.findByUsername("candidate_test")).thenReturn(Optional.of(userCandidate));

        // Act
        var responseReg = serviceCommandRoom.registerCandidate(roomTarget.getId(), requestRegister);

        // Assert
        assertThat(responseReg).isNotNull();
        var roomSaved = repoRoom.findById(roomTarget.getId()).orElseThrow();
        
        // Сравниваем по ID, так как equals() не переопределен, а save() возвращает новый инстанс (merge)
        assertThat(roomSaved.getCandidate().getId()).isEqualTo(userCandidate.getCandidate().getId());
    }
}
