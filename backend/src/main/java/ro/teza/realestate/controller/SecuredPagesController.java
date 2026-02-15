package ro.teza.realestate.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

/**
 * Serves manager and admin HTML only to authorized users.
 * Direct URLs /manager.html and /admin.html are not exposed; use /manager and /admin.
 */
@RestController
public class SecuredPagesController {

    @GetMapping(value = "/manager", produces = MediaType.TEXT_HTML_VALUE)
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<String> manager(@AuthenticationPrincipal UserDetails user) throws Exception {
        return serveTemplate("templates/manager.html");
    }

    @GetMapping(value = "/admin", produces = MediaType.TEXT_HTML_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> admin(@AuthenticationPrincipal UserDetails user) throws Exception {
        return serveTemplate("templates/admin.html");
    }

    private ResponseEntity<String> serveTemplate(String path) throws Exception {
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        String html = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            .body(html);
    }
}
