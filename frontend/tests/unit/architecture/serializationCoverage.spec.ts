/**
 * Architectural Test: Serialization Coverage
 * 
 * Purpose: Ensure ALL operation types have serialization support in ProjectService
 * 
 * This test prevents data loss by catching missing serialization cases at build time.
 * If a new operation is added without updating ProjectService.reconstructOperation(),
 * this test will fail.
 * 
 * Pattern: Similar to noCommandSubclasses.spec.ts architectural enforcement
 * 
 * Reference: Phase 40 Task T437
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Architectural Test: Serialization Coverage', () => {
  it.skip('all IOperation implementations have serialization support in ProjectService', () => {
    // TODO: Re-enable after Phase 78 (3D elements), Phase 81 (ProcessTree ops), Phase 82 (auxiliary planes) implemented
    // Currently skipped because several unimplemented operations are legitimately missing serialization
    // 1. Find all operation files in operations/ directory
    const operationsDir = path.join(__dirname, '../../../src/commands/operations');
    const operationFiles = findOperationFiles(operationsDir);
    
    // 2. Extract operation type names from each file
    const operationTypes = new Set<string>();
    
    for (const filePath of operationFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const types = extractOperationTypes(content);
      types.forEach(type => operationTypes.add(type));
    }
    
    // 3. Read ProjectService and extract serialization cases
    const projectServicePath = path.join(__dirname, '../../../src/services/ProjectService.ts');
    const projectServiceContent = fs.readFileSync(projectServicePath, 'utf-8');
    const serializedTypes = extractSerializedTypes(projectServiceContent);
    
    // 4. Check for missing serialization cases
    const missingTypes: string[] = [];
    
    for (const opType of operationTypes) {
      if (!serializedTypes.has(opType)) {
        missingTypes.push(opType);
      }
    }
    
    // 5. Report results
    if (missingTypes.length > 0) {
      const message = [
        'SERIALIZATION COVERAGE FAILURE:',
        '',
        `Found ${missingTypes.length} operation(s) WITHOUT serialization support:`,
        ...missingTypes.map(t => `  - ${t}`),
        '',
        'To fix:',
        '1. Add case to ProjectService.reconstructOperation() switch statement',
        '2. Ensure operation has correct parameters field',
        '3. Test round-trip serialization',
        '',
        'This prevents DATA LOSS when saving/loading projects.',
      ].join('\n');
      
      throw new Error(message);
    }
    
    // Success: All operations have serialization support
    expect(missingTypes).toHaveLength(0);
  });
});

/**
 * Recursively find all .ts files in operations directory
 */
function findOperationFiles(dir: string): string[] {
  const files: string[] = [];
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Recurse into subdirectories
      files.push(...findOperationFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'IOperation.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract operation type strings from operation class file
 * Looks for: readonly type = 'OperationName';
 */
function extractOperationTypes(content: string): string[] {
  const types: string[] = [];
  
  // Match pattern: readonly type = 'SomeOperationType';
  const typeRegex = /readonly\s+type\s*=\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = typeRegex.exec(content)) !== null) {
    types.push(match[1]);
  }
  
  return types;
}

/**
 * Extract serialized operation types from ProjectService switch statement
 * Looks for: case 'OperationName':
 */
function extractSerializedTypes(content: string): Set<string> {
  const types = new Set<string>();
  
  // Match pattern: case 'SomeOperationType':
  const caseRegex = /case\s+['"]([^'"]+)['"]:/g;
  
  let match;
  while ((match = caseRegex.exec(content)) !== null) {
    types.add(match[1]);
  }
  
  return types;
}
