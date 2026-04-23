package ro.teza.realestate.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ro.teza.realestate.entity.Filter;

import java.util.List;
import java.util.Optional;

public interface FilterRepository extends JpaRepository<Filter, Long> {

    Optional<Filter> findByName(String name);

    List<Filter> findByActiveTrueOrderByNameAsc();

    List<Filter> findAllByOrderByCreatedAtDesc();

    boolean existsByName(String name);
}
