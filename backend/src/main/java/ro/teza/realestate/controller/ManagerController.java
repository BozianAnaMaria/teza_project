package ro.teza.realestate.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ro.teza.realestate.dto.LabelDto;
import ro.teza.realestate.entity.Label;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.service.LabelService;
import ro.teza.realestate.service.UserService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/manager")
public class ManagerController {

    private final LabelService labelService;
    private final UserService userService;

    public ManagerController(LabelService labelService, UserService userService) {
        this.labelService = labelService;
        this.userService = userService;
    }

    // Label Management Endpoints (MANAGER and ADMIN)

    @GetMapping("/labels")
    public ResponseEntity<List<LabelDto>> listLabels() {
        return ResponseEntity.ok(labelService.findAll());
    }

    @GetMapping("/labels/{id}")
    public ResponseEntity<LabelDto> getLabelById(@PathVariable Long id) {
        return labelService.findLabelDtoById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/labels")
    public ResponseEntity<?> createLabel(@Valid @RequestBody LabelDto dto, HttpServletRequest request) {
        User manager = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        try {
            Label label = labelService.create(dto, manager, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(labelService.toDto(label));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/labels/{id}")
    public ResponseEntity<?> updateLabel(@PathVariable Long id, @Valid @RequestBody LabelDto dto, HttpServletRequest request) {
        User manager = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        try {
            Label label = labelService.update(id, dto, manager, request);
            return ResponseEntity.ok(labelService.toDto(label));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/labels/{id}")
    public ResponseEntity<?> deleteLabel(@PathVariable Long id, HttpServletRequest request) {
        User manager = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        try {
            labelService.delete(id, manager, request);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Assign/Remove Labels to/from Offers

    @PostMapping("/offers/{offerId}/labels/{labelId}")
    public ResponseEntity<?> addLabelToOffer(@PathVariable Long offerId, @PathVariable Long labelId, HttpServletRequest request) {
        User manager = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        try {
            labelService.addLabelToOffer(offerId, labelId, manager, request);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/offers/{offerId}/labels/{labelId}")
    public ResponseEntity<?> removeLabelFromOffer(@PathVariable Long offerId, @PathVariable Long labelId, HttpServletRequest request) {
        User manager = userService.getCurrentUser().orElseThrow(() -> new RuntimeException("Unauthorized"));
        try {
            labelService.removeLabelFromOffer(offerId, labelId, manager, request);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
