# {{PKG_NAME}}

> 由 [`@allis-plugin/create-dsh`](https://www.npmjs.com/package/@allis-plugin/create-dsh) 產生的 DeepSeek Harness **LLM adapter**。

讓 harness 學會跟某一個 provider 對話。它宣告的路由是 `{{PLUGIN_ID}}`；指名該 provider 的模型請求
就會落到這個 adapter。

## adapter 對 harness 的義務

`stream()` 是唯一必須實作的方法——它收到一個 provider 中立的請求，吐出 harness 的 chunk 詞彙。
`providerInfo`、`listModels`、`resolveModel`、`providerRetryPolicy` 都有可用的預設實作；只有當你的
provider 能給出比預設更好的答案時才需要覆寫。

有兩條契約沒有商量餘地：

1. **每一個送往 provider 的 HTTP 請求都要帶 `attributionHeaders()`。** 它向 provider 表明 harness 的身分，
   任何東西都不能把它抑制掉——請把它**合併**進你的 headers，不要用自己那組整個取代。`src/index.ts` 裡的
   `buildHeaders()` 就是做這件事的地方。
2. **`stream()` 要尊重 `options.signal`。** 被取消的回合必須停掉 provider 呼叫，而不是讓它漏在那裡。

## chunk 協定

```
block-start  →  text-delta …  →  block-end  →  usage  →  finish
```

`block-end` 帶的是**完整的區塊**、不只是最後一個 delta：消費端會用它重建整則訊息，所以它是權威值、
不是順手附上的方便欄位。`finish` 收的是帶 `kind` 的 `FinishReason` 物件、不是裸字串，而且那張 reason
對照表是可合併擴充的，provider 能提出自己的理由。

## 把 echo 換成真的呼叫

產生出來的 `stream()` 是把最後一則使用者訊息回聲回去，沒有真的呼叫任何人。這讓專案立刻可跑、也把協定
完整展示出來；provider 呼叫就放在那個標記好的位置。用 `this.config.baseUrl`、`this.buildHeaders(...)`，
並把 `options.signal` 傳給 `fetch`。

啟動只證明 adapter 註冊成功；要讓模型真的走這條路由，需要一個 provider 和憑證。

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
[{{PLUGIN_ID}}] adapter registered for: {{PLUGIN_ID}}
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
    providers: ['{{PLUGIN_ID}}', 'my-alias']
    baseUrl: https://api.example.com/v1
```

兩個 adapter 宣告同一條路由是**註冊衝突**、不是競態——它會拋錯，而且既有路由不受影響。

## 相依鎖定

所有 `@deepseek-ai/*` 套件都放在 `devDependencies`，而且鎖的是版本**線**、不是某一次建置。

使用者安裝時不會裝 devDependencies，所以這個插件被裝到別處之後，會經由
`$DSH_HOME/profiles/node_modules` 解析、綁定到那個 harness 自己的副本。但你在這裡開發時剛好相反：
本專案的 `node_modules` 就在解析路徑上而且會勝出，實際執行的是本地那份——所以它必須完整安裝，
連 peer 一起。

- `@deepseek-ai/dsh-llm`：`^{{DSH_TOOLS_VERSION}}`（`LlmAdapter`、chunk 型別、`attributionHeaders`）
- `@deepseek-ai/cordis`：`^{{CORDIS_VERSION}}`
- `@deepseek-ai/schemastery`：`^{{SCHEMASTERY_VERSION}}`

{{PITFALLS}}
