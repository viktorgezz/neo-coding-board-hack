package ru.viktorgezz.business_service.domain.rooms.repo;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import ru.viktorgezz.business_service.domain.rooms.Room;

/**
 * Репозиторий для основных CRUD-операций над сущностью {@link Room}.
 */
public interface RoomRepo extends CrudRepository<Room, UUID> {

    @Query("SELECT r FROM Room r LEFT JOIN FETCH r.candidate WHERE r.id = :id")
    Optional<Room> findById(@Param("id") UUID id);
}
