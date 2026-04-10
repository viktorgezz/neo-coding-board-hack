package ru.viktorgezz.business_service.domain.user.service.impl;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import ru.viktorgezz.business_service.domain.candidate.Candidate;
import ru.viktorgezz.business_service.domain.user.Role;
import ru.viktorgezz.business_service.domain.user.User;
import ru.viktorgezz.business_service.domain.user.dto.UserResponse;
import ru.viktorgezz.business_service.domain.user.dto.UserUpdateRequest;
import ru.viktorgezz.business_service.domain.user.repo.UserRepo;
import ru.viktorgezz.business_service.exception.BusinessException;
import ru.viktorgezz.business_service.testconfig.AbstractIntegrationPostgresTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Интеграционные тесты для UserCommandServiceImpl")
class UserCommandServiceImplIT extends AbstractIntegrationPostgresTest {

    @Autowired
    private UserCommandServiceImpl serviceUserCommand;

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
    @DisplayName("Успешное сохранение нового пользователя")
    void save_validUser_returnsSavedUser() {
        // Arrange
        User userNew = new User("new_hr", "password", Role.HR);

        // Act
        User userSaved = serviceUserCommand.save(userNew);

        // Assert
        assertThat(userSaved).isNotNull();
        assertThat(userSaved.getId()).isNotNull();
        assertThat(repoUser.findById(userSaved.getId())).isPresent();
    }

    @Test
    @DisplayName("Обновление данных сотрудника (HR/Интервьюер) изменяет его username")
    void updateUser_validStaff_updatesUsername() {
        // Arrange
        User userStaff = new User("old_name", "password", Role.HR);
        userStaff = repoUser.save(userStaff);

        UserUpdateRequest requestUpdate = new UserUpdateRequest("new_name", Role.HR);

        // Act
        UserResponse responseUpdated = serviceUserCommand.updateUser(userStaff.getId(), requestUpdate);

        // Assert
        assertThat(responseUpdated.username()).isEqualTo("new_name");
        assertThat(responseUpdated.role()).isEqualTo(Role.HR);
        
        User userUpdated = repoUser.findById(userStaff.getId()).orElseThrow();
        assertThat(userUpdated.getUsername()).isEqualTo("new_name");
    }

    @Test
    @DisplayName("Обновление данных кандидата изменяет его fullName в сущности Candidate")
    void updateUser_validCandidate_updatesFullName() {
        // Arrange
        User userCandidate = new User("candidate_login", "password", Role.CANDIDATE);
        Candidate candidateInfo = new Candidate("Old Candidate Name", userCandidate);
        userCandidate.setCandidate(candidateInfo);
        userCandidate = repoUser.save(userCandidate);

        UserUpdateRequest requestUpdate = new UserUpdateRequest("New Candidate Name", Role.CANDIDATE);

        // Act
        UserResponse responseUpdated = serviceUserCommand.updateUser(userCandidate.getId(), requestUpdate);

        // Assert
        assertThat(responseUpdated.username()).isEqualTo("New Candidate Name");
        
        User userUpdated = repoUser.findWithCandidateById(userCandidate.getId()).orElseThrow();
        assertThat(userUpdated.getCandidate().getFullName()).isEqualTo("New Candidate Name");
        // Логин в таблице users не должен меняться
        assertThat(userUpdated.getUsername()).isEqualTo("candidate_login");
    }

    @Test
    @DisplayName("Удаление существующего пользователя проходит успешно")
    void deleteUser_existingUser_deletesUser() {
        // Arrange
        User userTarget = new User("to_delete", "password", Role.INTERVIEWER);
        userTarget = repoUser.save(userTarget);

        // Act
        serviceUserCommand.deleteUser(userTarget.getId());

        // Assert
        assertThat(repoUser.findById(userTarget.getId())).isEmpty();
    }

    @Test
    @DisplayName("Выброс исключения при попытке удалить несуществующего пользователя")
    void deleteUser_notExisting_throwsException() {
        // Act & Assert
        assertThatThrownBy(() -> serviceUserCommand.deleteUser(999L))
                .isInstanceOf(BusinessException.class);
    }
}
