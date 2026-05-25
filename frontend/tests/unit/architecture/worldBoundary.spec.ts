import { describe, expect, it } from 'vitest';

describe('Architecture: World boundary', () => {
  it('World.ts should not import application, commands, services, UI, stores, or persistence layers', () => {
    const fs = require('fs');
    const content = fs.readFileSync('src/domain/world/World.ts', 'utf-8');
    const importLines = content
      .split('\n')
      .filter(line => /^import\s/.test(line.trim()));

    const forbiddenPatterns = [
      /@\/application\//,
      /@\/commands\//,
      /@\/services\//,
      /@\/components\//,
      /@\/stores\//,
      /@\/persistence\//,
      /\.\.\/\.\.\/application\//,
      /\.\.\/\.\.\/commands\//,
      /\.\.\/\.\.\/services\//,
      /\.\.\/\.\.\/components\//,
      /\.\.\/\.\.\/stores\//,
      /\.\.\/\.\.\/persistence\//,
    ];

    const violations = importLines.filter(line =>
      forbiddenPatterns.some(pattern => pattern.test(line))
    );

    expect(violations).toEqual([]);
  });
});
