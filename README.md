# Gmail Goggles

複製你正在看的 Gmail 信件永久連結。連結是 Gmail 的 thread permalink，只有能進入該信箱的人打得開。

這個 repository 有兩種用法：

- `extension/`：Chrome 擴充功能。在主旨旁、快捷鍵，以及 Gmail 自己的右鍵選單裡複製或開新分頁。
- 根目錄的 `Code.gs`：Google Workspace 外掛，在 Gmail 側邊欄顯示同一條連結。

## Chrome 擴充功能

在 Gmail 網頁打開一封郵件後可以：

- 按主旨右側的連結圖示複製連結。
- 按 Option+C（其他平台為 Alt+C）複製連結。若快捷鍵沒有生效，到 `chrome://extensions/shortcuts` 設定。
- 在信件列或已打開的信件上按右鍵。Gmail 自己的選單最後有「複製連結」與「在新分頁開啟」。這兩項不會出現在 Chrome 的一般右鍵選單。
- 按工具列圖示，查看連結、複製，或在新分頁開啟。

分割畫面時網址可能停在 `#inbox`。擴充功能改從已打開郵件的主旨，或你右鍵點到的那一列，取得 thread id。彈出視窗網址裡的 `#thread-f:` 十進位編號會轉成 `#all/` 連結。

### 安裝

1. 開啟 `chrome://extensions`。
2. 開啟「開發人員模式」。
3. 選擇「載入未封裝項目」。
4. 選這個 repository 的 `extension` 目錄。

擴充功能只在 `https://mail.google.com/` 運作。它在本機讀取網址與主旨上的 thread id，用來組出連結；不會把郵件內容送到其他伺服器。

### 開發

```bash
node --test extension/permalink.test.mjs
```

## Workspace 外掛

外掛在開啟郵件時出現在 Gmail 側邊欄，顯示可選取的 permalink，並提供在 Gmail 開啟的按鈕。permalink 由 `GmailApp` 的 `getPermalink()` 產生，不是自行拼接的公開網址。

本機用 [clasp](https://github.com/google/clasp) 推送 `Code.gs` 與 `appsscript.json`：

```bash
npm install -g @google/clasp
clasp login
clasp create --type standalone --title "Gmail Goggles"
clasp push
```

`.clasp.json` 含有 Script ID，已列入 `.gitignore`，不會出現在這個 repository。`.claspignore` 會避免 `clasp push` 把 `extension/` 推進 Apps Script。

OAuth scope 只有：

- `https://www.googleapis.com/auth/gmail.addons.execute`
- `https://www.googleapis.com/auth/gmail.addons.current.message.readonly`
