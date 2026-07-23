/**
 * Shared helpers for turning Django REST Framework error responses into a
 * single human-readable string. Every Server Action in app/actions/*.ts
 * follows the same convention: on a non-2xx response, parse the JSON body
 * and pass it through `firstErrorMessage()` to build the `{ error: string }`
 * shape (a "FormState") that gets returned to the client form via
 * `useActionState`/`useFormState`.
 */

/**
 * Extracts a single displayable error message from a DRF-style error
 * response body.
 *
 * DRF typically returns validation errors as an object keyed by field name,
 * each mapping to an array of message strings, e.g.
 * `{ email: ["This field is required."], password: ["Too short."] }`.
 * Rather than surfacing every field's errors (this app's forms show one
 * error string at a time), this just grabs the first field's first message.
 * It also tolerates a plain string value (some endpoints return
 * `{ detail: "..." }`-style single messages) and falls back to a generic
 * message if the shape is anything else (e.g. an empty body from a failed
 * `res.json()` parse).
 *
 * @param data Parsed JSON body of an error response (or `{}` if parsing
 *   failed) — deliberately typed `unknown` since the caller can't know the
 *   shape ahead of time.
 * @param fallback Message to use when no usable error string can be found.
 * @returns A single error message safe to display in a form.
 */
export function firstErrorMessage(
  data: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (data && typeof data === "object") {
    const firstValue = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
      return firstValue[0];
    }
    if (typeof firstValue === "string") return firstValue;
  }
  return fallback;
}
