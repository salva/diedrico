/**
 * Phase 98: Dynamic Action Descriptions - Descriptor Pattern
 * 
 * DescriptionPart represents a piece of text or label in an action description.
 * This enables selective KaTeX rendering (only for labels) and future interactivity.
 */

/**
 * A part of an action description - either plain text or an element label
 */
export interface DescriptionPart {
  /**
   * Type of part - determines rendering:
   * - 'text': Plain text, rendered as-is
   * - 'label': Element label, rendered with KaTeX formatting
   */
  type: 'text' | 'label';
  
  /**
   * The text content to display
   */
  content: string;
  
  /**
   * Element ID (for label parts) - enables hover highlighting and future click interactions
   */
  elementId?: string;
}
