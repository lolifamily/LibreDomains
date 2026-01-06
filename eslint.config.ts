import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import json from '@eslint/json';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import astro from 'eslint-plugin-astro';

const stylisticConfig = stylistic.configs.customize({
  jsx: true,
  quotes: 'single',
  quoteProps: 'as-needed',
  braceStyle: '1tbs',
  semi: true,
});

export default defineConfig(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'public/**',
      'coverage/**',
      '.git/**',
      '.astro/**',
      '*.min.js',
      '*.min.css',
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  {
    extends: [json.configs.recommended],
    files: ['domains/**/*.json'],
    language: 'json/json',
  },
  {
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      astro.configs['flat/recommended'],
      astro.configs['flat/jsx-a11y-strict'],
      stylisticConfig,
    ],
    files: ['**/*.{js,jsx,cjs,mjs,ts,tsx,astro}'],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/no-multi-spaces': [
        'error',
        {
          ignoreEOLComments: true,
        },
      ],
      '@stylistic/no-multiple-empty-lines': [
        'error',
        {
          max: 2,
          maxEOF: 0,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
        },
      ],
    },
  },
  {
    files: ['**/*.{js,cjs,mjs,jsx}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
