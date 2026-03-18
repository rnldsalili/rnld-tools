import { createBaseConfig } from '@workspace/eslint-config/base';

export default [
  ...createBaseConfig(),
  {
    ignores: ['src/**/*.test.ts'],
  },
];
