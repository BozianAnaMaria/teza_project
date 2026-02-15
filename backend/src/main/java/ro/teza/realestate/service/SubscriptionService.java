package ro.teza.realestate.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.teza.realestate.audit.service.AuditService;
import ro.teza.realestate.entity.NotificationSubscription;
import ro.teza.realestate.entity.Offer;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.repository.NotificationSubscriptionRepository;
import ro.teza.realestate.repository.OfferRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SubscriptionService {

    private final NotificationSubscriptionRepository subscriptionRepository;
    private final OfferRepository offerRepository;
    private final AuditService auditService;

    public SubscriptionService(NotificationSubscriptionRepository subscriptionRepository,
                               OfferRepository offerRepository,
                               AuditService auditService) {
        this.subscriptionRepository = subscriptionRepository;
        this.offerRepository = offerRepository;
        this.auditService = auditService;
    }

    @Transactional
    public NotificationSubscription subscribe(User user, Long offerId, HttpServletRequest request) {
        Offer offer = offerRepository.findById(offerId).orElseThrow(() -> new IllegalArgumentException("Offer not found"));
        if (subscriptionRepository.existsByUserAndOffer(user, offer)) {
            return subscriptionRepository.findByUserAndOffer(user, offer).orElseThrow();
        }
        NotificationSubscription sub = new NotificationSubscription();
        sub.setUser(user);
        sub.setOffer(offer);
        sub = subscriptionRepository.save(sub);
        auditService.log(user.getUsername(), "SUBSCRIBE_OFFER", "Offer", offerId.toString(), "Subscribed to: " + offer.getTitle(), request);
        return sub;
    }

    @Transactional
    public void unsubscribe(User user, Long offerId, HttpServletRequest request) {
        Offer offer = offerRepository.findById(offerId).orElseThrow(() -> new IllegalArgumentException("Offer not found"));
        subscriptionRepository.findByUserAndOffer(user, offer).ifPresent(sub -> {
            subscriptionRepository.delete(sub);
            auditService.log(user.getUsername(), "UNSUBSCRIBE_OFFER", "Offer", offerId.toString(), "Unsubscribed from: " + offer.getTitle(), request);
        });
    }

    @Transactional(readOnly = true)
    public List<SubscriptionInfo> findAllSubscriptions() {
        return subscriptionRepository.findAllWithUserAndOffer().stream()
            .map(sub -> new SubscriptionInfo(
                sub.getId(),
                sub.getUser().getId(),
                sub.getUser().getUsername(),
                sub.getOffer().getId(),
                sub.getOffer().getTitle(),
                sub.getSubscribedAt()
            ))
            .collect(Collectors.toList());
    }

    public record SubscriptionInfo(long subscriptionId, long userId, String username, long offerId, String offerTitle, java.time.Instant subscribedAt) {}
}
