// {{PKG_NAME}} startup — the plugin that owns this app's command line.
//
// The launcher parses ONLY its own flags (--profile, --patch, the config
// dumps) and hands everything after them to the tree verbatim. An app
// therefore owns its flag family, its --help text, and its parse errors;
// adding a flag never requires touching the launcher.
//
// The shape is deliberately ordinary: inject `cmdlineArgs`, parse, and publish
// what you resolved as a normal service. `parseCmdline` is only a commander
// adapter — the program's own action owns validation and the published value.
//
import type { Context } from '@deepseek-ai/cordis'
import { parseCmdline } from '@deepseek-ai/dsh-cmdline'
import { Command } from 'commander'

/** What this app resolved from its command line, published for its rows to read. */
export interface {{SERVICE_CLASS}}Startup {
  /** Greeting text, from `--greeting` when supplied. */
  greeting: string | undefined
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    {{PLUGIN_ID_CAMEL}}Startup: {{SERVICE_CLASS}}Startup
  }
}

export const name = '{{PLUGIN_ID}}-startup'

export const inject = ['cmdlineArgs']

export function apply(ctx: Context): void {
  const program = new Command()
    .name('{{PKG_NAME}}')
    .description('{{PKG_DESCRIPTION}}')
    .option('--greeting <text>', 'text this app greets with')

  // The action runs only on a successful parse, so `--help` and a rejected
  // argument never publish the service — and the rows injecting it stay down.
  program.action(() => {
    ctx.provide('{{PLUGIN_ID_CAMEL}}Startup', { greeting: program.opts().greeting })
  })

  parseCmdline(ctx, program)
}
