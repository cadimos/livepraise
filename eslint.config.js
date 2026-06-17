import eslint from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';

const ignores = [
  'dist/**',
  'node_modules/**',
  'v0.0.8/**',
  'release-builds/**',
  'vendor/**',
  'tmp-asar-extract/**',
  'scripts/**',
  'tests/**',
  '**/*.mjs',
];

export default tseslint.config(
  { ignores },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'vue/html-self-closing': 'warn',
    },
  },
  {
    files: [
      'apps/**/*.{ts,vue}',
      'server/**/*.ts',
      'core/**/*.ts',
      'shared/**/*.ts',
      'electron/**/*.ts',
      'web/**/*.ts',
      'tailwind.config.ts',
      'postcss.config.ts',
      'vite.config.ts',
    ],
  },
);
