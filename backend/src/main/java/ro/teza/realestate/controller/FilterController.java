package ro.teza.realestate.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ro.teza.realestate.dto.FilterCriteriaDto;
import ro.teza.realestate.dto.FilterDto;
import ro.teza.realestate.dto.FilterSubscriptionDto;
import ro.teza.realestate.dto.OfferDto;
import ro.teza.realestate.entity.Offer;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.service.FilterService;
import ro.teza.realestate.service.FilterSubscriptionService;
import ro.teza.realestate.service.OfferService;
import ro.teza.realestate.service.UserService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/filters")
public class FilterController {

    private final FilterService filterService;
    private final FilterSubscriptionService subscriptionService;
    private final OfferService offerService;
    private final UserService userService;

    public FilterController(FilterService filterService,
                           FilterSubscriptionService subscriptionService,
                           OfferService offerService,
                           UserService userService) {
        this.filterService = filterService;
        this.subscriptionService = subscriptionService;
        this.offerService = offerService;
        this.userService = userService;
    }

    /**
     * List all active filters available for users
     */
    @GetMapping
    public ResponseEntity<List<FilterDto>> listActiveFilters() {
        User currentUser = userService.getCurrentUser().orElse(null);
        return ResponseEntity.ok(filterService.findAllActiveFilters(currentUser));
    }

    /**
     * Get a specific filter by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<FilterDto> getFilterById(@PathVariable Long id) {
        User currentUser = userService.getCurrentUser().orElse(null);
        return filterService.findFilterDtoById(id, currentUser)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Apply filter criteria to get matching offers
     */
    @PostMapping("/apply")
    public ResponseEntity<Page<OfferDto>> applyFilters(
            @RequestBody FilterCriteriaDto criteria,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "true") boolean onlyActive) {
        User currentUser = userService.getCurrentUser().orElse(null);
        Page<Offer> offers = filterService.applyFilters(criteria, PageRequest.of(page, size), onlyActive);
        Page<OfferDto> offerDtos = offers.map(offer -> offerService.toDto(offer, currentUser));
        return ResponseEntity.ok(offerDtos);
    }

    /**
     * Subscribe to a filter to receive notifications
     */
    @PostMapping("/{id}/subscribe")
    public ResponseEntity<?> subscribeToFilter(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.getCurrentUser().orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Please log in to subscribe to filters"));
        }
        try {
            subscriptionService.subscribe(user, id, request);
            return ResponseEntity.ok(Map.of("message", "Successfully subscribed to filter"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Unsubscribe from a filter
     */
    @DeleteMapping("/{id}/subscribe")
    public ResponseEntity<?> unsubscribeFromFilter(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        try {
            subscriptionService.unsubscribe(user, id, request);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get current user's filter subscriptions
     */
    @GetMapping("/subscriptions")
    public ResponseEntity<?> getMySubscriptions() {
        User user = userService.getCurrentUser().orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Please log in to view subscriptions"));
        }
        List<FilterSubscriptionDto> subscriptions = subscriptionService.getUserSubscriptions(user);
        return ResponseEntity.ok(subscriptions);
    }
}
