// Template registry + shared metadata for @allis-plugin/create-dsh.

export const TEMPLATES = ['basic', 'tool', 'service', 'app', 'events', 'llm']

/** Languages a generated project's README can be written in. */
export const LANGUAGES = ['en', 'zh']

/** Language used when none is chosen. */
export const DEFAULT_LANGUAGE = 'en'

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
  llm: {
    id: 'llm',
    label: 'llm',
    description: 'LLM adapter: translate a provider API into the harness chunk stream',
    defaultPluginId: 'my-llm-adapter',
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
// project so nobody rediscovers them the expensive way. The generated README is
// written in the language the project chose, so each entry carries both.
export const PITFALLS = [
  {
    en: "Node version: DSH requires Node ^22.19.0 || >=24.0.0. Older Node (e.g. v22.17) only warns EBADENGINE, but may hit runtime issues — upgrade if you can.",
    zh: "Node 版本：DSH 要求 ^22.19.0 || >=24.0.0。較舊的 Node（例如 v22.17）只會警告 EBADENGINE、不會中斷，但仍建議升級。",
  },
  {
    en: "Install the CLI with `npm i -g @deepseek-ai/dsh`, NOT `pnpm add -g`. pnpm global installs omit the optional native package `node-addon-require-builtin-<platform>`; without it the loader loses Node internals, falls back to resolving bare specifiers from its own store path, and every profile fails to boot with dozens of `Cannot find package @deepseek-ai/...`. Proof: the same broken install boots cleanly under `node --expose-internals`.",
    zh: "CLI 要用 `npm i -g @deepseek-ai/dsh` 安裝，不要用 `pnpm add -g`。pnpm 的全域安裝會漏掉 optional 原生套件 `node-addon-require-builtin-<平台>`；少了它，loader 拿不到 Node internals，會退化成從自己在 store 裡的路徑解析裸 specifier，任何 profile 啟動都會刷出幾十行 `Cannot find package @deepseek-ai/...`。佐證：同一份壞掉的安裝，加上 `node --expose-internals` 就能乾淨啟動。",
  },
  {
    en: "npm dist-tag trap: `@deepseek-ai/dsh-tools`'s `latest` is a stale 0.0.1-rc.1; the real line lives under the `next` tag. This scaffold pins the version line your INSTALLED dsh reports — never `npm i @deepseek-ai/dsh-tools` over it.",
    zh: "npm dist-tag 陷阱：`@deepseek-ai/dsh-tools` 的 `latest` 是過期的 0.0.1-rc.1，真正的版本線在 `next` tag 下。本工具會依你**已安裝**的 dsh 所回報的版本線鎖定，之後不要再用 `npm i @deepseek-ai/dsh-tools` 覆蓋它。",
  },
  {
    en: "Keep every `@deepseek-ai/*` in devDependencies, never dependencies or peerDependencies. A consumer never installs devDependencies, so an INSTALLED plugin resolves them through `$DSH_HOME/profiles/node_modules` and binds to the harness's own copies. While you develop locally it is the opposite: your project's node_modules sits on the resolution path and wins, so the local copy is what actually runs and it has to be complete. That is why the harness packages pin a version LINE and their peers install normally — starve them and the plugin boots straight into `Cannot find package @deepseek-ai/dsh-scope`.",
    zh: "所有 `@deepseek-ai/*` 一律放 devDependencies，不要放 dependencies 或 peerDependencies。使用者安裝時不會裝 devDependencies，所以**已安裝**的插件會經由 `$DSH_HOME/profiles/node_modules` 解析、綁定到 harness 自己那份副本。但你在本地開發時正好相反：專案自己的 node_modules 就在解析路徑上而且會勝出，實際執行的是本地那份副本，因此它必須是完整的。這也是為什麼 harness 套件鎖的是版本**線**、而且它們的 peer 要正常安裝——餓著它們的話，插件一啟動就會是 `Cannot find package @deepseek-ai/dsh-scope`。",
  },
  {
    en: "A schema field must not carry both `.required()` and `.default()`: required suppresses the default, so a row supplying no config fails to load with `ValidationError: invalid config`.",
    zh: "schema 欄位不能同時帶 `.required()` 和 `.default()`：required 會讓 default 失效，於是一個沒有提供設定的 row 會以 `ValidationError: invalid config` 載入失敗。",
  },
  {
    en: "A Service class declares its schema as a STATIC member (`static Config = Schema.object(...)`); a function plugin exports `const Config`. Use the wrong form and the constructor receives an undefined config.",
    zh: "Service 類別的 schema 要宣告成**靜態成員**（`static Config = Schema.object(...)`），函式插件才是匯出 `const Config`。用錯形式的話，建構子收到的 config 會是 undefined。",
  },
  {
    en: "Pure ESM: package.json must set `\"type\": \"module\"`; build with `module: esnext` + `moduleResolution: bundler` so bare specifiers survive to runtime.",
    zh: "純 ESM：package.json 必須設 `\"type\": \"module\"`；建置時用 `module: esnext` + `moduleResolution: bundler`，裸 specifier 才能保留到執行期。",
  },
  {
    en: "`dsh plugin add <dir>` resolves a relative path against the directory you invoke it from, and if that directory has no package.json the install half-succeeds: the symlink appears, the dependency is never recorded, the bundle never joins dsh.profile.bundles, and the layer simply never applies — with no error. Pass an absolute path (`\"$PWD\"` from inside the plugin).",
    zh: "`dsh plugin add <dir>` 會以「你執行指令時所在的目錄」為基準解析相對路徑；而該目錄若沒有 package.json，安裝會半成功：symlink 建好了、依賴卻沒被記錄，bundle 也就沒進 dsh.profile.bundles，那一層完全不會生效——而且不報任何錯。請改用絕對路徑（在插件目錄內用 `\"$PWD\"`）。",
  },
  {
    en: "In the bundle `cordis.patch.yml`, `name` is a package name resolved through node_modules, not a relative path. Prefix your row ids: layers override each other BY ID, so a generic id silently clobbers another bundle.",
    zh: "bundle 的 `cordis.patch.yml` 裡，`name` 是走 node_modules 解析的**套件名**，不是相對路徑。row id 要加前綴：各層之間是按 id 互相覆寫的，通用的 id 會靜默蓋掉別的 bundle。",
  },
  {
    en: "A patch row accepts only `id`, `name`, `config`, `inject`, `group`, and `disabled`. Any other key — `schema`, `options`, `settings` — is ignored in silence, so a misspelled config block leaves the schema defaults in force and nothing warns you.",
    zh: "patch 的一個 row 只接受 `id`、`name`、`config`、`inject`、`group`、`disabled`。其他任何鍵——`schema`、`options`、`settings`——都會被靜默忽略，所以拼錯的設定區塊會讓 schema 預設值繼續生效，而沒有任何東西提醒你。",
  },
  {
    en: "A patch REPLACES a row's whole `config` rather than deep-merging keys, so any layer overriding your row must restate every key that row needs.",
    zh: "patch 是把 row 的整個 `config` **取代**掉，不是逐鍵深層合併，所以任何要覆寫你這一行的層，必須把該行需要的每個鍵都重寫一遍。",
  },
  {
    en: "Registrations are effects: `ctx.tools.register()` and `ctx.on()` dispose themselves on unload. Wrap resources cordis does NOT own (timers, sockets, watchers) in `ctx.effect(() => { acquire; return cleanup })`.",
    zh: "註冊即 effect：`ctx.tools.register()` 和 `ctx.on()` 在卸載時會自行清理。cordis **不**擁有的資源（計時器、連線、監看器）要包在 `ctx.effect(() => { 取得資源; return 清理函式 })` 裡。",
  },
  {
    en: "Load order comes from service dependencies, never file order: `export const inject = ['tools']` makes the plugin wait until `ctx.tools` is ready.",
    zh: "載入順序來自服務相依，不是檔案順序：`export const inject = ['tools']` 會讓插件等到 `ctx.tools` 就緒才執行。",
  },
  {
    en: "Waterfall listeners MUST call `next()`. Returning without it short-circuits the chain — for `tools/pre-execute` the tool call simply never happens, with no error anywhere.",
    zh: "waterfall 監聽器**必須**呼叫 `next()`。沒呼叫就直接回傳會讓整條鏈短路——以 `tools/pre-execute` 來說，那個工具呼叫根本不會發生，而且任何地方都不會報錯。",
  },
  {
    en: "`--dump-config` proves only that the configuration layer composed; it does NOT prove module resolution. Boot the profile once before believing a plugin works.",
    zh: "`--dump-config` 只證明設定層組合成功，**不**證明模組解析得到。一個 dump 得漂漂亮亮的 profile 照樣可能每次啟動都失敗，所以相信一個插件能用之前，先真的啟動一次 profile。",
  },
  {
    en: "Having the model actually call your tool needs `DEEPSEEK_API_KEY`; without one `--verify` still proves load/list/boot, and the model call fails with MISSING_CREDENTIAL.",
    zh: "要讓模型真的呼叫你的工具需要 `DEEPSEEK_API_KEY`；沒有 key 時 `--verify` 仍能證明載入／列出／啟動，模型呼叫則會以 MISSING_CREDENTIAL 失敗。",
  },
  {
    en: "Export `Config` as a Schemastery schema, not a plain object. A bare object does not implement the Standard Schema interface Cordis requires, so it is not used to validate or to fill defaults.",
    zh: "`Config` 要匯出 Schemastery 的 schema，不能是普通物件。裸物件沒有實作 Cordis 要求的 Standard Schema 介面，因此不會被用來驗證、也不會填入預設值。",
  },
  {
    en: "Read an OPTIONAL service with `ctx.get('name')`, and reserve `ctx.<name>` for services you declared in `inject`. The property proxy is topology-sensitive: outside a declared injection it can resolve differently than the global service store you meant to read.",
    zh: "選用的服務要用 `ctx.get('name')` 讀，`ctx.<name>` 只保留給你已在 `inject` 宣告的服務。那個 property proxy 對拓撲敏感：在宣告的注入之外，它解析到的東西可能跟你想讀的全域服務登錄表不同。",
  },
  {
    en: "Disposers start in reverse registration order, but async ones run CONCURRENTLY — there is no serial completion guarantee between separate effects. Cleanup whose order matters belongs in one disposer returned from a single `ctx.effect()`, awaiting its steps itself.",
    zh: "disposer 是反序啟動的，但非同步的那些會**併發執行**——不同 effect 之間沒有序列完成的保證。有順序需求的清理要放進同一個 `ctx.effect()` 回傳的那一個 disposer 裡，自己 await 每個步驟。",
  },
  {
    en: "A plugin whose injected service disappears unloads automatically and loads again when the service returns. Treat `apply` as something that can run more than once in a process, and keep all state inside it rather than in module scope.",
    zh: "被注入的服務消失時，插件會自動卸載，並在服務回來時重新載入。所以要把 `apply` 當成一個行程內可能執行多次的東西，狀態全部放在它裡面，不要放模組層。",
  },
]
