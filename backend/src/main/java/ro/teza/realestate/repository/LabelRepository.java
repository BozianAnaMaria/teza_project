package ro.teza.realestate.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ro.teza.realestate.entity.Label;

import java.util.List;
import java.util.Optional;

public interface LabelRepository extends JpaRepository<Label, Long> {

    Optional<Label> findByName(String name);

    List<Label> findAllByOrderByNameAsc();

    boolean existsByName(String name);
}
