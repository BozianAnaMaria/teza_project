package ro.teza.realestate.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.teza.realestate.audit.service.AuditService;
import ro.teza.realestate.dto.LabelDto;
import ro.teza.realestate.entity.Label;
import ro.teza.realestate.entity.Offer;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.repository.LabelRepository;
import ro.teza.realestate.repository.OfferRepository;

import java.util.List;
import java.util.Optional;

@Service
public class LabelService {

    private final LabelRepository labelRepository;
    private final OfferRepository offerRepository;
    private final AuditService auditService;

    public LabelService(LabelRepository labelRepository,
                        OfferRepository offerRepository,
                        AuditService auditService) {
        this.labelRepository = labelRepository;
        this.offerRepository = offerRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<LabelDto> findAll() {
        return labelRepository.findAllByOrderByNameAsc().stream()
            .map(this::toDto)
            .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Label> findById(Long id) {
        return labelRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<LabelDto> findLabelDtoById(Long id) {
        return labelRepository.findById(id).map(this::toDto);
    }

    @Transactional
    public Label create(LabelDto dto, User createdBy, HttpServletRequest request) {
        if (labelRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Label with name '" + dto.getName() + "' already exists");
        }

        Label label = new Label();
        label.setName(dto.getName());
        label.setDescription(dto.getDescription());
        label.setColor(dto.getColor());

        label = labelRepository.save(label);
        auditService.log(createdBy.getUsername(), "CREATE_LABEL", "Label", label.getId().toString(), label.getName(), request);
        return label;
    }

    @Transactional
    public Label update(Long id, LabelDto dto, User updatedBy, HttpServletRequest request) {
        Label label = labelRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Label not found"));

        if (!label.getName().equals(dto.getName()) && labelRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Label with name '" + dto.getName() + "' already exists");
        }

        label.setName(dto.getName());
        label.setDescription(dto.getDescription());
        label.setColor(dto.getColor());

        label = labelRepository.save(label);
        auditService.log(updatedBy.getUsername(), "UPDATE_LABEL", "Label", label.getId().toString(), label.getName(), request);
        return label;
    }

    @Transactional
    public void delete(Long id, User deletedBy, HttpServletRequest request) {
        Label label = labelRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Label not found"));
        labelRepository.delete(label);
        auditService.log(deletedBy.getUsername(), "DELETE_LABEL", "Label", id.toString(), label.getName(), request);
    }

    @Transactional
    public void addLabelToOffer(Long offerId, Long labelId, User user, HttpServletRequest request) {
        Offer offer = offerRepository.findById(offerId)
            .orElseThrow(() -> new IllegalArgumentException("Offer not found"));
        Label label = labelRepository.findById(labelId)
            .orElseThrow(() -> new IllegalArgumentException("Label not found"));

        offer.addLabel(label);
        offerRepository.save(offer);
        auditService.log(user.getUsername(), "ADD_LABEL_TO_OFFER", "Offer", offerId.toString(),
            "Added label '" + label.getName() + "' to offer '" + offer.getTitle() + "'", request);
    }

    @Transactional
    public void removeLabelFromOffer(Long offerId, Long labelId, User user, HttpServletRequest request) {
        Offer offer = offerRepository.findById(offerId)
            .orElseThrow(() -> new IllegalArgumentException("Offer not found"));
        Label label = labelRepository.findById(labelId)
            .orElseThrow(() -> new IllegalArgumentException("Label not found"));

        offer.removeLabel(label);
        offerRepository.save(offer);
        auditService.log(user.getUsername(), "REMOVE_LABEL_FROM_OFFER", "Offer", offerId.toString(),
            "Removed label '" + label.getName() + "' from offer '" + offer.getTitle() + "'", request);
    }

    public LabelDto toDto(Label label) {
        LabelDto dto = new LabelDto();
        dto.setId(label.getId());
        dto.setName(label.getName());
        dto.setDescription(label.getDescription());
        dto.setColor(label.getColor());
        dto.setCreatedAt(label.getCreatedAt());
        return dto;
    }
}
