package ru.viktorgezz.business_service.domain.room.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.viktorgezz.business_service.domain.room.Room;
import ru.viktorgezz.business_service.domain.room.RoomStatus;
import ru.viktorgezz.business_service.domain.room.dto.RoomSummaryResponse;
import ru.viktorgezz.business_service.domain.room.repo.RoomPagingRepo;
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

@DisplayName("Интеграционные тесты для RoomQueryServiceImpl")
class RoomQueryServiceImplIT extends AbstractIntegrationPostgresTest {

    @Autowired
    private RoomQueryServiceImpl serviceQueryRoom;

    @Autowired
    private RoomRepo repoRoom;

    @Autowired
    private RoomPagingRepo repoPagingRoom;

    @Autowired
    private UserRepo repoUser;

    private User userInterviewer;

    @BeforeEach
    void setUp() {
        repoRoom.deleteAll();
        repoUser.deleteAll();

        userInterviewer = new User("interviewer_query", "password", Role.INTERVIEWER);
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
    @DisplayName("Получение комнат по текущему интервьюеру возвращает ожидаемые данные")
    void getRoomsByCurrentInterviewer_hasRooms_returnsPagedSummary() {
        // Arrange
        Room roomFirst = new Room("Комната 1", "Java", RoomStatus.CREATED, Instant.now());
        roomFirst.getInterviewers().add(userInterviewer);
        repoRoom.save(roomFirst);

        Room roomSecond = new Room("Комната 2", "Go", RoomStatus.ACTIVE, Instant.now());
        repoRoom.save(roomSecond); // Не принадлежит интервьюеру

        int pageIndex = 0;
        int pageSize = 10;

        // Act
        Page<RoomSummaryResponse> responsePage = serviceQueryRoom.getRoomsByCurrentInterviewer(pageIndex, pageSize);

        // Assert
        assertThat(responsePage).isNotNull();
        assertThat(responsePage.getTotalElements()).isEqualTo(1);
        assertThat(responsePage.getContent().getFirst().nameVacancy()).isEqualTo("Java");
        assertThat(responsePage.getContent().getFirst().titleRoom()).isEqualTo("Комната 1");
    }

    @Test
    @DisplayName("Получение всех комнат без фильтра статуса возвращает все комнаты")
    void getAllRooms_noFilter_returnsAllRoomsPaged() {
        // Arrange
        Room roomFirst = new Room("Все комнаты 1", "Java", RoomStatus.CREATED, Instant.now());
        Room roomSecond = new Room("Все комнаты 2", "Go", RoomStatus.ACTIVE, Instant.now());
        repoRoom.save(roomFirst);
        repoRoom.save(roomSecond);

        int pageIndex = 0;
        int pageSize = 5;

        // Act
        Page<RoomSummaryResponse> responsePage = serviceQueryRoom.getAllRooms(pageIndex, pageSize, null);

        // Assert
        assertThat(responsePage).isNotNull();
        assertThat(responsePage.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("Получение информации о подключении возвращает данные для существующей комнаты")
    void getJoinInfo_roomExists_returnsJoinInfo() {
        // Arrange
        Room roomTarget = new Room("Целевая комната", "C++", RoomStatus.CREATED, Instant.now());
        roomTarget = repoRoom.save(roomTarget);

        // Act
        var responseInfoJoin = serviceQueryRoom.getJoinInfo(roomTarget.getId());

        // Assert
        assertThat(responseInfoJoin).isNotNull();
        assertThat(responseInfoJoin.titleRoom()).isEqualTo("Целевая комната");
        assertThat(responseInfoJoin.nameVacancy()).isEqualTo("C++");
    }

    @Test
    @DisplayName("Получение информации о подключении при отсутствии комнаты выбрасывает исключение")
    void getJoinInfo_roomNotFound_throwsBusinessException() {
        // Arrange
        UUID idRoomRandom = UUID.randomUUID();

        // Act & Assert
        assertThatThrownBy(() -> serviceQueryRoom.getJoinInfo(idRoomRandom))
                .isInstanceOf(BusinessException.class);
    }
}
