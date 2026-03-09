import stylistic from '@stylistic/eslint-plugin';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

import { createBaseConfig } from './base.js';

const workspaceRules = {
    rules: {
        'react-props-interface': {
            meta: {
                type: 'suggestion',
                docs: {
                    description: 'Require interface declarations for React component props.',
                },
                schema: [],
                messages: {
                    useInterface: 'Use an interface for React component props (e.g. `interface FooProps {}`) instead of a type alias.',
                },
            },
            create(context) {
                return {
                    TSTypeAliasDeclaration(node) {
                        if (node.id?.name?.endsWith('Props')) {
                            context.report({ node, messageId: 'useInterface' });
                        }
                    },
                };
            },
        },
    },
};

/**
 * Creates React ESLint config extending base config
 * @param {Object} options - Configuration options
 * @param {Array} options.importOrderPathGroups - Custom path groups for import/order
 * @returns {import('eslint').Linter.Config[]}
 */
export function createReactConfig(options = {}) {
    const { importOrderPathGroups = [] } = options;

    return [
        // React plugin recommended config
        {
            ...pluginReact.configs.flat.recommended,
            languageOptions: {
                ...pluginReact.configs.flat.recommended.languageOptions,
                globals: {
                    ...globals.serviceworker,
                    ...globals.browser,
                },
            },
        },

        // Base config (TanStack + your additions)
        ...createBaseConfig({ importOrderPathGroups }),

        // Require interface for React component props in TSX
        {
            files: ['**/*.tsx'],
            plugins: {
                workspace: workspaceRules,
            },
            rules: {
                'workspace/react-props-interface': 'error',
            },
        },

        // JSX Stylistic rules
        {
            plugins: {
                '@stylistic': stylistic,
            },
            rules: {
                '@stylistic/jsx-quotes': ['error', 'prefer-double'],
                '@stylistic/jsx-child-element-spacing': 'warn',
                '@stylistic/jsx-closing-bracket-location': ['warn', 'tag-aligned'],
                '@stylistic/jsx-curly-spacing': ['error', 'never'],
                '@stylistic/jsx-equals-spacing': ['error', 'never'],
                '@stylistic/jsx-function-call-newline': ['error', 'multiline'],
                '@stylistic/jsx-closing-tag-location': ['error', 'tag-aligned'],
                '@stylistic/jsx-indent-props': ['error', 4],
                '@stylistic/jsx-pascal-case': ['error', { allowAllCaps: false }],
                '@stylistic/jsx-self-closing-comp': [
                    'error',
                    {
                        component: true,
                        html: true,
                    },
                ],
                // Note: jsx-sort-props is deprecated, consider using eslint-plugin-perfectionist
                '@stylistic/jsx-tag-spacing': [
                    'warn',
                    { beforeSelfClosing: 'proportional-always' },
                ],
                '@stylistic/jsx-wrap-multilines': [
                    'error',
                    {
                        declaration: 'parens-new-line',
                        assignment: 'parens-new-line',
                        return: 'parens-new-line',
                        arrow: 'parens-new-line',
                        condition: 'parens-new-line',
                        logical: 'parens-new-line',
                        prop: 'parens-new-line',
                    },
                ],

                // React rules (disable unnecessary ones for modern React)
                'react/jsx-no-target-blank': 'off',
                'react/prop-types': 'off',
                'react/react-in-jsx-scope': 'off',
            },
        },

        // React Hooks rules
        {
            ...pluginReactHooks.configs.flat['recommended-latest'],
            settings: {
                ...pluginReactHooks.configs.flat['recommended-latest'].settings,
                react: { version: 'detect' },
            },
        },
    ];
}

// Default export for simple usage
export const config = createReactConfig();
