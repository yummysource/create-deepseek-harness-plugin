# AGENTS.md

`{{PKG_NAME}}` is a DeepSeek Harness plugin bundle, generated from the `app` template.
A bundle is an npm package whose manifest declares `dsh.bundle`; installing it into a profile
applies the `cordis.patch.yml` layer, which mounts the plugin rows.

Read `README.md` for the tutorial and the pitfall list. This file is the rules.

## Layout

```
src/            the plugin source — the only place to edit behaviour
cordis.patch.yml the layer this bundle contributes: which rows mount, with what config
package.json    the bundle manifest; `dsh.bundle.patch` is what makes it a bundle
dist/           build output — never edit, never commit
```

## The loop

```sh
dsh plugin --profile probe add "$PWD"    # once, from inside this project
npm run build                            # after any change under src/
dsh --profile probe                      # boot; Ctrl-C to stop
```

Pass an ABSOLUTE path to `add`. A relative path resolves against the invoking directory, and
if that directory has no `package.json` the install half-succeeds: the symlink appears, the
dependency is never recorded, the bundle never joins `dsh.profile.bundles`, and the layer
never applies — silently.

A local directory is linked rather than copied, so editing `cordis.patch.yml` needs neither a
rebuild nor a re-add. Just boot again.

## Rules

### Dependencies

Every `@deepseek-ai/*` package stays in `devDependencies` and pins a version **line** (`^`),
never one exact build. A consumer never installs devDependencies, so an installed plugin
resolves them through `$DSH_HOME/profiles/node_modules` and binds to the harness's own copies.
Locally the reverse holds: this project's `node_modules` wins the resolution, so that copy must
install completely, peers included. Pinning one exact build makes sibling `^` peer ranges
unsatisfiable and `npm install` fails with ERESOLVE.

Do not add an `.npmrc` that disables peer installation. It makes install and build pass while
every boot dies on `Cannot find package @deepseek-ai/dsh-scope`.

This package is pure ESM. Keep `"type": "module"`, and keep `module: esnext` plus
`moduleResolution: bundler` so bare specifiers survive to runtime.

### Plugin shape

A function plugin named-exports `name`, optionally `inject` and `Config`, and `apply`. Never add
a `default` export beside them — the Loader discards the namespace and the plugin silently does
nothing.

Load order comes from service dependencies, never file order. `export const inject = ['tools']`
makes the plugin wait until `ctx.tools` is ready. Read an **optional** service with
`ctx.get('name')`; reserve `ctx.<name>` for services declared in `inject`, because that property
proxy is topology-sensitive.

`apply` can run more than once in a process: a plugin whose injected service disappears unloads
and loads again when it returns. Keep state inside `apply`, never in module scope.

### Config

Export `Config` as a Schemastery schema, not a plain object — a bare object does not implement
the Standard Schema interface Cordis requires, so it neither validates nor fills defaults.

Never put `.required()` and `.default()` on the same field. Required suppresses the default, and
a row supplying no config then fails to load with `ValidationError: invalid config`.

Anything two deployments might set differently belongs in `Config`. The test is whether
`cordis.patch.yml` can change it without touching code.

### The patch

`name` in a row is a **package name** resolved through node_modules, never a relative path.

A row accepts only `id`, `name`, `config`, `inject`, `group`, and `disabled`. Any other key —
`schema`, `options`, `settings` — is ignored in silence, leaving schema defaults in force with
nothing to warn you.

Keep row ids prefixed. Layers override each other BY ID, so a generic id silently clobbers
another bundle's row. A patch REPLACES a row's whole `config` rather than merging keys, so any
layer overriding a row must restate every key that row needs.

### Lifecycle

Registration is an effect. `ctx.tools.register()` and `ctx.on()` dispose themselves on unload.
Resources cordis does not own — timers, sockets, watchers — go inside
`ctx.effect(() => { acquire; return cleanup })`.

Disposers start in reverse registration order, but async ones run CONCURRENTLY; there is no
serial guarantee between separate effects. Cleanup whose order matters belongs in one disposer
returned from a single `ctx.effect()`, awaiting its own steps.

## Verifying a change

`--dump-config` proves only that the configuration layer composed. It says nothing about whether
Node can resolve the module, and a profile that dumps perfectly can still fail every boot.
**Boot the profile.** A change is not verified until the plugin's own line appears in the output:

```
[{{PLUGIN_ID}}] Hello, World!
```

Install the harness CLI with `npm i -g @deepseek-ai/dsh`, never `pnpm add -g`: a pnpm global
install omits an optional native package the loader needs, and every profile then fails to boot
with dozens of `Cannot find package @deepseek-ai/...`.

## This template

Two rows, and the pairing is the design. The startup row injects `cmdlineArgs`, parses this
app's flags, and publishes what it resolved as an ordinary service. The app row injects that
service and reads it from a `!!js` expression, with the deployment value beside it as fallback.

That precedence needs the expression to survive. A user patch replacing the whole `config` with
literals removes the runtime read, and the flag stops working.

On `--help` the startup plugin never publishes its service, so the app row stays inactive and
nothing boots. Launcher flags come before app arguments; the launcher stops at the first token
it does not recognise and everything after belongs to the app.
