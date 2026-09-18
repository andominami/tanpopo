# 保険算定ルールノート (apotool)

歯科医院の保険算定で**間違えやすいルール**をキーワード検索してすぐ読めるようにする、
ビルド不要の静的サイトです。GitHub Pages でそのまま公開できます。

## サイトの機能

- キーワード検索（タイトル・カテゴリ・本文を対象、スペース区切りでAND検索）
- カテゴリ（大分類）での絞り込み
- 検索語のハイライト表示
- 各ルールへの直接リンク（`#rule-001` のような URL で共有可能）
- 新しい順 / 古い順 / No.順 / 閲覧数順の並び替え
- ルールに写真を添付して一覧・詳細で表示
- ルールにWord/PDFなどのファイル（様式・テンプレート等）を添付してダウンロードボタンを表示
- 「現在の情報」と「アーカイブ」をタブで切り替え表示
- ルールごとの閲覧数を記録・表示（要セットアップ）
- ルールに☆を付けてお気に入り登録し、「お気に入りのみ」表示で絞り込み（この端末のブラウザだけに保存）

## 使い方（ローカル確認）

ビルド不要です。リポジトリ直下で簡易サーバーを立てて `index.html` を開くだけで動作します。

```bash
python3 -m http.server 8000
# http://localhost:8000 を開く
```

（`fetch` で `data/rules.json` を読み込むため、`file://` で直接開くとブラウザによっては
CORS エラーになります。必ずローカルサーバー経由で確認してください。）

## ディレクトリ構成

```
index.html            サイト本体（1ページのみ）
assets/style.css       スタイル
assets/app.js          検索・フィルタ・詳細表示のロジック
assets/photos/          ルールに添付する写真（xlsxから自動で書き出される）
data/rules.json         表示用データ（サイトが実際に読み込むファイル）
data/source.xlsx        元データ（保険算定ルール一覧シート）
scripts/xlsx_to_json.py  source.xlsx → rules.json の変換スクリプト
.github/workflows/pages.yml  GitHub Pages への自動デプロイ設定
```

## ルールを追加・更新する方法

1. `data/source.xlsx` の「保険算定ルール一覧」シートに行を追加する
   （列: No / 日付 / カテゴリ / タイトル / 内容(ルール詳細)）。
   写真を付けたい場合は、その行の「添付画像」列あたりのセルに画像をそのまま
   貼り付ける（Excelに画像を挿入する操作でOK）。
2. 変換スクリプトを実行して `data/rules.json` を再生成する。

   ```bash
   pip install openpyxl
   python3 scripts/xlsx_to_json.py
   ```

   貼り付けた画像は自動で検出され、`assets/photos/` に書き出されたうえで
   該当ルールの `images` に登録される。
3. 差分を確認して commit / push する。

`data/rules.json` を直接編集しても構いません（各項目は
`no`, `id`, `date`, `category`, `group`, `title`, `detail`, `images`, `files`, `archived` を持つ
JSON 配列です。`images` はそのルールに紐づく画像ファイルへの相対パスの配列、
`files` はダウンロード用に添付するファイル（Word/PDFの様式など）の配列で、
各要素は `{"name": "表示名.docx", "path": "assets/documents/xxx.docx"}` の形、
`archived` は下記の「アーカイブ」に表示するかどうかのフラグです）。

添付ファイルの実体は `assets/documents/` に置きます（写真が `assets/photos/` に
置かれるのと同じ考え方です）。

### 古くなったルールをアーカイブする

`archived` を `true` にすると、そのルールは「現在の情報」タブから外れ、
「アーカイブ」タブに表示されるようになります（削除はされません）。

`scripts/xlsx_to_json.py` を再実行しても、既に `data/rules.json` 側で
`archived: true` にしたルールの状態は維持されます。

### GitHubの操作に慣れていない場合

