import { describe, expect, it } from 'vitest';
import { findContentMatches, scanTextFiles, type ScannedFile } from './helpers/sourceScanner';

function isProductionSource(file: ScannedFile): boolean {
  return file.projectPath.startsWith('src/');
}

function isCommentOrStringOnly(match: RegExpMatchArray): boolean {
  const before = match.input?.slice(0, match.index).split('\n').pop() ?? '';
  return before.trim().startsWith('//') || before.includes('*') || match[0].includes('"extends Command"') || match[0].includes("'extends Command'");
}

describe('Architecture: Command Pattern', () => {
  it('does not subclass the generic Command container in production code', () => {
    const productionFiles = scanTextFiles(['src']).filter(isProductionSource);
    const violations = findContentMatches(productionFiles, /extends\s+Command\b/g, {
      describe: (file, match) => `${file.projectPath}: ${match[0]}`,
    }).filter(violation => {
      const [projectPath] = violation.split(': ');
      const file = productionFiles.find(candidate => candidate.projectPath === projectPath);
      if (!file) {
        return true;
      }
      const match = /extends\s+Command\b/g.exec(file.content);
      return match ? !isCommentOrStringOnly(match) : true;
    });

    expect(violations).toEqual([]);
  });

  it('documents Command as sealed and operation-backed', () => {
    const commandFile = scanTextFiles(['src/commands']).find(file => file.projectPath === 'src/commands/Command.ts');

    expect(commandFile?.content).toContain('@sealed');
    expect(commandFile?.content).toContain('MUST NOT be subclassed');
    expect(commandFile?.content).toContain('All domain logic belongs in Operation classes');
    expect(commandFile?.content).toContain('data-model.md');
  });
});
