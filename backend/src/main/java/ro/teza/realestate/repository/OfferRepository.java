package ro.teza.realestate.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.teza.realestate.entity.Offer;

public interface OfferRepository extends JpaRepository<Offer, Long> {

    Page<Offer> findByActiveTrueOrderByCreatedAtDesc(Pageable pageable);

    Page<Offer> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
