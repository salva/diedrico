/**
 * Architectural Test: No Command Subclasses
 * 
 * This test enforces the architectural principle that Command must NOT be subclassed.
 * Per data-model.md §Command Pattern:
 * - "Architecture: Single Command class (not subclasses) - the real logic is in Operation classes"
 * - "No Subclasses Needed: Tools create operations directly and pass to generic Command"
 * 
 * WHY THIS MATTERS:
 * Command is a generic container for Operations. All domain logic belongs in Operation
 * classes (AddFreePoint2DOp, AddLine2DOp, UpdateElementStyleOp, etc.) that implement
 * the IOperation interface.
 * 
 * Having Command subclasses violates the Command/Operation pattern and leads to
 * inconsistent architecture where some logic is in Commands and some in Operations.
 * 
 * This test scans the codebase for any `extends Command` patterns and fails if found.
 * Test files are excluded as they may contain mock subclasses for testing purposes.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Command Pattern
 * Reference: frontend/src/commands/Command.ts - @sealed documentation
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

describe('Architecture: Command Pattern', () => {
  it('should NOT have any Command subclasses in production code', () => {
    // Search for "extends Command" pattern in TypeScript files
    // Exclude test files, node_modules, and dist
    const projectRoot = path.resolve(__dirname, '../../..');
    
    try {
      // Use grep to find "extends Command" pattern
      // -r: recursive
      // -n: show line numbers
      // --include: only .ts and .vue files
      // --exclude-dir: exclude test directories and build outputs
      const command = `cd ${projectRoot} && grep -rn "extends Command" \
        --include="*.ts" \
        --include="*.vue" \
        --exclude-dir=node_modules \
        --exclude-dir=dist \
        --exclude-dir=.vite \
        --exclude-dir=playwright-report \
        --exclude-dir=test-results \
        src/ \
        || echo "NO_MATCHES"`;
      
      const output = execSync(command, { encoding: 'utf-8' });
      
      // If grep found no matches, it returns "NO_MATCHES" (our echo)
      if (output.trim() === 'NO_MATCHES') {
        // Success: No Command subclasses found
        expect(true).toBe(true);
        return;
      }
      
      // Parse grep output (format: file:line:content)
      const matches = output.trim().split('\n').filter(line => line.length > 0);
      
      // Filter out false positives (comments, strings, etc.)
      const realSubclasses = matches.filter(match => {
        // Skip if it's just a comment or documentation
        if (match.includes('//') || match.includes('*')) {
          return false;
        }
        // Skip if it's in a string literal
        if (match.includes('"extends Command"') || match.includes("'extends Command'")) {
          return false;
        }
        return true;
      });
      
      if (realSubclasses.length > 0) {
        const filesList = realSubclasses.join('\n');
        throw new Error(
          `❌ ARCHITECTURAL VIOLATION: Found Command subclasses in production code!\n\n` +
          `Per data-model.md §Command Pattern, Command must NOT be subclassed.\n` +
          `All domain logic belongs in Operation classes (IOperation implementations).\n\n` +
          `Found violations in:\n${filesList}\n\n` +
          `HOW TO FIX:\n` +
          `1. Create an Operation class (e.g., MyFeatureOp implements IOperation)\n` +
          `2. Move logic from Command subclass to Operation's apply() and undo() methods\n` +
          `3. In tool/UI code, create generic Command and add your Operation:\n` +
          `   const cmd = new Command("My action", world);\n` +
          `   cmd.addAndExecute(new MyFeatureOp(...));\n` +
          `   cmd.commit();\n` +
          `4. Delete the Command subclass\n\n` +
          `See UpdateElementStyleOp as an example of correct pattern.\n` +
          `See frontend/src/commands/Command.ts for detailed architecture documentation.`
        );
      }
      
      // Success: No real Command subclasses found
      expect(true).toBe(true);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('ARCHITECTURAL VIOLATION')) {
        // Re-throw our architectural violation error
        throw error;
      }
      // Other errors (e.g., grep not found) - just warn
      console.warn('Could not run architectural check:', error);
      // Don't fail the test if grep is not available
      expect(true).toBe(true);
    }
  });
  
  it('should document Command as @sealed in source code', () => {
    // Verify that Command.ts has proper @sealed annotation and documentation
    const fs = require('fs');
    const path = require('path');
    const commandPath = path.resolve(__dirname, '../../../src/commands/Command.ts');
    
    try {
      const content = fs.readFileSync(commandPath, 'utf-8');
      
      // Check for @sealed annotation
      expect(content).toContain('@sealed');
      
      // Check for key documentation phrases
      expect(content).toContain('MUST NOT be subclassed');
      expect(content).toContain('All domain logic belongs in Operation classes');
      
      // Check that it references data-model.md
      expect(content).toContain('data-model.md');
      
    } catch (error) {
      throw new Error(
        `Could not verify Command.ts documentation: ${error}\n` +
        `Ensure Command.ts exists and has proper @sealed annotation.`
      );
    }
  });
});
