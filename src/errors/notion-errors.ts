export const SELECTOR_HINT =
  'Use an ellipsis selector matching page content, e.g. "## Section...end of section". Run `notion read <id>` to see the page content.';

export function isNotionValidationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'validation_error'
  );
}
