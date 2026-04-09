package ru.viktorgezz.business_service.domain.rooms.repo;

import org.springframework.data.repository.CrudRepository;
import ru.viktorgezz.business_service.domain.rooms.Room;

import java.util.UUID;

/**
 * Репозиторий для основных CRUD-операций над сущностью {@link Room}.
 */
public interface RoomRepo extends CrudRepository<Room, UUID> {
}
