package ro.teza.realestate.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import ro.teza.realestate.audit.entity.AuditLog;
import ro.teza.realestate.audit.service.AuditService;
import ro.teza.realestate.dto.UserDto;
import ro.teza.realestate.entity.Role;
import ro.teza.realestate.validation.ValidPassword;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.service.UserService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;
    private final AuditService auditService;

    public AdminController(UserService userService, AuditService auditService) {
        this.userService = userService;
        this.auditService = auditService;
    }

    @GetMapping("/users")
    public ResponseEntity<?> listUsers() {
        return ResponseEntity.ok(userService.findAllUsers());
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@Valid @RequestBody CreateUserRequest body, HttpServletRequest request) {
        User admin = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        try {
            Set<Role> roles = body.roles == null ? Set.of(Role.USER) : body.roles.stream().map(Role::valueOf).collect(Collectors.toSet());
            User user = userService.createUser(body.username, body.password, body.email, roles, admin, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(userService.toDto(user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest body, HttpServletRequest request) {
        User admin = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        try {
            Set<Role> roles = body.roles == null ? null : body.roles.stream().map(Role::valueOf).collect(Collectors.toSet());
            User user = userService.updateUser(id, body.username, body.email, roles, body.newPassword, admin, request);
            return ResponseEntity.ok(userService.toDto(user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, HttpServletRequest request) {
        User admin = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        userService.deleteUser(id, admin, request);
        return ResponseEntity.noContent().build();
    }

    private static final List<Map<String, Object>> SAMPLE_OFFERS = List.of(
        Map.<String, Object>of("title", "Apartament 1 cameră, Ciocana", "description", "Garsonieră renovată, 32 mp. Mobilă inclusă.", "price", 42000, "location", "Chișinău, sectorul Ciocana", "imageUrl", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400"),
        Map.<String, Object>of("title", "Penthous cu terasă, Centru", "description", "Penthous 110 mp, terasă 25 mp. Vedere panoramică Chișinău.", "price", 220000, "location", "Chișinău, centru", "imageUrl", "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400"),
        Map.<String, Object>of("title", "Casă de vacanță, Orhei", "description", "Casă 2 etaje, 4 camere, grădină. Liniște, natură.", "price", 78000, "location", "Orhei", "imageUrl", "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400"),
        Map.<String, Object>of("title", "Apartament de închiriat, Botanica", "description", "De închiriat lunar. 2 camere, 55 mp, mobilat.", "price", 450, "location", "Chișinău, Botanica", "imageUrl", "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400"),
        Map.<String, Object>of("title", "Teren pentru construcții, Bălți", "description", "Teren 8 ari, utilități la bord. Zonă rezidențială.", "price", 35000, "location", "Bălți", "imageUrl", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400")
    );

    @GetMapping("/sample-offers")
    public ResponseEntity<List<Map<String, Object>>> sampleOffers() {
        return ResponseEntity.ok(SAMPLE_OFFERS);
    }

    @GetMapping("/audit")
    public ResponseEntity<Page<AuditLog>> auditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String action) {
        Page<AuditLog> logs;
        if (username != null && !username.isBlank()) {
            logs = auditService.findByUsername(username, PageRequest.of(page, size));
        } else if (action != null && !action.isBlank()) {
            logs = auditService.findByAction(action, PageRequest.of(page, size));
        } else {
            logs = auditService.findAll(PageRequest.of(page, size));
        }
        return ResponseEntity.ok(logs);
    }

    public static class CreateUserRequest {
        public String username;
        @ValidPassword
        public String password;
        public String email;
        public Set<String> roles;
    }

    public static class UpdateUserRequest {
        public String username;
        public String email;
        public Set<String> roles;
        @ValidPassword
        public String newPassword;
    }
}
