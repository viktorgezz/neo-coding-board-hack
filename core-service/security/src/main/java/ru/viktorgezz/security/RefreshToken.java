package ru.viktorgezz.security;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;

/**
 * Сущность для хранения refresh-токенов пользователей.
 */

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false)
    private String username;

    @Column(nullable = false, length = 1024, unique = true)
    private String token;

    @Column(nullable = false)
    private Date dateExpiration;

    public RefreshToken(
            String username,
            String token,
            Date dateExpiration
    ) {
        this.username = username;
        this.token = token;
        this.dateExpiration = dateExpiration;
    }
}
