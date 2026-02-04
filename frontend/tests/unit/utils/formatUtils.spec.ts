import { describe, it, expect } from 'vitest';
import { formatElementLabel, validateLabelSyntax } from '@/utils/formatUtils';

describe('formatElementLabel', () => {
  it('should format subscripts', () => {
    const result = formatElementLabel('A_1');
    expect(result).toContain('A');
    expect(result).toContain('1');
    expect(result).toContain('katex'); // KaTeX wrapper classes
  });

  it('should format subscripts with braces', () => {
    const result = formatElementLabel('P_{12}');
    expect(result).toContain('P');
    expect(result).toContain('12');
    expect(result).toContain('katex');
  });

  it('should format superscripts', () => {
    const result = formatElementLabel('A^2');
    expect(result).toContain('A');
    expect(result).toContain('2');
    expect(result).toContain('katex');
  });

  it('should format prime notation', () => {
    const result = formatElementLabel('P^{\\prime}');
    expect(result).toContain('P');
    expect(result).toContain('′'); // Prime symbol
  });

  it('should format double prime', () => {
    const result = formatElementLabel('H^{\\prime\\prime}');
    expect(result).toContain('H');
    expect(result).toContain('′′'); // Double prime
  });

  it('should format Greek letters - alpha', () => {
    const result = formatElementLabel('\\alpha');
    expect(result).toContain('α');
  });

  it('should format Greek letters - beta', () => {
    const result = formatElementLabel('\\beta');
    expect(result).toContain('β');
  });

  it('should format Greek letters - theta', () => {
    const result = formatElementLabel('\\theta');
    expect(result).toContain('θ');
  });

  it('should format combined subscript and superscript', () => {
    const result = formatElementLabel('A_{H}^{\\prime}');
    expect(result).toContain('A');
    expect(result).toContain('H');
    expect(result).toContain('′');
  });

  it('should return empty string for empty input', () => {
    expect(formatElementLabel('')).toBe('');
    expect(formatElementLabel('   ')).toBe('');
    expect(formatElementLabel(undefined)).toBe('');
  });

  it('should handle invalid LaTeX gracefully', () => {
    const result = formatElementLabel('A_{unclosed');
    // KaTeX with throwOnError: false returns error HTML
    expect(result).toBeTruthy();
  });

  it('should format plain text without LaTeX', () => {
    const result = formatElementLabel('ABC');
    expect(result).toContain('mathrm'); // KaTeX wraps with \mathrm{} to prevent italics
    expect(result).toContain('A');
    expect(result).toContain('BC');
  });

  it('should format Greek letter with subscript', () => {
    const result = formatElementLabel('\\alpha_1');
    expect(result).toContain('α');
    expect(result).toContain('1');
  });
});

describe('validateLabelSyntax', () => {
  it('should validate correct subscript syntax', () => {
    const result = validateLabelSyntax('A_1');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should validate correct superscript syntax', () => {
    const result = validateLabelSyntax('A^2');
    expect(result.valid).toBe(true);
  });

  it('should validate correct Greek letters', () => {
    expect(validateLabelSyntax('\\alpha').valid).toBe(true);
    expect(validateLabelSyntax('\\beta').valid).toBe(true);
    expect(validateLabelSyntax('\\theta').valid).toBe(true);
  });

  it('should validate combined notation', () => {
    const result = validateLabelSyntax('A_{H}^{\\prime}');
    expect(result.valid).toBe(true);
  });

  it('should accept empty input as valid', () => {
    expect(validateLabelSyntax('').valid).toBe(true);
    expect(validateLabelSyntax('   ').valid).toBe(true);
  });

  it('should reject unclosed braces', () => {
    const result = validateLabelSyntax('A_{unclosed');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain('Expected');
  });

  it('should reject invalid commands', () => {
    const result = validateLabelSyntax('\\invalidcommand');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should validate plain text', () => {
    const result = validateLabelSyntax('ABC');
    expect(result.valid).toBe(true);
  });
});
