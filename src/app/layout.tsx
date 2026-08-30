import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { Boot } from '@/components/boot'
import { SiteNav } from '@/components/site-nav'

export const metadata: Metadata = {
  title: 'Mgao',
  description:
    'A record-keeping and payout tool for anyone in small-scale gold mining — miners, financiers, and traders — built around Geita, Tanzania. Replace the paper notebook: track costs, advances, and financing as they happen, and let every share of a sale show exactly how it was worked out.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Boot />
        <header className="sticky top-0 z-40 border-b border-border bg-white">
          <div className="mx-auto flex h-14 max-w-[680px] items-center gap-2 px-4 sm:h-12 sm:gap-3 sm:px-5">
            <Link href="/" className="flex shrink-0 items-center gap-2 py-2">
              <Mark />
              <span className="text-[15px] font-medium">Mgao</span>
            </Link>
            <SiteNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}

/** One amount dividing into four equal parts. Drawn, not imported. */
function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <rect x="2" y="4" width="14" height="1.6" fill="var(--color-fg)" />
      {[3, 7, 11, 15].map((x) => (
        <rect key={x} x={x - 0.8} y="8" width="1.6" height="6" fill="var(--color-fg)" />
      ))}
    </svg>
  )
}
