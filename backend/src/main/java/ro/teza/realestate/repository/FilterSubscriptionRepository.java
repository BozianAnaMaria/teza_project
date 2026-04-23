package ro.teza.realestate.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.teza.realestate.entity.Filter;
import ro.teza.realestate.entity.FilterSubscription;
import ro.teza.realestate.entity.User;

import java.util.List;
import java.util.Optional;

public interface FilterSubscriptionRepository extends JpaRepository<FilterSubscription, Long> {

    boolean existsByUserAndFilter(User user, Filter filter);

    Optional<FilterSubscription> findByUserAndFilter(User user, Filter filter);

    List<FilterSubscription> findByUser(User user);

    List<FilterSubscription> findByFilter(Filter filter);

    @Query("SELECT fs FROM FilterSubscription fs JOIN FETCH fs.filter WHERE fs.user = :user")
    List<FilterSubscription> findByUserWithFilter(@Param("user") User user);

    @Query("SELECT fs FROM FilterSubscription fs JOIN FETCH fs.user WHERE fs.filter = :filter")
    List<FilterSubscription> findByFilterWithUser(@Param("filter") Filter filter);

    void deleteByUserAndFilter(User user, Filter filter);
}
