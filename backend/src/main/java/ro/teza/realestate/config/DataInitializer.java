package ro.teza.realestate.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import ro.teza.realestate.entity.Offer;
import ro.teza.realestate.entity.Role;
import ro.teza.realestate.entity.User;
import ro.teza.realestate.repository.OfferRepository;
import ro.teza.realestate.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Creates default admin and manager users (with compliant passwords) and 5 sample
 * real estate offers in Romanian style (999.md-like). Change passwords in production!
 */
@Configuration
public class DataInitializer {

    @Bean
    public ApplicationRunner initUsersAndOffers(UserRepository userRepository,
                                                OfferRepository offerRepository,
                                                PasswordEncoder passwordEncoder) {
        return args -> {
            // Ensure admin and manager exist with current passwords (fixes existing DBs that had old passwords)
            User admin = userRepository.findByUsername("admin").orElse(null);
            if (admin == null) {
                admin = new User();
                admin.setUsername("admin");
                admin.setEmail("admin@example.com");
                admin.setRoles(Set.of(Role.ADMIN));
            }
            admin.setPassword(passwordEncoder.encode("Admin1!"));
            admin = userRepository.save(admin);

            User manager = userRepository.findByUsername("manager").orElse(null);
            if (manager == null) {
                manager = new User();
                manager.setUsername("manager");
                manager.setEmail("manager@example.com");
                manager.setRoles(Set.of(Role.MANAGER));
            }
            manager.setPassword(passwordEncoder.encode("Manager1!"));
            userRepository.save(manager);

            if (offerRepository.count() > 0) return;

            String[][] offers = {
                { "Apartament 2 camere, centru Chișinău", "Apartament modern, 2 camere, 52 mp, centru Chișinău. Balcon, parcare.", "75000", "Chișinău, str. Ștefan cel Mare", "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400" },
                { "Casă cu 2 niveluri, Băcioi", "Casă individuală, 3 camere, 120 mp, teren 5 ari. Garaj, grădină.", "145000", "Băcioi, raionul Chișinău", "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400" },
                { "Apartament 3 camere, Botanica", "Apartament spațios, 3 camere, 78 mp, bloc nou. 2 băi, balcon.", "89500", "Chișinău, sectorul Botanica", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400" },
                { "Garsonieră, Râșcani", "Garsonieră mobilată, 1 cameră, 28 mp. Ideal studenți sau tineri.", "35000", "Chișinău, sectorul Râșcani", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400" },
                { "Apartament 4 camere, Centru", "Apartament premium, 4 camere, 95 mp. Finisaj modern, vedere panoramică.", "165000", "Chișinău, centru", "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400" }
            };

            for (String[] row : offers) {
                Offer o = new Offer();
                o.setTitle(row[0]);
                o.setDescription(row[1]);
                o.setPrice(new BigDecimal(row[2]));
                o.setLocation(row[3]);
                o.setImageUrl(row[4]);
                o.setCreatedBy(admin);
                o.setActive(true);
                offerRepository.save(o);
            }
        };
    }
}
