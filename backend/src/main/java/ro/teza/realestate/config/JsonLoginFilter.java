package ro.teza.realestate.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Allows login via JSON body: {"username":"...", "password":"..."}
 */
public class JsonLoginFilter extends UsernamePasswordAuthenticationFilter {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {
        if (!"application/json".equalsIgnoreCase(request.getContentType() == null ? "" : request.getContentType().split(";")[0].trim())) {
            return super.attemptAuthentication(request, response);
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> body = objectMapper.readValue(request.getReader().lines().collect(Collectors.joining()), Map.class);
            String username = body.get("username");
            String password = body.get("password");
            if (username == null) username = "";
            if (password == null) password = "";
            UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(username, password, Collections.emptyList());
            setDetails(request, token);
            return getAuthenticationManager().authenticate(token);
        } catch (IOException e) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid JSON body");
        }
    }
}
