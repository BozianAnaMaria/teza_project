package ro.teza.realestate.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import ro.teza.realestate.dto.UserDto;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.service.UserService;

import java.io.IOException;

public class LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserService userService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LoginSuccessHandler(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        User user = userService.findByUsername(authentication.getName()).orElse(null);
        if (user != null) {
            userService.recordLogin(user, request);
        }
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json");
        UserDto dto = userService.toDto(user);
        objectMapper.writeValue(response.getOutputStream(), dto);
    }
}
