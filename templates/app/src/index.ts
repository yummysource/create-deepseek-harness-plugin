// {{PKG_NAME}} — the app itself.
//
// It reads nothing from the command line directly: the startup plugin resolved
// that already, and the patch row wires the value in through `!!js`. This row
// injects the startup service so the Loader waits for it before evaluating
// that expression.
//
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = '{{PLUGIN_ID}}'

export const inject = ['{{PLUGIN_ID_CAMEL}}Startup']

export interface Config {
  /** Greeting text; the patch row feeds this from `--greeting` when present. */
  greeting: string
}

export const Config = Schema.object({
  greeting: Schema.string()
    .default('Hello, World!')
    .description('Greeting text'),
})

export function apply(ctx: Context, config: Config) {
  console.log(`[{{PLUGIN_ID}}] ${config.greeting}`)

  ctx.effect(() => {
    const timer = setInterval(() => console.log(`[{{PLUGIN_ID}}] ${config.greeting}`), 5000)
    return () => clearInterval(timer)
  })
}
