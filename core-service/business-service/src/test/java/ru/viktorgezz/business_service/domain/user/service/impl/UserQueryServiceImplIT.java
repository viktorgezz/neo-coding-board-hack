package ru.viktorgezz.business_service.domain.user.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import ru.viktorgezz.business_service.domain.candidate.Candidate;
import ru.viktorgezz.business_service.domain.user.Role;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.dto.UserResponse;
import ru.viktorgezz.business_service.domain.user.repo.UserRepo;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.testconfig.AbstractIntegrationPostgresTest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Интеграционные тесты для UserQueryServiceImpl")
class UserQueryServiceImplIT extends AbstractIntegrationPostgresTest {

    @Autowired
    private UserQueryServiceImpl serviceUserQuery;

    @Autowired
    private UserRepo repoUser;

    @BeforeEach
    void setUp() {
        repoUser.deleteAll();
    }

    @AfterEach
    void tearDown() {
        repoUser.deleteAll();
    }

    @Test
    @DisplayName("Поиск по username возвращает пользователя, если он существует")
    void findByUsername_existing_returnsUser() {
        // Arrange
        User userTarget = new User("unique_user", "password", Role.HR);
        repoUser.save(userTarget);

        // Act
        Optional<User> resultFound = serviceUserQuery.findByUsername("unique_user");

        // Assert
        assertThat(resultFound).isPresent();
        assertThat(resultFound.get().getUsername()).isEqualTo("unique_user");
    }

    @Test
    @DisplayName("Получение списка сотрудников возвращает только HR и интервьюеров")
    void getStaffMembers_validRequest_returnsOnlyHrAndInterviewer() {
        // Arrange
        repoUser.save(new User("hr_1", "pass", Role.HR));
        repoUser.save(new User("interviewer_1", "pass", Role.INTERVIEWER));
        repoUser.save(new User("candidate_1", "pass", Role.CANDIDATE));

        // Act
        Page<UserResponse> pageStaff = serviceUserQuery.getStaffMembers(0, 10);

        // Assert
        assertThat(pageStaff.getTotalElements()).isEqualTo(2);
        assertThat(pageStaff.getContent())
                .extracting(UserResponse::role)
                .containsExactlyInAnyOrder(Role.HR, Role.INTERVIEWER);
    }

    @Test
    @DisplayName("Получение списка кандидатов возвращает только кандидатов с их полными именами")
    void getCandidates_validRequest_returnsOnlyCandidates() {
        // Arrange
        repoUser.save(new User("hr_2", "pass", Role.HR));

        User userCandidate = new User("cand_login", "pass", Role.CANDIDATE);
        userCandidate.setCandidate(new Candidate("Ivan Ivanov", userCandidate));
        repoUser.save(userCandidate);

        // Act
        Page<UserResponse> pageCandidates = serviceUserQuery.getCandidates(0, 10);

        // Assert
        assertThat(pageCandidates.getTotalElements()).isEqualTo(1);
        UserResponse responseCandidate = pageCandidates.getContent().getFirst();
        assertThat(responseCandidate.role()).isEqualTo(Role.CANDIDATE);
        // Должно возвращаться fullName кандидата, а не его login для роли CANDIDATE
        assertThat(responseCandidate.username()).isEqualTo("Ivan Ivanov");
    }

    @Test
    @DisplayName("Получение информации о сотруднике возвращает его логин")
    void getUserInfo_staffUser_returnsUsername() {
        // Arrange
        User userStaff = new User("staff_login", "password", Role.INTERVIEWER);
        userStaff = repoUser.save(userStaff);

        // Act
        UserResponse responseInfo = serviceUserQuery.getUserInfo(userStaff.getId());

        // Assert
        assertThat(responseInfo.username()).isEqualTo("staff_login");
        assertThat(responseInfo.role()).isEqualTo(Role.INTERVIEWER);
    }

    @Test
    @DisplayName("Получение информации о кандидате возвращает его полное имя")
    void getUserInfo_candidateUser_returnsFullName() {
        // Arrange
        User userCandidate = new User("candidate_login_info", "password", Role.CANDIDATE);
        userCandidate.setCandidate(new Candidate("Petr Petrov", userCandidate));
        userCandidate = repoUser.save(userCandidate);

        // Act
        UserResponse responseInfo = serviceUserQuery.getUserInfo(userCandidate.getId());

        // Assert
        assertThat(responseInfo.username()).isEqualTo("Petr Petrov");
        assertThat(responseInfo.role()).isEqualTo(Role.CANDIDATE);
    }

    @Test
    @DisplayName("Выброс исключения при запросе информации о несуществующем пользователе")
    void getUserInfo_notExisting_throwsException() {
        // Act & Assert
        assertThatThrownBy(() -> serviceUserQuery.getUserInfo(999L))
                .isInstanceOf(BusinessException.class);
    }
}
