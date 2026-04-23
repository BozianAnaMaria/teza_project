package ro.teza.realestate.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.teza.realestate.audit.service.AuditService;
import ro.teza.realestate.dto.FilterCriteriaDto;
import ro.teza.realestate.dto.FilterDto;
import ro.teza.realestate.entity.Filter;
import ro.teza.realestate.entity.Label;
import ro.teza.realestate.entity.Offer;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.repository.FilterRepository;
import ro.teza.realestate.repository.FilterSubscriptionRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class FilterService {

    @PersistenceContext
    private EntityManager entityManager;

    private final FilterRepository filterRepository;
    private final FilterSubscriptionRepository subscriptionRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public FilterService(FilterRepository filterRepository,
                         FilterSubscriptionRepository subscriptionRepository,
                         AuditService auditService) {
        this.filterRepository = filterRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.auditService = auditService;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Transactional(readOnly = true)
    public List<FilterDto> findAllActiveFilters(User currentUser) {
        return filterRepository.findByActiveTrueOrderByNameAsc().stream()
            .map(filter -> toDto(filter, currentUser))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<FilterDto> findAllFilters(User currentUser) {
        return filterRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(filter -> toDto(filter, currentUser))
            .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Filter> findById(Long id) {
        return filterRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<FilterDto> findFilterDtoById(Long id, User currentUser) {
        return filterRepository.findById(id).map(filter -> toDto(filter, currentUser));
    }

    @Transactional
    public Filter create(FilterDto dto, User createdBy, HttpServletRequest request) {
        if (filterRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Filter with name '" + dto.getName() + "' already exists");
        }

        Filter filter = new Filter();
        filter.setName(dto.getName());
        filter.setDescription(dto.getDescription());
        filter.setCriteriaJson(criteriaToJson(dto.getCriteria()));
        filter.setActive(dto.isActive());
        filter.setCreatedBy(createdBy);

        filter = filterRepository.save(filter);
        auditService.log(createdBy.getUsername(), "CREATE_FILTER", "Filter", filter.getId().toString(), filter.getName(), request);
        return filter;
    }

    @Transactional
    public Filter update(Long id, FilterDto dto, User updatedBy, HttpServletRequest request) {
        Filter filter = filterRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Filter not found"));

        if (!filter.getName().equals(dto.getName()) && filterRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Filter with name '" + dto.getName() + "' already exists");
        }

        filter.setName(dto.getName());
        filter.setDescription(dto.getDescription());
        filter.setCriteriaJson(criteriaToJson(dto.getCriteria()));
        filter.setActive(dto.isActive());
        filter.setUpdatedAt(Instant.now());

        filter = filterRepository.save(filter);
        auditService.log(updatedBy.getUsername(), "UPDATE_FILTER", "Filter", filter.getId().toString(), filter.getName(), request);
        return filter;
    }

    @Transactional
    public void delete(Long id, User deletedBy, HttpServletRequest request) {
        Filter filter = filterRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Filter not found"));
        filterRepository.delete(filter);
        auditService.log(deletedBy.getUsername(), "DELETE_FILTER", "Filter", id.toString(), filter.getName(), request);
    }

    @Transactional(readOnly = true)
    public Page<Offer> applyFilters(FilterCriteriaDto criteria, Pageable pageable, boolean onlyActive) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Offer> query = cb.createQuery(Offer.class);
        Root<Offer> offer = query.from(Offer.class);

        List<Predicate> predicates = buildPredicates(criteria, cb, offer, onlyActive);

        query.where(predicates.toArray(new Predicate[0]));
        query.orderBy(cb.desc(offer.get("createdAt")));

        TypedQuery<Offer> typedQuery = entityManager.createQuery(query);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());

        List<Offer> results = typedQuery.getResultList();

        // Count query for pagination
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Offer> countRoot = countQuery.from(Offer.class);
        List<Predicate> countPredicates = buildPredicates(criteria, cb, countRoot, onlyActive);
        countQuery.select(cb.count(countRoot));
        countQuery.where(countPredicates.toArray(new Predicate[0]));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        return new PageImpl<>(results, pageable, total);
    }

    public boolean offerMatchesCriteria(Offer offer, FilterCriteriaDto criteria) {
        if (criteria == null) {
            return true;
        }

        // Category filter
        if (criteria.getCategories() != null && !criteria.getCategories().isEmpty()) {
            if (offer.getCategory() == null || !criteria.getCategories().contains(offer.getCategory())) {
                return false;
            }
        }

        // Label filter
        if (criteria.getLabelIds() != null && !criteria.getLabelIds().isEmpty()) {
            List<Long> offerLabelIds = offer.getLabels().stream().map(Label::getId).toList();
            boolean hasMatchingLabel = criteria.getLabelIds().stream()
                .anyMatch(offerLabelIds::contains);
            if (!hasMatchingLabel) {
                return false;
            }
        }

        // Price filter
        if (criteria.getMinPrice() != null && offer.getPrice().compareTo(criteria.getMinPrice()) < 0) {
            return false;
        }
        if (criteria.getMaxPrice() != null && offer.getPrice().compareTo(criteria.getMaxPrice()) > 0) {
            return false;
        }

        // Date filter
        if (criteria.getStartDate() != null && offer.getCreatedAt().isBefore(criteria.getStartDate())) {
            return false;
        }
        if (criteria.getEndDate() != null && offer.getCreatedAt().isAfter(criteria.getEndDate())) {
            return false;
        }

        // Location filter
        if (criteria.getLocation() != null && !criteria.getLocation().isEmpty()) {
            if (offer.getLocation() == null ||
                !offer.getLocation().toLowerCase().contains(criteria.getLocation().toLowerCase())) {
                return false;
            }
        }

        return true;
    }

    private List<Predicate> buildPredicates(FilterCriteriaDto criteria, CriteriaBuilder cb, Root<Offer> offer, boolean onlyActive) {
        List<Predicate> predicates = new ArrayList<>();

        if (onlyActive) {
            predicates.add(cb.isTrue(offer.get("active")));
        }

        if (criteria == null) {
            return predicates;
        }

        // Category filter
        if (criteria.getCategories() != null && !criteria.getCategories().isEmpty()) {
            predicates.add(offer.get("category").in(criteria.getCategories()));
        }

        // Label filter
        if (criteria.getLabelIds() != null && !criteria.getLabelIds().isEmpty()) {
            Join<Offer, Label> labelsJoin = offer.join("labels");
            predicates.add(labelsJoin.get("id").in(criteria.getLabelIds()));
        }

        // Price filter
        if (criteria.getMinPrice() != null) {
            predicates.add(cb.greaterThanOrEqualTo(offer.get("price"), criteria.getMinPrice()));
        }
        if (criteria.getMaxPrice() != null) {
            predicates.add(cb.lessThanOrEqualTo(offer.get("price"), criteria.getMaxPrice()));
        }

        // Date filter
        if (criteria.getStartDate() != null) {
            predicates.add(cb.greaterThanOrEqualTo(offer.get("createdAt"), criteria.getStartDate()));
        }
        if (criteria.getEndDate() != null) {
            predicates.add(cb.lessThanOrEqualTo(offer.get("createdAt"), criteria.getEndDate()));
        }

        // Location filter
        if (criteria.getLocation() != null && !criteria.getLocation().isEmpty()) {
            predicates.add(cb.like(cb.lower(offer.get("location")), "%" + criteria.getLocation().toLowerCase() + "%"));
        }

        return predicates;
    }

    public FilterDto toDto(Filter filter, User currentUser) {
        FilterDto dto = new FilterDto();
        dto.setId(filter.getId());
        dto.setName(filter.getName());
        dto.setDescription(filter.getDescription());
        dto.setCriteria(jsonToCriteria(filter.getCriteriaJson()));
        dto.setActive(filter.isActive());
        dto.setCreatedAt(filter.getCreatedAt());
        dto.setUpdatedAt(filter.getUpdatedAt());
        if (filter.getCreatedBy() != null) {
            dto.setCreatedBy(filter.getCreatedBy().getUsername());
        }
        boolean subscribed = currentUser != null && subscriptionRepository.existsByUserAndFilter(currentUser, filter);
        dto.setSubscribed(subscribed);
        return dto;
    }

    public String criteriaToJson(FilterCriteriaDto criteria) {
        try {
            return objectMapper.writeValueAsString(criteria);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize filter criteria", e);
        }
    }

    public FilterCriteriaDto jsonToCriteria(String json) {
        try {
            return objectMapper.readValue(json, FilterCriteriaDto.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to deserialize filter criteria", e);
        }
    }
}
