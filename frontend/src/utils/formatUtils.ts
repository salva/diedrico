import katex from 'katex';

/**
 * Format element label with KaTeX mathematical notation.
 * 
 * Supports:
 * - Subscripts: A_1, P_{12}
 * - Superscripts: A^2, P^{\prime}
 * - Greek letters: \alpha, \beta, \theta
 * - Combined: A_{H}^{\prime}
 * 
 * @param label Raw LaTeX string (no delimiters)
 * @returns HTML string with formatted math
 * @example
 * formatElementLabel("A_{H}^{\\prime}") // Returns HTML for A′ₕ
 * formatElementLabel("\\alpha")         // Returns HTML for α
 * formatElementLabel("P_1")             // Returns HTML for P₁
 */
export function formatElementLabel(label: string | undefined): string {
  // Empty label → empty string (caller should use element ID)
  if (!label || label.trim() === '') return '';
  
  try {
    return katex.renderToString(label, {
      displayMode: false,      // Inline mode (not centered display)
      throwOnError: false,     // Return error string instead of throwing
      output: 'html',          // HTML output (SVG text compatible)
      strict: false,           // Allow some non-standard LaTeX
      trust: false,            // Security: disable \href, \url, etc.
      errorColor: '#cc0000'    // Red text for parse errors
    });
  } catch (error) {
    // Fallback: show plain text if KaTeX fails
    console.warn(`KaTeX rendering failed for label "${label}":`, error);
    return label;  // Return unformatted label
  }
}

/**
 * Validate LaTeX label syntax.
 * 
 * @param label Raw LaTeX string
 * @returns { valid: boolean, error?: string }
 */
export function validateLabelSyntax(label: string): { valid: boolean; error?: string } {
  if (!label || label.trim() === '') {
    return { valid: true };  // Empty is valid
  }
  
  try {
    // Test render - will throw on parse error
    katex.renderToString(label, { throwOnError: true });
    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Invalid LaTeX syntax'
    };
  }
}
