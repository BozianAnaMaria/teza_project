package ro.teza.realestate.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import ro.teza.realestate.entity.NotificationSubscription;
import ro.teza.realestate.entity.Offer;
import ro.teza.realestate.entity.User;

import java.util.List;
import java.util.Optional;

public interface NotificationSubscriptionRepository extends JpaRepository<NotificationSubscription, Long> {

    Optional<NotificationSubscription> findByUserAndOffer(User user, Offer offer);

    boolean existsByUserAndOffer(User user, Offer offer);

    List<NotificationSubscription> findByUserOrderBySubscribedAtDesc(User user);

    List<NotificationSubscription> findByOfferOrderBySubscribedAtDesc(Offer offer);

    @Query("SELECT ns FROM NotificationSubscription ns JOIN FETCH ns.user JOIN FETCH ns.offer")
    List<NotificationSubscription> findAllWithUserAndOffer();
}
