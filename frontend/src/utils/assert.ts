/**
 * Assertion utility for validating invariants.
 * Throws an error if the condition is false.
 * 
 * @param condition - The condition to check
 * @param message - Error message if assertion fails
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}
