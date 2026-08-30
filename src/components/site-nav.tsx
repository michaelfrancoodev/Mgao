'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Load' },
  { href: '/people', label: 'People' },
  { href: '/split', label: 'Split' },
]

export function SiteNav() {
  const pathname = usePathname()

  return (
    <nav className="ml-auto flex items-center gap-1 text-[13px] text-fg-muted sm:gap-2">
      {LINKS.map((l) => (
        <NavLink key={l.href} href={l.href} active={pathname === l.href}>
          {l.label}
        </NavLink>
      ))}
      <span className="mx-1 h-4 w-px shrink-0 bg-border" />
      <NavLink href="/tools" active={pathname === '/tools'}>
        Tools
      </NavLink>
    </nav>
  )
}

function NavLink({
  href, children, active,
}: {
  href: string
  children: React.ReactNode
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="rounded-md px-2 py-2 transition-colors hover:bg-bg-subtle"
      style={active ? { color: 'var(--color-fg)', fontWeight: 500 } : undefined}
    >
      {children}
    </Link>
  )
}
