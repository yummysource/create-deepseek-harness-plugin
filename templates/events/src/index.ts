// {{PKG_NAME}} — an observer plugin: it listens instead of contributing.
//
// ── The one rule that bites ───────────────────────────────────────────────
// Cordis has TWO listener kinds and they are not interchangeable.
//
//   emit      — a notification. Return whatever you like; nobody is waiting.
//   waterfall — a CHAIN. You MUST call `next()` to delegate. Returning without
//               it short-circuits the chain, and for `tools/pre-execute` that
//               means the tool call never happens. This failure is silent:
//               nothing errors, the tool just stops working.
//
// Every listener here is an EFFECT — cordis disposes them when the plugin
// unloads. Resources cordis does NOT own (timers, sockets, watchers) go inside
// `ctx.effect()` with a disposer, as the counter flush below demonstrates.
//
// Nothing is imported at runtime: every import below is `import type`, erased
// at compile time. The host hands this plugin its `ctx`.
//
import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import Schema from '@deepseek-ai/schemastery'

export const name = '{{PLUGIN_ID}}'

export interface Config {
  /** Log every Nth session event; 1 logs all of them. */
  sampleEvery: number
}

export const Config = Schema.object({
  sampleEvery: Schema.number()
    .default(25)
    .description('Log every Nth session event'),
})

export function apply(ctx: Context, config: Config) {
  let sessionEvents = 0
  let toolCalls = 0

  // EMIT — the durable session firehose. Fires whenever a session's log grows:
  // turn and step boundaries, user and assistant messages, tool results.
  // Anything reconstructable from the log passes through here.
  ctx.on('session/event', (session: Session, event: SessionEvent) => {
    sessionEvents += 1
    if (sessionEvents % config.sampleEvery === 0) {
      console.log(`[{{PLUGIN_ID}}] session/event #${sessionEvents} type=${event.type} session=${String(session.id)}`)
    }
  })

  // EMIT — the tool registry changed: some plugin registered or unregistered a
  // tool. Useful for anything that mirrors the tool list somewhere else.
  ctx.on('tools/change', () => {
    console.log('[{{PLUGIN_ID}}] tools/change')
  })

  // WATERFALL — sits in front of every tool execution. `next()` delegates to
  // the rest of the chain; not calling it blocks the call. An observer always
  // delegates. Returning a decision instead is how a POLICY plugin denies a
  // call, which is a different job from this one.
  ctx.on('tools/pre-execute', (exec: ToolExecution, next: () => Promise<PreToolDecision>) => {
    toolCalls += 1
    console.log(`[{{PLUGIN_ID}}] tools/pre-execute #${toolCalls} tool=${exec.name}`)
    return next()
  })

  // A resource cordis does not own. The disposer proves the plugin unloads
  // cleanly: reload it and watch the DISPOSED line print before the new
  // instance starts.
  ctx.effect(() => {
    const timer = setInterval(() => {
      console.log(`[{{PLUGIN_ID}}] totals sessionEvents=${sessionEvents} toolCalls=${toolCalls}`)
    }, 30_000)

    return () => {
      clearInterval(timer)
      console.log('[{{PLUGIN_ID}}] DISPOSED — listeners removed, timer cleared')
    }
  })

  console.log('[{{PLUGIN_ID}}] listening: session/event, tools/change, tools/pre-execute')
}
