# {{PKG_NAME}}

> 由 [`create-deepseek-harness-plugin`](https://www.npmjs.com/package/create-deepseek-harness-plugin) 產生的 DeepSeek Harness **能力接縫**（服務定義 + 實作）。

發佈 `ctx.{{PLUGIN_ID_CAMEL}}`——一個任何其他插件都能注入使用的筆記儲存服務。

## 三個角色

| 角色 | 檔案 | 回答的問題 |
|---|---|---|
| Service Definition | `src/index.ts` | 這個能力**做什麼**（`{{SERVICE_CLASS}}`，抽象類別） |
| Service Provider | `src/local.ts` | **怎麼做**（此處是記憶體實作，換掉標記那三行即可） |
| Consumer | 任何插件 | `inject = ['{{PLUGIN_ID_CAMEL}}']` 之後直接呼叫 |

只有 provider 是可載入的 row；Definition 只是被 import 取型別並被繼承。成熟的接縫會把兩者拆成
不同套件，讓第三方能提供替代實作——這裡放在一起是為了讓產生的專案立刻能跑。

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
[{{PLUGIN_ID}}] provider ready — ctx.{{PLUGIN_ID_CAMEL}} available
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

## 在別的插件裡使用它

```ts
export const inject = ['{{PLUGIN_ID_CAMEL}}']

export async function apply(ctx: Context) {
  await ctx.{{PLUGIN_ID_CAMEL}}.save('greeting', 'Hello, World!')
  const note = await ctx.{{PLUGIN_ID_CAMEL}}.load('greeting')
  console.log(note?.text)
}
```

`inject` 是載入順序正確的關鍵：consumer 會等到這個 provider 就緒。載入**第二份**同名服務的實作會拋錯
——那是 cordis 對重複服務的標準行為，不是 bug。

## 設定

```yaml
- id: {{PLUGIN_ID}}
  config:
    maxEntries: 5000
```

## 相依鎖定

所有 `@deepseek-ai/*` 套件都放在 `devDependencies`，而且鎖的是版本**線**、不是某一次建置。

使用者安裝時不會裝 devDependencies，所以這個插件被裝到別處之後，會經由
`$DSH_HOME/profiles/node_modules` 解析、綁定到那個 harness 自己的副本。但你在這裡開發時剛好相反：
本專案的 `node_modules` 就在解析路徑上而且會勝出，實際執行的是本地那份——所以它必須完整安裝，
連 peer 一起。

- `@deepseek-ai/cordis`：`^{{CORDIS_VERSION}}`（`Service` 基底類別與 `Context`）
- `@deepseek-ai/schemastery`：`^{{SCHEMASTERY_VERSION}}`

{{PITFALLS}}
