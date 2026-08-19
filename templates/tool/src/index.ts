// {{PKG_NAME}} — a tool plugin: it registers a tool the model can call.
//
// ── What this file demonstrates ───────────────────────────────────────────
// 1. `inject = ['tools']`. Load order comes from SERVICE DEPENDENCIES, never
//    file order — this makes the plugin wait until `ctx.tools` exists.
// 2. `defineTool()`: parameters are validated before `execute` runs, and
//    `args` is typed from that same declaration.
// 3. `output.schema` + `render`: the schema is the canonical return value;
//    render projects it into what the model actually reads.
// 4. `presentCall`: how a UI shows this call. A tool's render intent is part of
//    its design, decided up front — which card (`generic`/`terminal`/`diff`/
//    `read`/`search`/`web`) and which file locations to follow along. It is a
//    PURE function of `args`: it runs on live streaming AND on session-log
//    replay, so no I/O, no clock, no random, no session state.
// 5. A `Config` schema, so the deployment can retune the tool without a code
//    change. Registration happens inside `apply`, so config is in scope.
// 6. Registration is an EFFECT: `ctx.tools.register()` returns a disposer that
//    is attached to this plugin's fiber, so unloading unregisters the tool.
//
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import Schema from '@deepseek-ai/schemastery'

// Plugin display name, shown in loader diagnostics.
export const name = '{{PLUGIN_ID}}'

// Wait for the host's tool registry before applying.
export const inject = ['tools']

export interface Config {
  /** Greeting used when the caller supplies none. */
  defaultGreeting: string
}

// Never combine `.required()` with `.default()` on one field: required
// suppresses the default, and a row with no config then fails to load with
// `ValidationError: invalid config`.
export const Config = Schema.object({
  defaultGreeting: Schema.string()
    .default('Hello')
    .description('Greeting used when the caller supplies none'),
})

export function apply(ctx: Context, config: Config) {
  ctx.tools.register(defineTool({
    // The name the model calls.
    name: '{{TOOL_NAME}}',
    // What the model sees. Write it from the model's side: task-relevant only,
    // no UI or transport vocabulary.
    description: 'Greet someone by name. Returns the greeting line.',

    // The model's JSON arguments are validated against this BEFORE execute()
    // runs. `required: true` is mandatory; a bare field is optional.
    parameters: {
      name: {
        type: 'string',
        required: true,
        description: 'Who to greet.',
      },
      greeting: {
        type: 'string',
        description: 'Override the configured greeting for this call.',
      },
    },

    output: {
      // The canonical return value of execute().
      schema: { type: 'string' },
      // How that value reaches the model.
      render: (_args, value) => [{ type: 'text', text: value }],
    },

    // How a UI shows this call while it is pending. `generic` is the card for
    // anything that is not a terminal, a diff, a file read, a search, or a web
    // fetch. A tool that touches files adds `locations` so an editor can follow
    // along; this one touches none, so it declares none.
    //
    // For a richer card AFTER the call completes, add `presentResult` and feed
    // it from `output.presentationMeta` — that meta is persisted with the
    // session log, which is what lets the completed card be rebuilt on replay.
    presentCall: (args) => ({
      card: 'generic',
      title: `Greet ${args.name}`,
    }),

    // execute() returns ONLY what output.schema declares.
    // args is typed from parameters: { name: string, greeting?: string }.
    async execute(args) {
      const greeting = args.greeting ?? config.defaultGreeting
      return `${greeting}, ${args.name}!`
    },
  }))

  // Confirm the tool actually landed in the registry — a cheap boot-time check
  // that catches a mis-registered tool before the model ever asks for it.
  console.log(
    `[{{PLUGIN_ID}}] registered "{{TOOL_NAME}}" — listed=${ctx.tools.get('{{TOOL_NAME}}') !== undefined}`,
  )
}
