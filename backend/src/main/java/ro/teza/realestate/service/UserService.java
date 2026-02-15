package ro.teza.realestate.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.teza.realestate.audit.service.AuditService;
import ro.teza.realestate.dto.UserDto;
import ro.teza.realestate.entity.Role;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.repository.UserRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return Optional.empty();
        }
        return findByUsername(auth.getName());
    }

    @Transactional
    public User register(String username, String password, String email, Set<Role> roles, HttpServletRequest request) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (email != null && !email.isBlank() && userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setRoles(roles != null && !roles.isEmpty() ? roles : Set.of(Role.USER));
        user = userRepository.save(user);
        auditService.log(username, "REGISTER", "User", user.getId().toString(), "New user registration", request);
        return user;
    }

    @Transactional
    public void recordLogin(User user, HttpServletRequest request) {
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        auditService.log(user.getUsername(), "LOGIN", "User", user.getId().toString(), "User logged in", request);
    }

    public UserDto toDto(User user) {
        if (user == null) return null;
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setRoles(user.getRoles());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setLastLoginAt(user.getLastLoginAt());
        dto.setHasTelegramLinked(user.getTelegramChatId() != null && !user.getTelegramChatId().isBlank());
        return dto;
    }

    @Transactional(readOnly = true)
    public java.util.List<UserDto> findAllUsers() {
        return userRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public User updateUser(Long id, String username, String email, Set<Role> roles, String newPassword, User admin, HttpServletRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (username != null && !username.isBlank()) user.setUsername(username);
        if (email != null) user.setEmail(email);
        if (roles != null) user.setRoles(roles);
        if (newPassword != null && !newPassword.isBlank()) {
            user.setPassword(passwordEncoder.encode(newPassword));
        }
        user = userRepository.save(user);
        auditService.log(admin.getUsername(), "UPDATE_USER", "User", user.getId().toString(), "User updated by admin", request);
        return user;
    }

    @Transactional
    public void deleteUser(Long id, User admin, HttpServletRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        userRepository.delete(user);
        auditService.log(admin.getUsername(), "DELETE_USER", "User", id.toString(), "User deleted by admin", request);
    }

    @Transactional
    public User createUser(String username, String password, String email, Set<Role> roles, User admin, HttpServletRequest request) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists");
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setRoles(roles != null && !roles.isEmpty() ? roles : Set.of(Role.USER));
        user = userRepository.save(user);
        auditService.log(admin.getUsername(), "CREATE_USER", "User", user.getId().toString(), "User created by admin", request);
        return user;
    }
}
