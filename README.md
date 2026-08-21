# @allis-plugin/create-dsh

English | [繁體中文](README.zh-TW.md)

Scaffold a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that compiles, mounts, and boots on the first try.

```sh
npx @allis-plugin/create-dsh@latest hello-world -t basic
```

Keep `@latest`: npx caches, and without it you may silently run an old copy.

## Templates

| Template | What it generates |
|---|---|
| `basic` | A side-effect plugin with a `Config` schema — a timer whose interval and message are configurable. |
| `tool` | A tool the model can call, via `defineTool`: parameter schema, output schema, render, its UI card, plus config. |
| `service` | A capability seam: an abstract Service Definition plus a working provider, published as `ctx.<id>`. |
| `app` | An app that owns its own command-line flags and feeds them into its row through `!!js`. |
| `events` | An observer: session and tool listeners, all four dispatch modes, and events of its own for others to extend. |
| `llm` | An LLM adapter: the chunk protocol, the attribution contract, and one marked place for the provider call. |

Every template ships a `Config` schema, because "make it configurable" is the first thing
anyone needs after "make it run".

## What it gets right for you

**Versions match the harness you actually run.** An installed plugin binds at runtime to the
copies inside your dsh, so the types it compiles against must be that same version line. The
scaffold reads `dsh --version` and pins the line it reports. Nothing is fetched over the network —
asking npm would reintroduce the trap this exists to avoid, since `@deepseek-ai/dsh-tools`'s
`latest` dist-tag is a stale `0.0.1-rc.1`.

**Dependencies land where they belong.** Every `@deepseek-ai/*` package goes in
`devDependencies`. A consumer never installs those, so an installed plugin resolves them through
`$DSH_HOME/profiles/node_modules` and binds to the harness's own copies; declaring them as real
dependencies would ship a second copy instead. Locally it is the reverse — your project's
`node_modules` wins the resolution — so those packages pin a version *line* and their peers
install normally. Starve them and the plugin compiles cleanly and then fails every boot.

**`--verify` boots the plugin, not just the config.** `--dump-config` proves only that the
configuration layer composed; a profile that dumps perfectly can still fail every boot because
Node cannot resolve the module. The last verification step therefore starts a real profile and
waits to see the plugin apply.

```sh
npx @allis-plugin/create-dsh@latest my-tool -t tool --yes --verify
```

**Twenty pitfalls come with the project.** Each generated README ends with the list,
so nobody rediscovers them — including the one that costs the most time: install the CLI with
`npm i -g @deepseek-ai/dsh`, never `pnpm add -g`.

## The loop you will actually live in

Mount a plugin in a throwaway profile once, passing an ABSOLUTE path:

```sh
cd my-plugin
dsh plugin --profile probe add "$PWD"
```

A relative path is resolved against the directory you invoke from, and if that directory has
no `package.json` the install half-succeeds — the symlink appears, the dependency is never
recorded, the bundle never joins `dsh.profile.bundles`, and the layer never applies. Nothing
warns you; `--dump-config` just quietly omits your row.

A local directory is linked rather than copied, so the profile always sees your current
`cordis.patch.yml` and your current `dist/`. From there the loop is two commands:

```sh
npm run build          # only after changing src/
dsh --profile probe    # Ctrl-C to stop
```

Editing the patch needs neither a rebuild nor a re-add. Every generated README carries this
loop with the exact line that project prints on success, so you know what you are looking for.

`dsh --profile probe --dump-config` shows the composed configuration without starting
anything. Read it when a row looks wrong, but do not mistake it for proof: it shows only that
the configuration layer composed, never that Node can resolve your module. Booting is the proof.

Two ways to clean up, and they are not the same operation. `rm -rf` on a profile directory
takes the whole thing — every plugin in it, your own `cordis.patch.yml` overrides, and any
`allowBuilds` authorizations. That is exactly right for a throwaway probe profile and wrong
for one you use. To drop a single plugin from a profile you keep, `dsh plugin remove` uninstalls
that one dependency and removes its layer, leaving everything else in place. Neither touches
your plugin's source directory, your sessions, or your settings — those live outside profiles.

```sh
rm -rf "${DSH_HOME:-$HOME/.dsh}/profiles/probe"       # the throwaway one
dsh plugin --profile my-profile remove my-plugin      # one plugin, profile kept
```

Generated projects carry a README in English by default; `--lang zh` writes it in
Traditional Chinese instead, pitfall list included. The code, its comments, and everything the
CLI prints stay English either way.

## Options

```
  -t, --template <name>    basic | tool | service | app | events | llm
  -n, --name <pkg>         npm package name (default: derived from the directory)
      --plugin-id <id>     cordis row id and plugin name export (default: derived)
      --tool-name <name>   model-facing tool name, tool template only
  -l, --lang <en|zh>       language of the generated README (default: en)
  -y, --yes                accept defaults, skip the wizard
      --verify             install, build, mount, and boot the result
      --skip-install       leave dependencies uninstalled
```

Run it with no arguments for the bilingual wizard.

## Requirements

Node `^22.19.0 || >=24.0.0`, and `pnpm` on PATH for `dsh plugin`.

## License

MIT
