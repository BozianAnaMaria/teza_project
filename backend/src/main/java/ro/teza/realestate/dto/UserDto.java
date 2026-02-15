package ro.teza.realestate.dto;

import ro.teza.realestate.entity.Role;

import java.time.Instant;
import java.util.Set;

public class UserDto {

    private Long id;
    private String username;
    private String email;
    private Set<Role> roles;
    private Instant createdAt;
    private Instant lastLoginAt;
    private boolean hasTelegramLinked;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public void setRoles(Set<Role> roles) {
        this.roles = roles;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public boolean isHasTelegramLinked() {
        return hasTelegramLinked;
    }

    public void setHasTelegramLinked(boolean hasTelegramLinked) {
        this.hasTelegramLinked = hasTelegramLinked;
    }
}
