'use client'

import { useEffect, useState } from 'react'
import { getModelContext, type ToolDefinition } from './model-context'

/**
 * Registers tools for as long as the component is mounted, then aborts.
 *
 * There is no unregisterTool in the current specification — the signal
 * passed at registration is aborted instead. That turns out to be exactly
 * right here: the split tools only exist on the split page, so an agent
 * looking at the people list cannot settle a load. The lifecycle enforces
 * the rule instead of a runtime check somebody forgets to write.
 */
export function useTools(build: () => ToolDefinition[], deps: unknown[] = []) {
  useEffect(() => {
    const mc = getModelContext()
    if (!mc) return // No WebMCP. Everything still works by hand.

    const controller = new AbortController()
    for (const tool of build()) {
      mc.registerTool(tool, { signal: controller.signal }).catch((err: unknown) => {
        console.warn(`[mgao] could not register ${tool.name}`, err)
      })
    }
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** null while it is not known yet, so the banner does not flash on load. */
export function useWebMCPAvailable(): boolean | null {
  const [ready, setReady] = useState<boolean | null>(null)
  useEffect(() => setReady(getModelContext() !== null), [])
  return ready
}
