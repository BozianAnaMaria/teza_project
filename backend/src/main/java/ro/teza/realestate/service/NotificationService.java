package ro.teza.realestate.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.teza.realestate.dto.FilterCriteriaDto;
import ro.teza.realestate.entity.Filter;
import ro.teza.realestate.entity.FilterSubscription;
import ro.teza.realestate.entity.Offer;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.repository.FilterRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final FilterRepository filterRepository;
    private final FilterService filterService;
    private final FilterSubscriptionService subscriptionService;

    public NotificationService(FilterRepository filterRepository,
                               FilterService filterService,
                               FilterSubscriptionService subscriptionService) {
        this.filterRepository = filterRepository;
        this.filterService = filterService;
        this.subscriptionService = subscriptionService;
    }

    /**
     * Process a newly created offer and notify users subscribed to matching filters.
     * Only notifies for NEW offers, not existing ones.
     */
    @Transactional
    public void processNewOffer(Offer offer) {
        if (offer == null || !offer.isActive()) {
            return;
        }

        logger.info("Processing new offer {} for filter notifications", offer.getId());

        // Get all active filters
        List<Filter> activeFilters = filterRepository.findByActiveTrueOrderByNameAsc();

        Set<User> usersToNotify = new HashSet<>();

        for (Filter filter : activeFilters) {
            FilterCriteriaDto criteria = filterService.jsonToCriteria(filter.getCriteriaJson());

            // Check if offer matches filter criteria
            if (filterService.offerMatchesCriteria(offer, criteria)) {
                logger.info("Offer {} matches filter {}", offer.getId(), filter.getName());

                // Get all subscriptions for this filter
                List<FilterSubscription> subscriptions = subscriptionService.getFilterSubscriptions(filter);

                for (FilterSubscription subscription : subscriptions) {
                    // Only notify if the offer was created after the subscription
                    if (offer.getCreatedAt().isAfter(subscription.getLastNotifiedAt())) {
                        usersToNotify.add(subscription.getUser());
                        subscriptionService.updateLastNotified(subscription);
                        logger.info("User {} will be notified about offer {} (matches filter {})",
                            subscription.getUser().getUsername(), offer.getId(), filter.getName());
                    }
                }
            }
        }

        // Send notifications to users
        for (User user : usersToNotify) {
            sendNotification(user, offer);
        }

        logger.info("Completed processing offer {}. Notified {} users", offer.getId(), usersToNotify.size());
    }

    /**
     * Send notification to a user about a new offer.
     * This is a placeholder - implement actual notification logic (email, push, Telegram, etc.)
     */
    private void sendNotification(User user, Offer offer) {
        // TODO: Implement actual notification mechanism
        // For now, just log it
        logger.info("NOTIFICATION: User {} - New offer: {} (Price: {}, Location: {})",
            user.getUsername(), offer.getTitle(), offer.getPrice(), offer.getLocation());

        // Future implementation could include:
        // - Email notification
        // - Telegram bot notification (using telegramChatId from User entity)
        // - Push notification
        // - In-app notification
    }
}
