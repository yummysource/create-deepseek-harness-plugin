# {{PKG_NAME}}

> 由 [`create-deepseek-harness-plugin`](https://www.npmjs.com/package/create-deepseek-harness-plugin) 產生的 DeepSeek Harness **監聽插件**。

監聽 session log、工具註冊表、以及工具執行管線。它不貢獻任何東西——這正是遙測、稽核、把狀態鏡像到
別處這類需求該有的形狀。

## 兩種監聽語義，以及為什麼這很重要

| 語義 | 此處的事件 | 規則 |
|---|---|---|
| emit | `session/event`、`tools/change` | 純通知，沒有人在等你的回傳值。 |
| waterfall | `tools/pre-execute` | 一條鏈，**你必須呼叫 `next()`** 才會往下委派。 |

waterfall 監聽器沒呼叫 `next()` 就回傳會讓整條鏈短路——以 `tools/pre-execute` 來說，那個工具呼叫
根本不會發生，而且任何地方都不會報錯。這種靜默失敗是這個領域裡代價最高的錯誤。

監聽者永遠往下委派。回傳一個決策則是**策略**插件拒絕呼叫的做法——那是另一件工作，屬於它自己的插件。

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
[{{PLUGIN_ID}}] listening: session/event, tools/change, tools/pre-execute
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

session 與工具事件要等真的有工作在跑才會觸發，所以要下一個任務才看得到。

## 卸載證明

`ctx.on()` 本身就是 effect——cordis 會在卸載時移除那些監聽器。計時器則是 cordis 不擁有的資源，所以它
放在 `ctx.effect()` 裡並回傳 disposer。重新載入插件，你會在新實例啟動前看到 `DISPOSED` 印出來；
那一行就是這個插件沒有洩漏任何東西的證明。

## 設定

```yaml
- id: {{PLUGIN_ID}}
  config:
    sampleEvery: 1     # 每一條 session 事件都印，而不是每 25 條
```

## 相依鎖定

所有 `@deepseek-ai/*` 套件都放在 `devDependencies`，而且鎖的是版本**線**、不是某一次建置。

使用者安裝時不會裝 devDependencies，所以這個插件被裝到別處之後，會經由
`$DSH_HOME/profiles/node_modules` 解析、綁定到那個 harness 自己的副本。但你在這裡開發時剛好相反：
本專案的 `node_modules` 就在解析路徑上而且會勝出，實際執行的是本地那份——所以它必須完整安裝，
連 peer 一起。

- `@deepseek-ai/dsh-session`：`{{DSH_SESSION_VERSION}}`（`Session`、`SessionEvent`）
- `@deepseek-ai/dsh-tools`：`{{DSH_TOOLS_VERSION}}`（`ToolExecution`、`PreToolDecision`）
- `@deepseek-ai/cordis`：`^{{CORDIS_VERSION}}`

{{PITFALLS}}
