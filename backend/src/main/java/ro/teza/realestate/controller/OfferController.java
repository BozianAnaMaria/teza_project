package ro.teza.realestate.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ro.teza.realestate.dto.OfferDto;
import ro.teza.realestate.entity.Offer;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.service.OfferService;
import ro.teza.realestate.service.SubscriptionService;
import ro.teza.realestate.service.UserService;

import java.util.Optional;

@RestController
@RequestMapping("/api/offers")
public class OfferController {

    private final OfferService offerService;
    private final UserService userService;
    private final SubscriptionService subscriptionService;

    public OfferController(OfferService offerService, UserService userService, SubscriptionService subscriptionService) {
        this.offerService = offerService;
        this.userService = userService;
        this.subscriptionService = subscriptionService;
    }

    @GetMapping
    public Page<OfferDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "false") boolean all) {
        User current = userService.getCurrentUser().orElse(null);
        if (Boolean.TRUE.equals(all) && current != null && (current.getRoles().contains(ro.teza.realestate.entity.Role.MANAGER) || current.getRoles().contains(ro.teza.realestate.entity.Role.ADMIN))) {
            return offerService.findAllOffers(PageRequest.of(page, size), current);
        }
        return offerService.findActiveOffers(PageRequest.of(page, size), current);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OfferDto> getById(@PathVariable Long id) {
        User current = userService.getCurrentUser().orElse(null);
        Optional<OfferDto> dto = offerService.findOfferDtoById(id, current);
        return dto.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<OfferDto> create(@Valid @RequestBody OfferDto dto, HttpServletRequest request) {
        User user = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        Offer offer = offerService.create(dto, user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(offerService.toDto(offer, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OfferDto> update(@PathVariable Long id, @Valid @RequestBody OfferDto dto, HttpServletRequest request) {
        User user = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        Offer offer = offerService.update(id, dto, user, request);
        return ResponseEntity.ok(offerService.toDto(offer, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        offerService.delete(id, user, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/subscribe")
    public ResponseEntity<?> subscribe(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.getCurrentUser().orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of("error", "Please log in or sign up to get notified."));
        }
        subscriptionService.subscribe(user, id, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/subscribe")
    public ResponseEntity<Void> unsubscribe(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        subscriptionService.unsubscribe(user, id, request);
        return ResponseEntity.noContent().build();
    }
}
