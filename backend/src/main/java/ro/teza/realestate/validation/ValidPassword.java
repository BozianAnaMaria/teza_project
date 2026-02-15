package ro.teza.realestate.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = PasswordValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPassword {

    String message() default "Password must be at least 6 characters, with one uppercase, one lowercase, one digit, and one symbol (!#$%&*()-_=+[]{}|;:,.?/~). Avoid quotes, backslash, angle brackets.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
