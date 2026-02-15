package ro.teza.realestate.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import ro.teza.realestate.service.UserService;

@Configuration
public class AuthConfig {

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public JsonLoginFilter jsonLoginFilter(AuthenticationManager authenticationManager, UserService userService) {
        JsonLoginFilter filter = new JsonLoginFilter();
        filter.setAuthenticationManager(authenticationManager);
        filter.setFilterProcessesUrl("/api/auth/login");
        filter.setAuthenticationSuccessHandler(new LoginSuccessHandler(userService));
        filter.setAuthenticationFailureHandler(new LoginFailureHandler());
        return filter;
    }
}