Claude（Claude Code）のチャットで「このルールを追加して」「No.◯◯をアーカイブして」
などと、ルールの文章や写真をそのまま送ってもらえれば、代わりにサイトへの反映・公開まで
対応できます。

### Googleフォームからスタッフが直接投稿する

`automation/` に、Googleフォームの回答を自動で `data/rules.json` に反映する
Apps Scriptと設定手順を用意しています。詳しくは `automation/README.md` を参照。

### 閲覧数カウンターを有効にする

デフォルトでは閲覧数機能はオフ（バッジ非表示・並び替えは無効時と同じ順）になっています。
有効にするには、独立したGoogle Apps Script Webアプリを1つデプロイし、
そのURLを `assets/app.js` の `VIEW_COUNTER_API_URL` に設定してください。
手順は `automation/view-counter-README.md` を参照。

### お気に入り機能について

一覧・詳細画面の☆ボタンでルールをお気に入り登録できます。ツールバーの
「★ お気に入りのみ」にチェックを入れると、登録したルールだけに絞り込めます。

この機能はブラウザの `localStorage` に保存する仕組みのため、**同じ端末・同じブラウザ
でだけ有効**です。スタッフ間や他の端末とは共有されません（サーバー側には何も保存されません）。

## GitHub Pages で公開する

1. GitHub のリポジトリ設定 → **Settings → Pages** を開く。
2. **Source** を `GitHub Actions` に設定する。
3. `main` ブランチに push すると `.github/workflows/pages.yml` が自動でデプロイする。

## 図書室 蔵書検索・貸出状況サイト（`library/`）

院内図書室の本を一覧・検索でき、貸出日と借りた人がわかるサイトを `library/` 以下に
同居させています。トップページ右上の「図書室 📚」から移動できます
（公開後の URL は `<PagesのURL>/library/`）。

### サイトの機能

- 書名・著者・出版社・カテゴリでのキーワード検索（スペース区切りでAND検索）
- カテゴリ（大分類）・貸出状況（在架のみ／貸出中のみ）での絞り込み
- 本ごとの詳細画面で、現在の貸出状況（借りた人・貸出日・返却予定日）と
  過去の貸出履歴（借りた人・貸出日・返却日の一覧）を表示
- No.順 / 書名順 / 貸出日が新しい順の並び替え

### ディレクトリ構成

```
library/index.html        図書室サイト本体
library/assets/style.css  スタイル
library/assets/app.js     検索・フィルタ・詳細表示のロジック
library/data/books.json   表示用データ（本の情報・貸出状況・貸出履歴）
```

### 本を追加する・貸出/返却を記録する方法

`library/data/books.json` を直接編集します。各本は以下の項目を持つJSON配列です。

```json
{
  "no": 1,
  "id": "book-001",
  "title": "書名",
  "author": "著者名",
  "publisher": "出版社名",
  "isbn": "978-4-xxxx-xxxx-x",
  "category": "健康・医療",
  "location": "待合室 本棚A",
  "currentLoan": null,
  "loanHistory": []
}
```

- 貸出中にする場合は `currentLoan` を
  `{ "borrower": "借りた人の名前", "loanDate": "2026/09/18", "dueDate": "2026/10/02" }`
  のように設定する（`dueDate` は任意）。
- 返却されたら `currentLoan` を `null` に戻し、`loanHistory` に
  `{ "borrower": "借りた人の名前", "loanDate": "貸出日", "returnDate": "返却日" }`
  を追加する。
- カテゴリの一覧・表示順は `library/assets/app.js` 先頭の `CATEGORY_ORDER` で
  変更できる（実際の書架のカテゴリに合わせて自由に編集してください）。

GitHubの操作に慣れていない場合は、保険算定ルールノートと同様に、Claude（Claude Code）の
チャットで「この本を追加して」「〇〇さんに△△を貸し出して」「△△が返却された」などと
伝えてもらえれば、代わりにサイトへの反映・公開まで対応できます。
