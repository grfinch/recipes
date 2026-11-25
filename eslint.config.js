import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),

  // Every JavaScript file
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // react/jsx-uses-vars marks JSX usage, so only `_`-prefixed names are exempt
      'no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
    },
  },

  // The app: React, hooks, accessibility, browser globals
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      react.configs.flat.recommended,
      // React 17+ JSX transform: no need to import React in every file
      react.configs.flat['jsx-runtime'],
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React 19 ignores propTypes; use TypeScript/JSDoc for prop types instead
      'react/prop-types': 'off',
    },
  },

  // Tooling that runs in Node: config files and the Claude hook
  {
    files: ['*.config.js', '.claude/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },

  // Browser flows: Node scripts whose page.evaluate() callbacks run in the browser
  {
    files: ['.claude/skills/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
])
