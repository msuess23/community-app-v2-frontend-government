import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    'src/api/generated',
  ]),

  {
    files: ['src/**/*.{ts,tsx}'],

    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },

  {
    files: [
      'vite.config.ts',
      'playwright.config.ts',
      'orval.config.ts',
      'scripts/**/*.{js,mjs,cjs,ts}',
      'tests/**/*.{ts,tsx}',
    ],

    extends: [js.configs.recommended, tseslint.configs.recommended],

    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },

  eslintConfigPrettier,
])
