import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

export default [
  {
    ignores: [
      'node_modules/**',
      'frontend/dist/**',
      'docs/.vitepress/dist/**',
      'test-results/**',
      'tmp/**',
      'architecture-audit/**',
      'research/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['frontend/src/**/*.{ts,vue}', 'frontend/tests/**/*.ts'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-constant-condition': 'off',
      'no-undef': 'off',
      'no-useless-assignment': 'off',
      'no-useless-escape': 'off',
      'prefer-const': 'off',
      'preserve-caught-error': 'off',
      'no-unused-vars': 'off',
      'vue/no-parsing-error': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
];
