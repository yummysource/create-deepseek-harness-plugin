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
| `events` | 監聽者：session 與工具事件，以及那條漏掉就會靜默吃掉工具呼叫的 emit / waterfall 規則。 |

每個模板都附 `Config` schema——因為「讓它能設定」永遠是「讓它能跑」之後的第一個需求。

## 它替你避開的坑

**版本對齊你實際在跑的 harness。** 插件在執行期綁定的是你已安裝的 dsh 裡那幾份副本，所以編譯時用的型別必須是同一條版本線。這個工具會讀 `dsh --version` 並鎖定它回報的版本，全程不連網——去問 npm 反而會重新踩進它要防的坑：`@deepseek-ai/dsh-tools` 的 `latest` dist-tag 是過期的 `0.0.1-rc.1`。

**相依放在該放的位置。** 所有 `@deepseek-ai/*` 一律放 `devDependencies`：它們只是編譯期型別，執行期插件會經由 `$DSH_HOME/profiles/node_modules` 解析到 harness 自己那份。宣告成真正的相依會讓 profile 裝進第二份副本——對純函式無害，對任何身分敏感的東西（Schema 實例、需要 `instanceof` 的 service 類別）則致命。

**`--verify` 會真的啟動插件，不只檢查設定。** `--dump-config` 只證明設定層組合成功；一個 dump 得漂漂亮亮的 profile 照樣可能每次啟動都失敗，因為 Node 根本解析不到那個模組。所以最後一步會啟動真實 profile，等到看見插件套用為止。

```sh
npx create-deepseek-harness-plugin@latest my-tool -t tool --yes --verify
```

**十五條踩坑筆記隨專案附上。** 每個產生出來的 README 結尾都有這份清單，讓人不必重新踩一遍——包含最花時間的那一條：CLI 要用 `npm i -g @deepseek-ai/dsh` 安裝，絕對不要用 `pnpm add -g`。

## 選項

```
  -t, --template <name>    basic | tool | service | app | events
  -n, --name <pkg>         npm 套件名（預設由目錄名推導）
      --plugin-id <id>     cordis 的 row id 與插件 name 匯出（預設推導）
      --tool-name <name>   模型看到的工具名，僅 tool 模板適用
  -y, --yes                全部採用預設值，跳過提問
      --verify             產生後安裝、建置、掛載並啟動驗證
      --skip-install       不安裝相依套件
```

不帶任何參數執行就會逐項詢問。

## 環境需求

Node `^22.19.0 || >=24.0.0`，且 `pnpm` 需在 PATH 上（`dsh plugin` 會用到）。

## 授權

MIT
