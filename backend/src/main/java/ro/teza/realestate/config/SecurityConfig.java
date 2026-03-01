package ro.teza.realestate.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JsonLoginFilter jsonLoginFilter;

    public SecurityConfig(@Lazy JsonLoginFilter jsonLoginFilter) {
        this.jsonLoginFilter = jsonLoginFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/**")
            )
            .addFilterBefore(jsonLoginFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                // Role-based page access: only ADMIN for /admin, MANAGER or ADMIN for /manager
                .requestMatchers("/admin", "/admin/**").hasRole("ADMIN")
                .requestMatchers("/manager", "/manager/**").hasAnyRole("MANAGER", "ADMIN")
                // Static and landing page – allow all (no manager.html / admin.html – use /manager, /admin)
                .requestMatchers("/", "/index.html", "/offers", "/css/**", "/js/**", "/images/**", "/favicon.ico").permitAll()
                // Auth endpoints
                .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/current").permitAll()
                .requestMatchers("/api/auth/logout").authenticated()
                // Public offers list (read-only for anonymous)
                .requestMatchers(HttpMethod.GET, "/api/offers").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/offers/*").permitAll()
                // Subscribe to notifications – requires login (handled in controller: return 401 if not logged in)
                .requestMatchers(HttpMethod.POST, "/api/offers/*/subscribe").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/offers/*/subscribe").authenticated()
                // Manager: add offers
                .requestMatchers(HttpMethod.POST, "/api/offers").hasAnyRole("MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/offers/*").hasAnyRole("MANAGER", "ADMIN")
                // Manager: view who is subscribed to which offer
                .requestMatchers("/api/subscriptions", "/api/subscriptions/*").hasAnyRole("MANAGER", "ADMIN")
                // Admin only: users CRUD, audit logs
                .requestMatchers("/api/admin/users/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/audit/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/offers/*").hasRole("ADMIN")
                // Default: require auth for other API
                .requestMatchers("/api/**").authenticated()
            )
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessHandler((req, res, auth) -> res.setStatus(204))
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.IF_REQUIRED)
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    String uri = request.getRequestURI();
                    String next = ("/manager".equals(uri) || "/admin".equals(uri)) ? "&next=" + uri : "";
                    response.sendRedirect("/?login=1" + next);
                })
                .accessDeniedHandler((HttpServletRequest request, HttpServletResponse response, org.springframework.security.access.AccessDeniedException accessDeniedException) -> {
                    String uri = request.getRequestURI();
                    String next = ("/manager".equals(uri) || "/admin".equals(uri)) ? "&next=" + uri : "";
                    response.sendRedirect("/?login=1" + next);
                })
            );

        return http.build();
    }
}
