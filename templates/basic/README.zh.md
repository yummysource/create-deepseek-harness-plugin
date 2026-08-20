# {{PKG_NAME}}

> 由 [`create-deepseek-harness-plugin`](https://www.npmjs.com/package/create-deepseek-harness-plugin) 產生的 DeepSeek Harness **純副作用插件**（帶設定 schema）。

每 5 秒印出一次 `Hello, World!`。訊息內容與間隔都可以設定。

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
[{{PLUGIN_ID}}] loaded — printing every 5000ms
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

schema 的預設值是 5000 毫秒與 `Hello, World!`。使用者可以在自己 profile 的
`$DSH_HOME/profiles/<name>/cordis.patch.yml` 覆寫它——那一層在所有 bundle 層之後套用，
不需要改動這個套件：

```yaml
- id: {{PLUGIN_ID}}
  config:
    interval: 10000
    message: Good morning
```

patch 是把整個 `config` **取代**掉、不是逐鍵合併，所以覆寫時該行需要的每個鍵都要重寫一遍。

## 相依鎖定

所有 `@deepseek-ai/*` 套件都放在 `devDependencies`，因為它們**只是編譯期型別**：執行期插件綁定的是
它所安裝進去的那個 harness 裡的副本，經由 `$DSH_HOME/profiles/node_modules` 解析。宣告成真正的相依
會讓 profile 裝進第二份副本。

- `@deepseek-ai/cordis`：`^{{CORDIS_VERSION}}`
- `@deepseek-ai/schemastery`：`^{{SCHEMASTERY_VERSION}}`（`Config` schema 的建構器）

{{PITFALLS}}
