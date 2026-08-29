export interface ToolAnnotations {
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  untrustedContentHint?: boolean
}

/** Passed as the second argument to execute. The human-in-the-loop hook lives
 *  here — not on navigator, not on the tool definition. */
export interface ModelContextClient {
  requestUserInteraction<T>(callback: () => Promise<T>): Promise<T>
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: ToolAnnotations
  execute: (
    input: Record<string, unknown>,
    client: ModelContextClient,
  ) => Promise<unknown>
}

interface ModelContext {
  registerTool(
    tool: ToolDefinition,
    options?: { signal?: AbortSignal },
  ): Promise<void>
}

/**
 * The getter moved from navigator to document in the current WebMCP draft.
 * navigator still works as a deprecated alias on some builds, so document is
 * read first and navigator is the fallback — correct on current builds,
 * still working on older ones.
 *
 * If both headers in next.config.ts are missing this returns null silently,
 * which is exactly what the browser does. The banner on the Load page exists
 * so a person is told rather than left guessing.
 */
export function getModelContext(): ModelContext | null {
  if (typeof document === 'undefined') return null
  const mc =
    (document as unknown as { modelContext?: ModelContext }).modelContext ??
    (typeof navigator !== 'undefined'
      ? (navigator as unknown as { modelContext?: ModelContext }).modelContext
      : undefined)
  return mc && typeof mc.registerTool === 'function' ? mc : null
}
