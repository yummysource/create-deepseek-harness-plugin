// Template registry + shared metadata for create-deepseek-harness-plugin.

export const TEMPLATES = ['basic', 'tool', 'service', 'app', 'events']

export const TEMPLATE_META = {
  basic: {
    id: 'basic',
    label: 'basic',
    description: 'Side-effect plugin with a Config schema: a timer whose interval and message are configurable',
    defaultPluginId: 'my-plugin',
    defaultToolName: null,
    asksToolName: false,
  },
  tool: {
    id: 'tool',
    label: 'tool',
    description: 'A tool the model can call: parameter schema, output schema, render, and its UI card',
    defaultPluginId: 'my-tool',
    defaultToolName: 'my_tool',
    asksToolName: true,
  },
  service: {
    id: 'service',
    label: 'service',
    description: 'A capability seam: Service Definition plus a working provider, published as ctx.<id>',
    defaultPluginId: 'my-service',
    defaultToolName: null,
    asksToolName: false,
  },
  app: {
    id: 'app',
    label: 'app',
    description: 'An app that owns its own command-line flags and feeds them into its row',
    defaultPluginId: 'my-app',
    defaultToolName: null,
    asksToolName: false,
  },
  events: {
    id: 'events',
    label: 'events',
    description: 'An observer: session and tool listeners, and the emit-vs-waterfall rule',
    defaultPluginId: 'my-events',
    defaultToolName: null,
    asksToolName: false,
  },
}

// Pitfalls distilled from real spikes, emitted verbatim into every generated
// project so nobody rediscovers them the expensive way.
export const PITFALLS = [
  'Node version: DSH requires Node ^22.19.0 || >=24.0.0. Older Node (e.g. v22.17) only warns EBADENGINE, but may hit runtime issues — upgrade if you can.',
  'Install the CLI with `npm i -g @deepseek-ai/dsh`, NOT `pnpm add -g`. pnpm global installs omit the optional native package `node-addon-require-builtin-<platform>`; without it the loader loses Node internals, falls back to resolving bare specifiers from its own store path, and every profile fails to boot with dozens of `Cannot find package @deepseek-ai/...`. Proof: the same broken install boots cleanly under `node --expose-internals`.',
  'npm dist-tag trap: `@deepseek-ai/dsh-tools`\'s `latest` is a stale 0.0.1-rc.1; the real line lives under the `next` tag. This scaffold pins the version line your INSTALLED dsh reports — never `npm i @deepseek-ai/dsh-tools` over it.',
  'Keep every `@deepseek-ai/*` in devDependencies, never dependencies or peerDependencies. They are build-time types only: at runtime the plugin binds to the copies inside the running harness, resolved through `$DSH_HOME/profiles/node_modules`. Declaring them as real dependencies installs a SECOND copy — harmless for a pure helper like defineTool, fatal for anything identity-sensitive (Schema instances, `instanceof` service classes).',
  'A schema field must not carry both `.required()` and `.default()`: required suppresses the default, so a row supplying no config fails to load with `ValidationError: invalid config`.',
  'A Service class declares its schema as a STATIC member (`static Config = Schema.object(...)`); a function plugin exports `const Config`. Use the wrong form and the constructor receives an undefined config.',
  'Pure ESM: package.json must set `"type": "module"`; build with `module: esnext` + `moduleResolution: bundler` so bare specifiers survive to runtime.',
  '`dsh plugin add <dir>` anchors relative paths to the INVOKING directory — run it from the parent directory, not from inside the plugin.',
  'In the bundle `cordis.patch.yml`, `name` is a package name resolved through node_modules, not a relative path. Prefix your row ids: layers override each other BY ID, so a generic id silently clobbers another bundle.',
  'A patch REPLACES a row\'s whole `config` rather than deep-merging keys, so any layer overriding your row must restate every key that row needs.',
  'Registrations are effects: `ctx.tools.register()` and `ctx.on()` dispose themselves on unload. Wrap resources cordis does NOT own (timers, sockets, watchers) in `ctx.effect(() => { acquire; return cleanup })`.',
  'Load order comes from service dependencies, never file order: `export const inject = [\'tools\']` makes the plugin wait until `ctx.tools` is ready.',
  'Waterfall listeners MUST call `next()`. Returning without it short-circuits the chain — for `tools/pre-execute` the tool call simply never happens, with no error anywhere.',
  '`--dump-config` proves only that the configuration layer composed; it does NOT prove module resolution. Boot the profile once before believing a plugin works.',
  'Having the model actually call your tool needs `DEEPSEEK_API_KEY`; without one `--verify` still proves load/list/boot, and the model call fails with MISSING_CREDENTIAL.',
]
