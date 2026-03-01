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
import java.nio.charset.StandardCharsets;
import java.util.Collections;

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
        UserDto dto = userService.toDto(user);
        if (dto == null) {
            dto = new UserDto();
            dto.setUsername(authentication.getName());
            dto.setRoles(Collections.emptySet());
        }
        String json = objectMapper.writeValueAsString(dto);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json;charset=UTF-8");
        response.setContentLength(bytes.length);
        response.getOutputStream().write(bytes);
        response.getOutputStream().flush();
    }
}
