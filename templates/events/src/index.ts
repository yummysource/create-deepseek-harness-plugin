// {{PKG_NAME}} — an observer plugin: it listens instead of contributing.
//
// ── The one rule that bites ───────────────────────────────────────────────
// Cordis has TWO listener kinds and they are not interchangeable.
//
//   emit      — a notification. Return whatever you like; nobody is waiting.
//   bail      — a question. The first answer that is not null/false/undefined
//               becomes the result and later listeners never run.
//   serial    — ordered execution with async results awaited, stopping on the
//               first real answer. Use it for setup that has a sequence.
//   waterfall — a CHAIN. You MUST call `next()` to delegate. Returning without
//               it short-circuits the chain, and for `tools/pre-execute` that
//               means the tool call never happens. This failure is silent:
//               nothing errors, the tool just stops working.
//
// This file both LISTENS to harness events and DECLARES three of its own, so
// another plugin can extend it the same way it extends the harness.
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

// Declaring your own events is how a plugin becomes an extension point for
// somebody else. Declaration merging types both sides: `ctx.on` gets the
// handler signature and the dispatch call gets its arguments checked.
declare module '@deepseek-ai/cordis' {
  interface Events {
    /** Fired after this plugin counts a tool call. Notification only. */
    '{{PLUGIN_ID}}/counted': (total: number) => void
    /** Ask anyone whether a tool call should be skipped; first reason wins. */
    '{{PLUGIN_ID}}/veto': (tool: string) => string | undefined
    /** Give listeners a chance to warm up before counting starts. */
    '{{PLUGIN_ID}}/prepare': () => Promise<void>
  }
}

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

  // SERIAL — listeners run in registration order and async results are awaited,
  // stopping at the first one that returns something other than null/false/
  // undefined. Use it for ordered setup, not for broadcasting.
  void ctx.serial('{{PLUGIN_ID}}/prepare')

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

    // BAIL — ask every listener in turn and take the first real answer;
    // null, false, and undefined mean "no opinion, keep asking".
    const veto = ctx.bail('{{PLUGIN_ID}}/veto', exec.name)
    if (veto) console.log(`[{{PLUGIN_ID}}] a listener vetoed ${exec.name}: ${veto}`)

    // EMIT — fire and forget. Nobody's return value is consulted.
    ctx.emit('{{PLUGIN_ID}}/counted', toolCalls)

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
