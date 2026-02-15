package ro.teza.realestate.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Password rules: min 6 chars, at least one upper, one lower, one digit, one safe symbol.
 * Safe symbols (no SQL/XSS risk): ! # $ % & * ( ) - _ = + [ ] { } | ; : , . ? / ~
 * Excluded: ' " \ ` < >
 */
public class PasswordValidator implements ConstraintValidator<ValidPassword, String> {

    private static final String SAFE_SYMBOLS = "!#$%&*()-_=+[]{}|;:,.?/~";

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isEmpty()) {
            return true; // use @NotBlank for null/empty
        }
        if (value.length() < 6) {
            return false;
        }
        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        boolean hasSymbol = false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
            else if (SAFE_SYMBOLS.indexOf(c) >= 0) hasSymbol = true;
        }
        return hasUpper && hasLower && hasDigit && hasSymbol;
    }
}
