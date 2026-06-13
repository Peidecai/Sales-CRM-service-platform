/**
 * Escape special characters in a LIKE pattern to prevent SQL wildcard injection.
 * Handles %, _, and \ characters.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&')
}
