import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Fetch-on-mount / fetch-on-filter-change via an effect-called async
      // function is the standard React data-fetching pattern used across
      // this app's pages; the rule's blanket "any setState reachable from
      // an effect" heuristic flags it as a false positive.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
