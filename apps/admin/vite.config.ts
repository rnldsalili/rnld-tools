import path from 'node:path'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig({
  resolve: {
    alias: {
      '@workspace/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' }, inspectorPort: 9229 }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
