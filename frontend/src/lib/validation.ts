/**
 * Lightweight client-side form validation.
 *
 * The forms previously relied solely on the HTML `required` attribute, which
 * does not block whitespace-only input and is bypassed entirely when the form
 * is submitted programmatically. These helpers give each form a single,
 * explicit validation pass before it calls the API.
 */

/** True when a value is empty or contains only whitespace. */
export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when a value looks like a syntactically valid email address. */
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** A map of field name → error message. Empty object means "valid". */
export type Errors<T extends string = string> = Partial<Record<T, string>>;

/** Require a non-blank string, returning an error message or `undefined`. */
export function required(value: string, label = "This field"): string | undefined {
  return isBlank(value) ? `${label} is required` : undefined;
}

/** Require a valid email, returning an error message or `undefined`. */
export function email(value: string, label = "Email"): string | undefined {
  if (isBlank(value)) return `${label} is required`;
  return isValidEmail(value) ? undefined : `Enter a valid email address`;
}

/**
 * Require a value that parses to an integer >= `min`.
 * Used for fields like "total copies" where empty/garbage must be rejected.
 */
export function integerAtLeast(
  value: string,
  min: number,
  label = "This field"
): string | undefined {
  if (isBlank(value)) return `${label} is required`;
  const n = Number(value);
  if (!Number.isInteger(n)) return `${label} must be a whole number`;
  if (n < min) return `${label} must be at least ${min}`;
  return undefined;
}

/** Build an Errors map from field validators, dropping `undefined` entries. */
export function collectErrors<T extends string>(
  checks: Record<T, string | undefined>
): Errors<T> {
  const out: Errors<T> = {};
  for (const key in checks) {
    if (checks[key]) out[key] = checks[key];
  }
  return out;
}

/** True when an Errors map has no entries. */
export function isValid(errors: Errors): boolean {
  return Object.keys(errors).length === 0;
}
