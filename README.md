# create-deepseek-harness-plugin

English | [繁體中文](README.zh-TW.md)

Scaffold a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that compiles, mounts, and boots on the first try.

```sh
npx create-deepseek-harness-plugin@latest hello-world -t basic
```

Keep `@latest`: npx caches, and without it you may silently run an old copy.

## Templates

| Template | What it generates |
|---|---|
| `basic` | A side-effect plugin with a `Config` schema — a timer whose interval and message are configurable. |
| `tool` | A tool the model can call, via `defineTool`: parameter schema, output schema, render, its UI card, plus config. |
| `service` | A capability seam: an abstract Service Definition plus a working provider, published as `ctx.<id>`. |
| `app` | An app that owns its own command-line flags and feeds them into its row through `!!js`. |
| `events` | An observer: session and tool listeners, and the emit-vs-waterfall rule that silently breaks tool calls when missed. |

Every template ships a `Config` schema, because "make it configurable" is the first thing
anyone needs after "make it run".

## What it gets right for you

**Versions match the harness you actually run.** A plugin binds at runtime to the copies inside
your installed dsh, so the types it compiles against must be that same version line. The scaffold
reads `dsh --version` and pins what it reports. Nothing is fetched over the network — asking npm
would reintroduce the trap this exists to avoid, since `@deepseek-ai/dsh-tools`'s `latest`
dist-tag is a stale `0.0.1-rc.1`.

**Dependencies land where they belong.** Every `@deepseek-ai/*` package goes in
`devDependencies`: they are build-time types, and at runtime the plugin resolves through
`$DSH_HOME/profiles/node_modules` to the harness's own copies. Declaring them as real
dependencies installs a second copy — harmless for a pure helper, fatal for anything
identity-sensitive.

**`--verify` boots the plugin, not just the config.** `--dump-config` proves only that the
configuration layer composed; a profile that dumps perfectly can still fail every boot because
Node cannot resolve the module. The last verification step therefore starts a real profile and
waits to see the plugin apply.

```sh
npx create-deepseek-harness-plugin@latest my-tool -t tool --yes --verify
```

**Fifteen pitfalls come with the project.** Each generated README ends with the list,
so nobody rediscovers them — including the one that costs the most time: install the CLI with
`npm i -g @deepseek-ai/dsh`, never `pnpm add -g`.

## Options

```
  -t, --template <name>    basic | tool | service | app | events
  -n, --name <pkg>         npm package name (default: derived from the directory)
      --plugin-id <id>     cordis row id and plugin name export (default: derived)
      --tool-name <name>   model-facing tool name, tool template only
  -y, --yes                accept defaults, skip the wizard
      --verify             install, build, mount, and boot the result
      --skip-install       leave dependencies uninstalled
```

Run it with no arguments for the bilingual wizard.

## Requirements

Node `^22.19.0 || >=24.0.0`, and `pnpm` on PATH for `dsh plugin`.

## License

MIT
