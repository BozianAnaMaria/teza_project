package ro.teza.realestate.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import ro.teza.realestate.validation.ValidPassword;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ro.teza.realestate.dto.UserDto;
import ro.teza.realestate.entity.Role;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.service.UserService;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request) {
        try {
            User user = userService.register(
                body.username,
                body.password,
                body.email,
                Set.of(Role.USER),
                request
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(userService.toDto(user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/current")
    public ResponseEntity<UserDto> current() {
        return userService.getCurrentUser()
            .map(user -> ResponseEntity.ok(userService.toDto(user)))
            .orElse(ResponseEntity.ok(null));
    }

    public static class RegisterRequest {
        @NotBlank
        @Size(min = 2, max = 100)
        private String username;
        @NotBlank
        @Size(min = 6)
        @ValidPassword
        private String password;
        @Size(max = 255)
        private String email;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }
}
