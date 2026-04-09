package ru.viktorgezz.business_service.domain.room.repo;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.ListCrudRepository;
import org.springframework.data.repository.query.Param;
import ru.viktorgezz.business_service.domain.room.Room;

import java.util.Optional;
import java.util.UUID;

/**
 * Репозиторий для основных CRUD-операций над сущностью {@link Room}.
 */
public interface RoomRepo extends ListCrudRepository<Room, UUID> {

    @Query("SELECT r FROM Room r LEFT JOIN FETCH r.candidate WHERE r.id = :id")
    Optional<Room> findById(@Param("id") UUID id);
}
