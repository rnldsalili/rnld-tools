export function toFieldErrors(errors: unknown[]) {
  return errors.map((e) => ({ message: String(e) }));
}
