# {{PKG_NAME}}

> 由 [`@allis-plugin/create-dsh`](https://www.npmjs.com/package/@allis-plugin/create-dsh) 產生的、**擁有自己命令列參數**的 DeepSeek Harness 應用插件。

## 為什麼是兩個檔案

啟動器只解析自己的參數（`--profile`、`--patch`、各種 config dump），其餘原封不動交給插件樹。所以應用
擁有自己的參數家族、自己的 `--help`、自己的解析錯誤——新增一個參數永遠不需要改動啟動器。

| 檔案 | 角色 |
|---|---|
| `src/startup.ts` | 注入 `cmdlineArgs`，解析這個應用的參數，把解析結果以普通服務發佈出去 |
| `src/index.ts` | 應用本身；patch 那一行透過 `!!js` 把該服務的值餵進來 |

```yaml
- id: {{PLUGIN_ID}}
  inject: [{{PLUGIN_ID_CAMEL}}Startup]
  config:
    greeting: !!js ctx.{{PLUGIN_ID_CAMEL}}Startup.greeting ?? 'Hello, World!'
```

因此命令列參數會勝過設定值，而部署預設值就寫在旁邊當作回退。這條優先級**依賴表達式本身存在**：使用者
若用字面量整體取代整個 `config`，那個執行期讀取就消失了。

遇到 `--help` 時 startup 插件不會發佈服務，所以應用那一行不會啟用。

## 測試循環

先把插件掛進一個拋棄式 profile，只需一次。路徑要用**絕對路徑**：相對路徑會以你執行指令時所在的目錄
為基準解析，而該目錄若沒有 `package.json`，安裝會半成功——symlink 建好了、依賴卻沒被記錄，bundle
也就沒進 `dsh.profile.bundles`，那一層完全不會生效，而且不會有任何警告。

```sh
dsh plugin --profile probe add "$PWD"       # 在這個專案目錄內執行
```

本地目錄是以 link 掛上、不是複製，所以 profile 永遠看到你當下的 `cordis.patch.yml` 和當下的
`dist/`。接下來的循環只有兩個指令：

```sh
npm run build                                          # 只有改了 src/ 才需要
dsh --profile probe                                    # Ctrl-C 結束
```

啟動後會印出：

```
[{{PLUGIN_ID}}] Hello, World!
```

改 `cordis.patch.yml` 不用重新建置、也不用重新 add——直接再啟動一次即可。

想在不啟動的情況下看組合後的設定：

```sh
dsh --profile probe --dump-config | grep -A5 {{PLUGIN_ID}}
```

某一行看起來不對時去查它，但別把它當成證明：它只說明設定層組合成功，完全不代表 Node 解析得到你的
模組——一個 dump 得漂漂亮亮的 profile 照樣可能每次啟動都失敗。**真的啟動才是證明。**

**清理**

移掉整個拋棄式 profile：

```sh
rm -rf "${DSH_HOME:-$HOME/.dsh}/profiles/probe"
```

若要從一個你還在用的 profile 中只拿掉這個插件，用 `remove`——它只卸載這一個相依並把對應的層移出
`dsh.profile.bundles`，該 profile 的其他插件、你自己的 `cordis.patch.yml` 覆寫層、以及
`pnpm-workspace.yaml` 裡的 `allowBuilds` 授權都會保留：

```sh
dsh plugin --profile my-profile remove {{PKG_NAME}}
```

（`remove` 需要先解析整份 manifest，所以當 manifest 引用了已不存在的路徑時它自己也會失敗；那種壞掉的
狀態只能靠 `rm -rf` 或手動編輯 `package.json` 脫身。）

## 用參數覆寫

```sh
dsh --profile probe --greeting 'Good morning'   # [{{PLUGIN_ID}}] Good morning
dsh --profile probe --help                      # 這個應用的說明，什麼都不會啟動
```

啟動器的參數必須寫在應用參數之前；啟動器的解析器在遇到第一個它不認得的 token 就停止，從那裡開始
全部屬於應用。

## 相依鎖定

所有 `@deepseek-ai/*` 套件都放在 `devDependencies`，而且鎖的是版本**線**、不是某一次建置。

使用者安裝時不會裝 devDependencies，所以這個插件被裝到別處之後，會經由
`$DSH_HOME/profiles/node_modules` 解析、綁定到那個 harness 自己的副本。但你在這裡開發時剛好相反：
本專案的 `node_modules` 就在解析路徑上而且會勝出，實際執行的是本地那份——所以它必須完整安裝，
連 peer 一起。

- `@deepseek-ai/dsh-cmdline`：`{{DSH_TOOLS_VERSION}}`（`parseCmdline`，鎖定你已安裝的 dsh）
- `@deepseek-ai/cordis`：`^{{CORDIS_VERSION}}`
- `commander`：`parseCmdline` 所轉接的解析器

{{PITFALLS}}
