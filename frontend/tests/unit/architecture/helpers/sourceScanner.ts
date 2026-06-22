export type ScannedFile = {
  absolutePath: string;
  projectPath: string;
  content: string;
  imports: string[];
};

const frontendTextFiles = import.meta.glob('/{src,tests}/**/*.{ts,tsx,vue,js,jsx,mjs,cjs}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export function scanTextFiles(roots: string[]): ScannedFile[] {
  const normalizedRoots = roots.map(root => root.replace(/^\//, '').replace(/\/$/, ''));

  return Object.entries(frontendTextFiles)
    .map(([absolutePath, content]) => {
      const projectPath = absolutePath.replace(/^\//, '');
      return {
        absolutePath,
        projectPath,
        content,
        imports: extractImports(content),
      };
    })
    .filter(file => normalizedRoots.some(root => file.projectPath === root || file.projectPath.startsWith(`${root}/`)));
}

export function findContentMatches(
  files: ScannedFile[],
  pattern: RegExp,
  options: { exclude?: (file: ScannedFile) => boolean; describe?: (file: ScannedFile, match: RegExpMatchArray) => string } = {},
): string[] {
  const violations: string[] = [];

  for (const file of files) {
    if (options.exclude?.(file)) {
      continue;
    }

    const searchableContent = stripComments(file.content);
    const regexp = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    for (const match of searchableContent.matchAll(regexp)) {
      violations.push(options.describe?.(file, match) ?? `${file.projectPath}: ${match[0]}`);
    }
  }

  return violations;
}

function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export function findForbiddenImports(
  files: ScannedFile[],
  forbidden: RegExp[],
  options: { exclude?: (file: ScannedFile) => boolean } = {},
): string[] {
  return files.flatMap(file => {
    if (options.exclude?.(file)) {
      return [];
    }

    return file.imports
      .filter(importSource => forbidden.some(pattern => pattern.test(importSource)))
      .map(importSource => `${file.projectPath} imports ${importSource}`);
  });
}

function extractImports(content: string): string[] {
  const imports = new Set<string>();
  const patterns = [
    /import\s+(?:type\s+)?(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+(?:type\s+)?(?:[^'";]+\s+from\s+)['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      imports.add(match[1]);
    }
  }

  return Array.from(imports);
}
