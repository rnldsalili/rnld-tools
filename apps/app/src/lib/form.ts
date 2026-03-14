export function toFieldErrors(errors: Array<unknown>) {
  return errors.map((e) => ({ message: String(e) }));
}
