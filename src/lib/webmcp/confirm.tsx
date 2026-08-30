'use client'

import { createRoot, type Root } from 'react-dom/client'
import { useState } from 'react'
import { formatMoney, parseMoney } from '@/lib/money'
import type { Uncertainty } from '@/lib/types'

export interface ConfirmRequest {
  title: string
  transcript: string
  /** Fields the app is confident about. Shown, not asked about. */
  settled: Array<{ label: string; value: string }>
  /** The only things a person is actually asked. */
  uncertainties: Uncertainty[]
}

export interface ConfirmResult {
  approved: boolean
  /** field name -> the value the person chose or typed */
  answers: Record<string, string>
  /** Which fields the person touched. Goes into the record so the split can
   *  later say a number was corrected by a human rather than heard. */
  corrected: string[]
}

/**
 * Mounts a dialog and resolves with whatever the person decided.
 *
 * This is deliberately not confirm(). requestUserInteraction returns
 * whatever the page returns, and the callback runs inside the app's own
 * document with full DOM access — so this returns the resolved name and the
 * corrected number, not a boolean. The agent then continues with the
 * person's version instead of its own, which is the whole difference
 * between asking permission and actually collaborating.
 */
export function askUser(request: ConfirmRequest): Promise<ConfirmResult> {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root: Root = createRoot(host)

    const finish = (result: ConfirmResult) => {
      root.unmount()
      host.remove()
      resolve(result)
    }

    root.render(<Dialog request={request} onDone={finish} />)
  })
}

function Dialog({
  request,
  onDone,
}: {
  request: ConfirmRequest
  onDone: (r: ConfirmResult) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [corrected, setCorrected] = useState<string[]>([])

  const set = (field: string, value: string) => {
    setAnswers((a) => ({ ...a, [field]: value }))
    setCorrected((c) => (c.includes(field) ? c : [...c, field]))
  }

  const allAnswered = request.uncertainties.every((u) => answers[u.field])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[88vh] w-full max-w-[520px] flex-col rounded-t-xl border border-border bg-white sm:max-h-[85vh] sm:rounded-xl">
        {/* Scrollable body. On a phone with several questions, this scrolls
            on its own — the actions below never move off screen. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {request.transcript && (
            <>
              <p className="text-[13px] text-fg-faint">Heard just now</p>
              <p className="mt-1 rounded-md bg-bg-subtle px-3 py-2 text-[14px] italic text-fg-muted">
                {/* Rendered as text, never as markup or instruction. */}
                {request.transcript}
              </p>
            </>
          )}

          <h2 className="mt-5 text-[20px] font-medium">{request.title}</h2>

          {request.settled.length > 0 && (
            <dl className="mt-4 border-t border-border">
              {request.settled.map((s) => (
                <div key={s.label} className="flex justify-between gap-3 border-b border-border py-2.5">
                  <dt className="text-[14px] text-fg-muted">{s.label}</dt>
                  <dd className="tnum text-right text-[14px] text-fg">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {request.uncertainties.map((u) => (
            <div
              key={u.field}
              className="mt-4 rounded-md border p-4"
              style={{
                borderColor: 'var(--color-attention)',
                background: 'var(--color-attention-tint)',
              }}
            >
              <p className="text-[14px] font-medium">{u.label}</p>

              {u.confidence === 'needs_choice' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {u.options?.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => set(u.field, o.id)}
                      className="h-9 rounded-md border px-3 text-[14px] transition-colors"
                      style={
                        answers[u.field] === o.id
                          ? { borderColor: 'var(--color-human)', background: 'var(--color-human)', color: '#fff' }
                          : { borderColor: 'var(--color-border)', background: '#fff' }
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}

              {u.confidence === 'needs_number' && (
                <div className="mt-3">
                  {u.heard && u.heard.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {u.heard.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => set(u.field, h)}
                          className="h-9 rounded-md border border-border bg-white px-3 tnum text-[14px] transition-colors hover:bg-bg-subtle"
                        >
                          {formatMoney(Number(h))}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    autoFocus
                    inputMode="numeric"
                    placeholder="Type the amount"
                    value={answers[u.field] ?? ''}
                    onChange={(e) => {
                      const parsed = parseMoney(e.target.value)
                      set(u.field, parsed === null ? '' : String(parsed))
                    }}
                    className="h-11 w-full rounded-md border border-border px-3 tnum text-[15px] outline-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Fixed footer — always visible, never requires scrolling to find. */}
        <div className="safe-bottom shrink-0 border-t border-border px-5 pt-4 sm:px-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onDone({ approved: false, answers: {}, corrected: [] })}
              className="px-2 py-2 text-[14px] text-fg-muted transition-colors hover:text-fg"
            >
              Discard
            </button>
            <button
              type="button"
              disabled={!allAnswered}
              onClick={() => onDone({ approved: true, answers, corrected })}
              className="h-11 rounded-md px-5 text-[14px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
              style={{ background: 'var(--color-human)' }}
            >
              Save to the book
            </button>
          </div>

          <p className="pb-4 pt-3 text-[12px] text-fg-faint">
            Nothing is written to the load until this is saved.
          </p>
        </div>
      </div>
    </div>
  )
}
