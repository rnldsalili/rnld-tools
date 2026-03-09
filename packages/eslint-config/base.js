import stylistic from '@stylistic/eslint-plugin';
import { tanstackConfig } from '@tanstack/eslint-config';
import importPlugin from 'eslint-plugin-import-x';
import onlyWarn from 'eslint-plugin-only-warn';

/**
 * Creates base ESLint config extending TanStack config
 * @param {Object} options - Configuration options
 * @param {Array} options.importOrderPathGroups - Custom path groups for import/order
 * @returns {import('eslint').Linter.Config[]}
 */
export function createBaseConfig(options = {}) {
    const { importOrderPathGroups = [] } = options;

    return [
        // TanStack config as foundation
        ...tanstackConfig,

        // Additional stylistic rules not in TanStack
        {
            plugins: {
                '@stylistic': stylistic,
            },
            rules: {
                '@stylistic/comma-dangle': ['error', 'always-multiline'],
                '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
                '@stylistic/object-curly-spacing': ['error', 'always'],
                '@stylistic/semi': ['error', 'always'],
            },
        },

        // Custom import order with configurable pathGroups
        ...(importOrderPathGroups.length > 0
            ? [
                {
                    plugins: {
                        import: importPlugin,
                    },
                    rules: {
                        'import/order': [
                            'error',
                            {
                                groups: [
                                    'builtin',
                                    'external',
                                    'internal',
                                    'parent',
                                    'sibling',
                                    'index',
                                    'object',
                                    'type',
                                ],
                                pathGroups: importOrderPathGroups,
                                pathGroupsExcludedImportTypes: ['type'],
                                distinctGroup: false,
                                'newlines-between': 'always',
                                alphabetize: {
                                    order: 'asc',
                                    caseInsensitive: true,
                                },
                            },
                        ],
                    },
                },
            ]
            : []),

        // Only-warn plugin (turns errors to warnings)
        { plugins: { onlyWarn } },

        // Additional ignores
        {
            ignores: [
                'build/**',
                'dist/**',
                '.output/**',
                'node_modules/**',
                '.turbo/**',
                '.wrangler/**',
                '*.config.js',
                '*.config.ts',
                'worker-configuration.d.ts',
            ],
        },
    ];
}

// Default export for simple usage
export const config = createBaseConfig();
