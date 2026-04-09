package ru.viktorgezz.security;

import org.springframework.security.core.userdetails.UserDetails;

public interface UserDetailsCustom extends UserDetails {

    Long getId();

    String getRoleWithoutPrefix();
}
