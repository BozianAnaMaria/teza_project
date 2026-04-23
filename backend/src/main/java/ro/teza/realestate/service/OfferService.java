package ro.teza.realestate.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.teza.realestate.audit.service.AuditService;
import ro.teza.realestate.dto.OfferDto;
import ro.teza.realestate.entity.Offer;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.repository.NotificationSubscriptionRepository;
import ro.teza.realestate.repository.OfferRepository;

import java.time.Instant;
import java.util.Optional;

@Service
public class OfferService {

    private final OfferRepository offerRepository;
    private final NotificationSubscriptionRepository subscriptionRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final LabelService labelService;

    public OfferService(OfferRepository offerRepository,
                        NotificationSubscriptionRepository subscriptionRepository,
                        AuditService auditService,
                        NotificationService notificationService,
                        LabelService labelService) {
        this.offerRepository = offerRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.labelService = labelService;
    }

    @Transactional(readOnly = true)
    public Page<OfferDto> findActiveOffers(Pageable pageable, User currentUser) {
        return offerRepository.findByActiveTrueOrderByCreatedAtDesc(pageable)
            .map(offer -> toDto(offer, currentUser));
    }

    @Transactional(readOnly = true)
    public Page<OfferDto> findAllOffers(Pageable pageable, User currentUser) {
        return offerRepository.findAllByOrderByCreatedAtDesc(pageable)
            .map(offer -> toDto(offer, currentUser));
    }

    @Transactional(readOnly = true)
    public Optional<Offer> findById(Long id) {
        return offerRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<OfferDto> findOfferDtoById(Long id, User currentUser) {
        return offerRepository.findById(id).map(offer -> toDto(offer, currentUser));
    }

    @Transactional
    public Offer create(OfferDto dto, User createdBy, HttpServletRequest request) {
        Offer offer = new Offer();
        mapDtoToEntity(dto, offer);
        offer.setCreatedBy(createdBy);
        offer = offerRepository.save(offer);
        auditService.log(createdBy.getUsername(), "CREATE_OFFER", "Offer", offer.getId().toString(), offer.getTitle(), request);

        // Trigger filter-based notifications for the new offer
        notificationService.processNewOffer(offer);

        return offer;
    }

    @Transactional
    public Offer update(Long id, OfferDto dto, User updatedBy, HttpServletRequest request) {
        Offer offer = offerRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Offer not found"));
        mapDtoToEntity(dto, offer);
        offer.setUpdatedAt(Instant.now());
        offer = offerRepository.save(offer);
        auditService.log(updatedBy.getUsername(), "UPDATE_OFFER", "Offer", offer.getId().toString(), offer.getTitle(), request);
        return offer;
    }

    @Transactional
    public void delete(Long id, User deletedBy, HttpServletRequest request) {
        Offer offer = offerRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Offer not found"));
        offerRepository.delete(offer);
        auditService.log(deletedBy.getUsername(), "DELETE_OFFER", "Offer", id.toString(), offer.getTitle(), request);
    }

    public OfferDto toDto(Offer offer, User currentUser) {
        OfferDto dto = new OfferDto();
        dto.setId(offer.getId());
        dto.setTitle(offer.getTitle());
        dto.setDescription(offer.getDescription());
        dto.setPrice(offer.getPrice());
        dto.setLocation(offer.getLocation());
        dto.setImageUrl(offer.getImageUrl());
        dto.setCategory(offer.getCategory());
        dto.setLabels(offer.getLabels().stream()
            .map(labelService::toDto)
            .toList());
        dto.setCreatedAt(offer.getCreatedAt());
        dto.setUpdatedAt(offer.getUpdatedAt());
        dto.setActive(offer.isActive());
        boolean subscribed = currentUser != null && subscriptionRepository.existsByUserAndOffer(currentUser, offer);
        dto.setSubscribed(subscribed);
        return dto;
    }

    private void mapDtoToEntity(OfferDto dto, Offer offer) {
        if (dto.getTitle() != null) offer.setTitle(dto.getTitle());
        if (dto.getDescription() != null) offer.setDescription(dto.getDescription());
        if (dto.getPrice() != null) offer.setPrice(dto.getPrice());
        if (dto.getLocation() != null) offer.setLocation(dto.getLocation());
        if (dto.getImageUrl() != null) offer.setImageUrl(dto.getImageUrl());
        if (dto.getCategory() != null) offer.setCategory(dto.getCategory());
        offer.setActive(dto.isActive());
    }
}
