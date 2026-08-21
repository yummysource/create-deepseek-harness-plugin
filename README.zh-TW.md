# create-deepseek-harness-plugin

[English](README.md) | 繁體中文

產生一個能一次編譯成功、掛得上去、也真的跑得起來的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件專案。

```sh
npx create-deepseek-harness-plugin@latest hello-world -t basic
```

`@latest` 不要省略：npx 會快取，少了它可能默默跑到你幾個月前那份。

## 模板

| 模板 | 產生什麼 |
|---|---|
| `basic` | 帶 `Config` schema 的純副作用插件——一個計時器，間隔與訊息都可設定。 |
| `tool` | 模型可以呼叫的工具，用 `defineTool`：參數 schema、輸出 schema、render、UI 卡片，外加設定。 |
| `service` | 一組能力接縫：抽象的 Service Definition 加上一份能跑的實作，發佈成 `ctx.<id>`。 |
| `app` | 擁有自己命令列參數的應用，並透過 `!!js` 把參數餵進自己那一行設定。 |
| `events` | 監聽者：session 與工具事件、四種分派模式，以及自己宣告的事件供他人擴充。 |
| `llm` | LLM adapter：chunk 協定、attribution 契約，以及一個標記好的 provider 呼叫位置。 |

每個模板都附 `Config` schema——因為「讓它能設定」永遠是「讓它能跑」之後的第一個需求。

## 它替你避開的坑

**版本對齊你實際在跑的 harness。** 已安裝的插件在執行期綁定的是你 dsh 裡那幾份副本，所以編譯時用的型別必須是同一條版本線。這個工具會讀 `dsh --version` 並鎖定它回報的那條線，全程不連網——去問 npm 反而會重新踩進它要防的坑：`@deepseek-ai/dsh-tools` 的 `latest` dist-tag 是過期的 `0.0.1-rc.1`。

**相依放在該放的位置。** 所有 `@deepseek-ai/*` 一律放 `devDependencies`。使用者安裝時不會裝這些，所以已安裝的插件會經由 `$DSH_HOME/profiles/node_modules` 解析、綁定到 harness 自己那份；宣告成真正的相依則會連第二份副本一起出貨。本地開發時剛好相反——專案自己的 `node_modules` 會贏得解析——所以那些套件鎖的是版本**線**，而且它們的 peer 要正常安裝。餓著它們的話，插件編譯完全正常，然後每次啟動都失敗。

**`--verify` 會真的啟動插件，不只檢查設定。** `--dump-config` 只證明設定層組合成功；一個 dump 得漂漂亮亮的 profile 照樣可能每次啟動都失敗，因為 Node 根本解析不到那個模組。所以最後一步會啟動真實 profile，等到看見插件套用為止。

```sh
npx create-deepseek-harness-plugin@latest my-tool -t tool --yes --verify
```

**二十條踩坑筆記隨專案附上。** 每個產生出來的 README 結尾都有這份清單，讓人不必重新踩一遍——包含最花時間的那一條：CLI 要用 `npm i -g @deepseek-ai/dsh` 安裝，絕對不要用 `pnpm add -g`。

## 你真正會待在裡面的循環

先把插件掛進一個拋棄式 profile，路徑要用**絕對路徑**：

```sh
cd my-plugin
dsh plugin --profile probe add "$PWD"
```

相對路徑會以「你執行指令時所在的目錄」為基準解析；而該目錄若沒有 `package.json`，安裝會**半成功**
——symlink 建好了，但依賴沒被記錄，bundle 也就沒進 `dsh.profile.bundles`，那一層完全不會生效。
過程不報任何錯，`--dump-config` 只是安靜地少了你那一行。

本地目錄是以 link 方式掛上、不是複製，所以 profile 永遠看到你當下的 `cordis.patch.yml` 和當下的
`dist/`。接下來的循環只有兩個指令：

```sh
npm run build          # 只有改了 src/ 才需要
dsh --profile probe    # Ctrl-C 結束
```

改 patch 既不用重新建置、也不用重新 add。每個產生出來的 README 都附了這個循環，並寫明該專案成功時
會印出哪一行，你才知道要看什麼。

`dsh --profile probe --dump-config` 可以在不啟動的情況下看組合後的設定。某一行看起來不對時去查它，
但別把它當成證明：它只說明設定層組合成功，不代表 Node 解析得到你的模組。**真的啟動才是證明。**

清理有兩種方式，而它們不是同一種操作。對 profile 目錄下 `rm -rf` 是整個帶走——裡面的每個插件、
你自己的 `cordis.patch.yml` 覆寫層、以及 `allowBuilds` 授權全都消失。對拋棄式的 probe profile 來說
這正好，對你實際在用的 profile 則是錯的。要從保留的 profile 中只拿掉一個插件，用 `dsh plugin remove`
——它只卸載那一個相依並移除對應的層，其餘原封不動。兩者都不會動到你的插件原始碼、對話歷史、或全域設定，
因為那些都在 profiles 之外。

```sh
rm -rf "${DSH_HOME:-$HOME/.dsh}/profiles/probe"       # 拋棄式的那個
dsh plugin --profile my-profile remove my-plugin      # 只拿掉一個插件，profile 保留
```

產生的專案預設附英文 README；加上 `--lang zh` 則會改用繁體中文撰寫，連踩坑清單一起。無論選哪個，
程式碼、程式碼註解、以及 CLI 自己的輸出都維持英文。

## 選項

```
  -t, --template <name>    basic | tool | service | app | events | llm
  -n, --name <pkg>         npm 套件名（預設由目錄名推導）
      --plugin-id <id>     cordis 的 row id 與插件 name 匯出（預設推導）
      --tool-name <name>   模型看到的工具名，僅 tool 模板適用
  -l, --lang <en|zh>       產生的 README 語言（預設 en）
  -y, --yes                全部採用預設值，跳過提問
      --verify             產生後安裝、建置、掛載並啟動驗證
      --skip-install       不安裝相依套件
```

不帶任何參數執行就會逐項詢問。

## 環境需求

Node `^22.19.0 || >=24.0.0`，且 `pnpm` 需在 PATH 上（`dsh plugin` 會用到）。

## 授權

MIT
