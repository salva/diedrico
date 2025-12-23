/**
 * ID Generator - Generates unique IDs for elements
 * Uses counters with prefixes for different element types
 */

let pointCounter = 0;
let segmentCounter = 0;
let lineCounter = 0;
let circleCounter = 0;
let commandCounter = 0;
let operationCounter = 0;

/**
 * Reset all counters (for testing)
 */
export function resetCounters(): void {
  pointCounter = 0;
  segmentCounter = 0;
  lineCounter = 0;
  circleCounter = 0;
  commandCounter = 0;
  operationCounter = 0;
}

/**
 * Generate unique ID for a 2D point
 */
export function generatePointId(): string {
  return `P${String(++pointCounter).padStart(3, '0')}`;
}

/**
 * Generate unique ID for a 2D segment
 */
export function generateSegmentId(): string {
  return `S${String(++segmentCounter).padStart(3, '0')}`;
}

/**
 * Generate unique ID for a 2D line
 */
export function generateLineId(): string {
  return `L${String(++lineCounter).padStart(3, '0')}`;
}

/**
 * Generate unique ID for a 2D circle
 */
export function generateCircleId(): string {
  return `C${String(++circleCounter).padStart(3, '0')}`;
}

/**
 * Generate unique ID for a command
 */
export function generateCommandId(): string {
  return `CMD${String(++commandCounter).padStart(4, '0')}`;
}

/**
 * Generate unique ID for an operation
 */
export function generateOperationId(): string {
  return `OP${String(++operationCounter).padStart(4, '0')}`;
}
