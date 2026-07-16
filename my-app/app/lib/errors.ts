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
