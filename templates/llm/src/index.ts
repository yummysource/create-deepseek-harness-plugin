// {{PKG_NAME}} — an LLM adapter: it teaches the harness to talk to one provider.
//
// ── What an adapter owes the harness ──────────────────────────────────────
// `stream()` is the ONLY method you must implement. It receives a
// provider-neutral request and yields the harness's chunk vocabulary. Every
// other member of LlmAdapter (providerInfo, listModels, resolveModel,
// providerRetryPolicy) already has a working default — override one only when
// your provider can answer it better.
//
// Two contracts are not optional:
//
//   1. Every HTTP request to the provider MUST carry `attributionHeaders()`.
//      `buildHeaders()` below is where that happens; keep it on the path of
//      whatever call you add.
//   2. `stream()` must honor `options.signal`, so a cancelled turn stops the
//      provider call instead of leaking it.
//
// The body below streams a deterministic echo rather than calling anyone. It
// exists to show the chunk protocol exactly, and to give you one clearly marked
// place to put the real request. Replace `echo()` with your provider call.
//
import type { Context } from '@deepseek-ai/cordis'
import {
  LlmAdapter,
  attributionHeaders,
  type GenerateOptions,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import Schema from '@deepseek-ai/schemastery'

export const name = '{{PLUGIN_ID}}'

export const inject = ['llm']

export interface Config {
  /** Route names this adapter claims. A request naming one of them lands here. */
  providers: string[]
  /** Provider base URL. */
  baseUrl: string
}

export const Config = Schema.object({
  providers: Schema.array(Schema.string()).default(['{{PLUGIN_ID}}']),
  baseUrl: Schema.string().default('https://api.example.com/v1'),
})

class {{SERVICE_CLASS}}Adapter extends LlmAdapter {
  constructor(private readonly config: Config) {
    super()
  }

  /**
   * Headers for every provider request. `attributionHeaders()` identifies the
   * harness to the provider and cannot be suppressed; merge it, never replace it.
   */
  private buildHeaders(apiKey: string): Record<string, string> {
    return {
      ...attributionHeaders(),
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    }
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    // ── Replace this line with the real provider call ──────────────────────
    // Use `this.config.baseUrl`, `this.buildHeaders(...)`, and pass
    // `options.signal` to fetch so cancellation reaches the provider.
    const text = echo(options)

    // One content block: start, deltas, then end carrying the complete block.
    // A consumer can rebuild the whole message from block-end alone, which is
    // why the final block is not merely the concatenated deltas by convention —
    // it is the authoritative value.
    yield { type: 'block-start', index: 0, blockType: 'text' }
    for (const piece of text.match(/.{1,16}/gs) ?? []) {
      if (options.signal?.aborted) return
      yield { type: 'text-delta', index: 0, text: piece }
    }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }

    // Usage and finish close every stream, including an aborted one that got
    // far enough to report something.
    yield { type: 'usage', usage: { inputTokens: 0, outputTokens: 0 } }
    // FinishReason is an object with a `kind`, not a bare string, and the map
    // is merge-extensible so a provider can surface its own reasons.
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

/** Stand-in for the provider: echoes the last user text back. */
function echo(options: GenerateOptions): string {
  const last = [...options.messages].reverse().find((m) => m.role === 'user')
  const said = last?.content
    ?.map((block) => (block.type === 'text' ? block.text : ''))
    .join('')
    .trim()
  return said ? `You said: ${said}` : 'No user text in this request.'
}

export function apply(ctx: Context, config: Config) {
  const adapter = new {{SERVICE_CLASS}}Adapter(config)

  // registerAdapter returns the disposer, so the routes are released when this
  // plugin unloads or hot-reloads. Never register outside an effect.
  ctx.effect(() => ctx.llm.registerAdapter(config.providers, adapter))

  console.log(`[{{PLUGIN_ID}}] adapter registered for: ${config.providers.join(', ')}`)
}
