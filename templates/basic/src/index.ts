// {{PKG_NAME}} — a side-effect plugin with a configuration schema.
//
// ── What this file demonstrates ───────────────────────────────────────────
// 1. The NAMED-export plugin form (`name` / `Config` / `apply`). Never add a
//    `export default` alongside it: the Loader would discard this namespace
//    and the plugin would silently do nothing.
// 2. A `Config` schema, which is how a plugin becomes configurable. It gives
//    the deployment a default, the compiler a type, and the settings UI a
//    description — from one declaration.
// 3. `ctx.effect()`: registration is an EFFECT. The returned function is the
//    disposer, so the timer is cleared when this plugin unloads or hot-reloads.
//    Without it, every reload would leak another interval.
//
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

// Plugin display name, shown in loader diagnostics.
export const name = '{{PLUGIN_ID}}'

export interface Config {
  /** Milliseconds between messages. */
  interval: number
  /** Text written to stdout on each tick. */
  message: string
}

// NOTE: never combine `.required()` with `.default()` on one field — required
// suppresses the default, and a row that supplies no config then fails to load
// with `ValidationError: invalid config`.
export const Config = Schema.object({
  interval: Schema.number()
    .default(5000)
    .description('Milliseconds between messages'),
  message: Schema.string()
    .default('Hello, World!')
    .description('Text written on each tick'),
})

export function apply(ctx: Context, config: Config) {
  console.log(`[{{PLUGIN_ID}}] loaded — printing every ${config.interval}ms`)

  ctx.effect(() => {
    const timer = setInterval(() => {
      console.log(config.message)
    }, config.interval)

    // The disposer. Returning it is what makes this reload-safe.
    return () => clearInterval(timer)
  })
}
