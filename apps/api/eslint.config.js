import { createBaseConfig } from '@workspace/eslint-config/base';

export default [
    ...createBaseConfig(),
    {
        ignores: ['generated/**', 'worker-configuration.d.ts'],
    },
];
