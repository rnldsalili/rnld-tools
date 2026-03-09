import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-6">
        Cloudflare · Hono · React
      </p>

      <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
        cf-hono-react
      </h1>

      <p className="text-gray-500 max-w-sm mb-10 leading-relaxed">
        A full-stack monorepo template. Start building by editing{' '}
        <code className="text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-sm">
          src/routes/index.tsx
        </code>
        .
      </p>

      <div className="flex items-center gap-4 text-sm">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Docs
        </a>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-colors"
        >
          GitHub
        </a>
      </div>
    </div>
  )
}
