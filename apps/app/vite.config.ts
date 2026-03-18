import { readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

function loadWranglerVars(): Record<string, string> {
  const raw = readFileSync(path.resolve(__dirname, 'wrangler.jsonc'), 'utf-8')
  // Strip comments without clobbering // inside string values
  const json = raw
    .replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*/g, (_match, str) => str ?? '') // single-line comments
    .replace(/("(?:[^"\\]|\\.)*")|\/\*[\s\S]*?\*\//g, (_match, str) => str ?? '') // block comments
    .replace(/,(\s*[}\]])/g, '$1') // trailing commas
  const wrangler = JSON.parse(json)
  const cfEnv = process.env.CLOUDFLARE_ENV
  const vars: Record<string, string> =
    cfEnv && wrangler.env?.[cfEnv]?.vars
      ? { ...wrangler.vars, ...wrangler.env[cfEnv].vars }
      : { ...wrangler.vars }
  return Object.fromEntries(
    Object.entries(vars).filter(([k]) => k.startsWith('VITE_')),
  ) as Record<string, string>
}

const wranglerVars = loadWranglerVars()
const viteDefines = Object.fromEntries(
  Object.entries(wranglerVars).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)]),
)

const config = defineConfig({
  define: viteDefines,
  resolve: {
    alias: {
      '@workspace/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' }, inspectorPort: 9230 }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
