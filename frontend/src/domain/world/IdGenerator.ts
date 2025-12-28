/**
 * ID Generator - Generates unique IDs for elements
 * Uses counters with prefixes for different element types
 */

let pointCounter = 0;
let segmentCounter = 0;
let lineCounter = 0;
let circleCounter = 0;
let guideCounter = 0;
let commandCounter = 0;
let operationCounter = 0;
let elementCounter = 0;       // Generic element counter
let plane3DCounter = 0;       // 3D plane counter
let bhlCounter = 0;           // BHL counter

/**
 * Reset all counters (for testing)
 */
export function resetCounters(): void {
  pointCounter = 0;
  segmentCounter = 0;
  lineCounter = 0;
  circleCounter = 0;
  guideCounter = 0;
  commandCounter = 0;
  operationCounter = 0;
  elementCounter = 0;
  plane3DCounter = 0;
  bhlCounter = 0;
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
 * Generate unique ID for a guide
 */
export function generateGuideId(): string {
  return `G${String(++guideCounter).padStart(3, '0')}`;
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

/**
 * Generate unique ID for a generic element (when specific type not known)
 */
export function generateElementId(): string {
  return `EL${String(++elementCounter).padStart(4, '0')}`;
}

/**
 * Generate unique ID for a 3D plane
 */
export function generatePlane3DId(): string {
  return `PI${String(++plane3DCounter).padStart(3, '0')}`;
}

/**
 * Generate unique ID for a BHL
 */
export function generateBHLId(): string {
  return `BHL${String(++bhlCounter).padStart(3, '0')}`;
}
