import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
      <Link to="/" className="text-sm font-semibold text-gray-900 tracking-tight">
        cf-hono-react
      </Link>

      <nav className="flex items-center gap-6 text-sm text-gray-500">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-900 transition-colors"
        >
          Docs
        </a>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-900 transition-colors"
        >
          GitHub
        </a>
      </nav>
    </header>
  )
}
