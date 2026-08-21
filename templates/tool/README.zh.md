# {{PKG_NAME}}

> 由 [`@allis-plugin/create-dsh`](https://www.npmjs.com/package/@allis-plugin/create-dsh) 產生的 DeepSeek Harness **工具插件**。

註冊 `{{TOOL_NAME}}`，一個模型可以呼叫的工具。

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
[{{PLUGIN_ID}}] registered "{{TOOL_NAME}}" — listed=true
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

## 設定

```yaml
- id: {{PLUGIN_ID}}
  config:
    defaultGreeting: Good morning
```

patch 是把整個 `config` **取代**掉、不是逐鍵合併，所以覆寫時該行需要的每個鍵都要重寫一遍。

## 交付一個工具之前的自我檢查

- `description` 是從**模型的角度**寫的——只有任務相關的詞彙，沒有 UI 或傳輸層的術語。
- 每個模型必須提供的參數都標了 `required: true`。
- `output.schema` 精確描述 `execute` 的回傳值；`render` 是它的純函式。
- 工具會隨插件一起卸載（註冊即 effect，本模板已經做到）。

啟動 profile 看到 `listed=true` 就證明註冊成功。要讓模型**真的**呼叫這個工具則需要
`DEEPSEEK_API_KEY`；沒有 key 時呼叫會以 `MISSING_CREDENTIAL` 失敗。

## 相依鎖定

所有 `@deepseek-ai/*` 套件都放在 `devDependencies`，而且鎖的是版本**線**、不是某一次建置。

使用者安裝時不會裝 devDependencies，所以這個插件被裝到別處之後，會經由
`$DSH_HOME/profiles/node_modules` 解析、綁定到那個 harness 自己的副本。但你在這裡開發時剛好相反：
本專案的 `node_modules` 就在解析路徑上而且會勝出，實際執行的是本地那份——所以它必須完整安裝，
連 peer 一起。

- `@deepseek-ai/dsh-tools`：`{{DSH_TOOLS_VERSION}}`（精確版本，鎖定你已安裝的 dsh）
- `@deepseek-ai/cordis`：`^{{CORDIS_VERSION}}`
- `@deepseek-ai/schemastery`：`^{{SCHEMASTERY_VERSION}}`

{{PITFALLS}}
