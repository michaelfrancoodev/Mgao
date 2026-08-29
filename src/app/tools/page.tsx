'use client'

import type { ReactNode } from 'react'
import { Page, Section } from '@/components/ui'
import { TOOL_REGISTRY } from '@/lib/webmcp/registry'
import { useWebMCPAvailable } from '@/lib/webmcp/use-tools'

/**
 * The page for anyone reviewing how this is wired.
 *
 * No tools are registered here on purpose. This is where the app explains
 * itself, and a page that explains the tools should not also be adding to
 * them.
 */
export default function ToolsPage() {
  const webmcp = useWebMCPAvailable()

  const byPage = TOOL_REGISTRY.reduce<Record<string, typeof TOOL_REGISTRY>>((acc, t) => {
    ;(acc[t.page] ??= []).push(t)
    return acc
  }, {})

  const readOnly = TOOL_REGISTRY.filter((t) => t.readOnly).length
  const untrusted = TOOL_REGISTRY.filter((t) => t.untrusted).length

  return (
    <Page>
      <Section>
        <p className="text-[32px] leading-none tnum">{TOOL_REGISTRY.length}</p>
        <p className="mt-2 text-[15px] text-fg-muted">tools, registered per page</p>
        <p className="mt-3 text-[13px] text-fg-faint">
          {readOnly} read-only · {untrusted} return text a person spoke, annotated
          untrusted · {TOOL_REGISTRY.length - readOnly} write, and every one of
          those goes past a person first
        </p>
        <p className="mt-2 text-[13px] text-fg-faint">
          WebMCP in this browser: {webmcp === null ? 'checking' : webmcp ? 'yes' : 'no'}
        </p>
      </Section>

      <Section title="How it is wired">
        <ul className="space-y-3 text-[14px] text-fg-muted">
          <li>
            Registration is scoped with an AbortController and lives as long as
            the page is mounted. There is no unregisterTool in the current
            specification, and scoping this way means the split tools simply do
            not exist on the load page.
          </li>
          <li>
            Every read calls the store at execute time, never in a closure. A
            person is often still talking while the agent is answering.
          </li>
          <li>
            requestUserInteraction returns the resolved name and the corrected
            number, not a boolean, so the agent continues with the person&rsquo;s
            version rather than its own.
          </li>
          <li>
            No tool performs arithmetic on money. The division is computed by
            the app from recorded figures, and the agent is never asked for it.
          </li>
        </ul>
      </Section>

      {Object.entries(byPage).map(([page, tools]) => (
        <Section key={page} title={page === '/' ? 'Load page' : `${page} page`}>
          {tools.map((t) => (
            <div key={t.name} className="border-b border-border py-4 last:border-b-0">
              <div className="flex items-baseline gap-3">
                <code className="font-mono text-[13px]">{t.name}</code>
                <span className="ml-auto flex shrink-0 gap-2 text-[12px]">
                  {t.readOnly && <Tag>read-only</Tag>}
                  {t.untrusted && <Tag tone="attention">untrusted</Tag>}
                  {!t.readOnly && <Tag tone="human">confirmed</Tag>}
                </span>
              </div>
              <p className="mt-1.5 text-[14px] text-fg-muted">{t.description}</p>
              <p className="mt-1.5 text-[13px] text-fg-faint">{t.why}</p>
            </div>
          ))}
        </Section>
      ))}
    </Page>
  )
}

function Tag({
  children, tone = 'plain',
}: {
  children: ReactNode
  tone?: 'plain' | 'attention' | 'human'
}) {
  const colour =
    tone === 'attention'
      ? 'var(--color-attention)'
      : tone === 'human'
        ? 'var(--color-human)'
        : 'var(--color-fg-faint)'
  return (
    <span className="rounded border px-1.5 py-0.5" style={{ borderColor: colour, color: colour }}>
      {children}
    </span>
  )
}
