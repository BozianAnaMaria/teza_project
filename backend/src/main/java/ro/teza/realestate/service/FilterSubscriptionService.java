package ro.teza.realestate.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.teza.realestate.audit.service.AuditService;
import ro.teza.realestate.dto.FilterSubscriptionDto;
import ro.teza.realestate.entity.Filter;
import ro.teza.realestate.entity.FilterSubscription;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.repository.FilterRepository;
import ro.teza.realestate.repository.FilterSubscriptionRepository;

import java.time.Instant;
import java.util.List;

@Service
public class FilterSubscriptionService {

    private final FilterSubscriptionRepository subscriptionRepository;
    private final FilterRepository filterRepository;
    private final AuditService auditService;

    public FilterSubscriptionService(FilterSubscriptionRepository subscriptionRepository,
                                     FilterRepository filterRepository,
                                     AuditService auditService) {
        this.subscriptionRepository = subscriptionRepository;
        this.filterRepository = filterRepository;
        this.auditService = auditService;
    }

    @Transactional
    public void subscribe(User user, Long filterId, HttpServletRequest request) {
        Filter filter = filterRepository.findById(filterId)
            .orElseThrow(() -> new IllegalArgumentException("Filter not found"));

        if (subscriptionRepository.existsByUserAndFilter(user, filter)) {
            throw new IllegalArgumentException("Already subscribed to this filter");
        }

        FilterSubscription subscription = new FilterSubscription();
        subscription.setUser(user);
        subscription.setFilter(filter);
        subscription.setLastNotifiedAt(Instant.now());

        subscriptionRepository.save(subscription);
        auditService.log(user.getUsername(), "SUBSCRIBE_TO_FILTER", "FilterSubscription",
            filterId.toString(), "Subscribed to filter: " + filter.getName(), request);
    }

    @Transactional
    public void unsubscribe(User user, Long filterId, HttpServletRequest request) {
        Filter filter = filterRepository.findById(filterId)
            .orElseThrow(() -> new IllegalArgumentException("Filter not found"));

        subscriptionRepository.deleteByUserAndFilter(user, filter);
        auditService.log(user.getUsername(), "UNSUBSCRIBE_FROM_FILTER", "FilterSubscription",
            filterId.toString(), "Unsubscribed from filter: " + filter.getName(), request);
    }

    @Transactional(readOnly = true)
    public List<FilterSubscriptionDto> getUserSubscriptions(User user) {
        return subscriptionRepository.findByUserWithFilter(user).stream()
            .map(this::toDto)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<FilterSubscription> getFilterSubscriptions(Filter filter) {
        return subscriptionRepository.findByFilterWithUser(filter);
    }

    @Transactional
    public void updateLastNotified(FilterSubscription subscription) {
        subscription.setLastNotifiedAt(Instant.now());
        subscriptionRepository.save(subscription);
    }

    public FilterSubscriptionDto toDto(FilterSubscription subscription) {
        FilterSubscriptionDto dto = new FilterSubscriptionDto();
        dto.setId(subscription.getId());
        dto.setUserId(subscription.getUser().getId());
        dto.setUsername(subscription.getUser().getUsername());
        dto.setFilterId(subscription.getFilter().getId());
        dto.setFilterName(subscription.getFilter().getName());
        dto.setSubscribedAt(subscription.getSubscribedAt());
        dto.setLastNotifiedAt(subscription.getLastNotifiedAt());
        return dto;
    }
}
