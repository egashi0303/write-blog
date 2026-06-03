# Article Production Operation Prompt

ユーザーが `記事作成` と送信したら、案件管理シートを起点に、登録されている全案件を同じタイミングで一括処理する。

この運用は、記事生成だけで終わらせず、記事の保存後にサムネ工程まで必ずつなげる正式手順である。

## 参照先

- 記事ルール: `C:\Users\user\blog-writer\ARTICLE_RULES.md`
- 案件管理シート: `https://docs.google.com/spreadsheets/d/1kFxjzYdlPkPBfE-9uo1gly_AIZZ149rDUNPHOQ6pjSo`
- 保存先フォルダ: `https://drive.google.com/drive/u/0/folders/1Wd_sWynNWrOfofWM3uYVzfXS6fgtEvQN`
- 重複回避ルール: `C:\Users\user\write-blog\prompts\repeat_case_generation_rules.md`
- 保存先対応表: `C:\Users\user\write-blog\config\article_output_spreadsheets.json`
- サムネ正式手順: `C:\Users\user\write-blog\prompts\thumbnail_production_operation_prompt.md`
- サムネ準備フロー: `C:\Users\user\write-blog\prompts\記事生成の準備\thumbnail_flow.md`

## 入力として見る情報

案件管理シートから、少なくとも次を読み取る。

- 案件ID
- 案件名
- 商品・テーマ
- 記事の目的
- CTA
- 伝えたいこと
- 必須条件
- 想定読者
- 参考記事リンク

## 正式な運用手順

### 1. 案件管理シートを確認する

- 案件管理シートを読み、登録されている全案件を確認する。
- 新しい案件が追加されていれば、既存案件と区別せず同じ実行回で処理対象に含める。
- まだ処理していない案件を優先するが、最終的には全案件を対象にする。

### 2. 既存記事との重複を避ける

- `repeat_case_generation_rules.md` を参照し、同じ案件が再登場しても前回と別切り口になるようにする。
- 直近の記事タイトル、切り口、主な訴求、CTA との重複を避ける。
- 同じ案件でも、前回と同じ説明順、同じ見出しの流れ、同じ結論に寄せない。

### 3. 1案件につき1本の記事を作成する

- 各案件ごとに、記事タイトルと本文を1本生成する。
- 記事は `ARTICLE_RULES.md` の書き方を守る。
- 不明な情報は補完しない。
- 参考記事リンクがある場合は、文脈理解のために参照する。

### 4. ローカルに保存する

- 案件ごとに Markdown で原稿を保存する。
- 保存先は `C:\Users\user\write-blog\outputs\generated_articles` とする。
- ファイル名は `案件ID_YYYYMMDD_切り口.md` を基本とする。
- 記事本文そのものを案件管理シートへ保存しない。

### 5. Drive 上の保存先を整える

- 新規案件や新しい保存先が必要な場合は、まず保存先フォルダ `1Wd_sWynNWrOfofWM3uYVzfXS6fgtEvQN` の中に、案件名と同じ名前のフォルダを作成または再利用する。
- その案件名フォルダの中に、同名のスプレッドシートを保存する。
- 1案件につきスプレッドシートは1つだけにする。
- 既存案件が再実行された場合も、同じ案件名フォルダ内の既存スプレッドシートへ追記する。

### 6. スプレッドシートへ追記する

- 各案件シートの `記事一覧` に、末尾へ1行追記する。
- 保存順は `記事作成日 / 案件ID / 案件名 / 切り口 / 記事タイトル / 記事本文 / サムネイルURL` とする。
- 既存記事がある場合は、その続きとして追記する。
- 縦横を入れ替えて保存する運用が必要な場合は、案件ごとの既存ルールを優先する。

### 7. サムネ工程に必ず渡す

- 記事タイトルができた案件は、必ずサムネ準備に進める。
- 記事生成だけで終わらせず、サムネ背景の作成と保存までを同じ実行回に含める。
- 記事ごとに1枚のサムネを作成する。
- サムネは、記事本文を読んだうえで、記事内容に合う背景として準備する。

### 8. サムネを生成する

- サムネ正式手順として `prompts/thumbnail_production_operation_prompt.md` を使う。
- サムネ準備フローとして `prompts/記事生成の準備/thumbnail_flow.md` を使う。
- 毎回 `templates/thumbnail_no_text_template.md` を使う。
- `youtube_thumbnail` や `facebook_post` のような見出し入りテンプレートは使わない。
- 読める文字を画像内に生成しない。
- サムネ画像は後工程の文字載せ前提の背景として扱う。

### 9. サムネをDriveへ保存する

- 採用した `thumbnail_url` をローカルに保存する。
- `tools/download_and_upload_image_to_drive.mjs` または `tools/publish_thumbnail_report_to_drive.mjs` を使ってDriveへ保存する。
- Drive保存先は `config/thumbnail_drive_destination.json` で管理する。
- ローカルキャッシュは `outputs/thumbnail_downloads` 配下に残す。
- 案件名フォルダの中に、サムネ成果物も揃えて保存する。
- 保存した `thumbnail_url` は、該当する記事行の `サムネイルURL` 列にリンクとして書き込む。

### 10. 全案件を同じタイミングで増やす

- `記事作成` のたびに、案件管理シートにある全案件を見て、同一日付で増やす。
- 追加された新規案件も、その場で同じ回に含める。
- CASE-0001 だけ、CASE-0002 だけ、のような単独実行は正式運用ではない。
- 記事作成とサムネ準備の両方が終わるまで、同じ実行回として扱う。

### 11. 結果を報告する

最後に、少なくとも次を報告する。

- 処理した案件数
- 処理した案件ID
- 生成した記事タイトル
- 作成したローカルファイル
- 保存したDriveフォルダ
- 保存したスプレッドシート
- 作成したサムネイル
- 保存したサムネイルURL
- サムネ保存先
- 追加した案件があればその旨
- 何か確認不足や制約があればその内容

## 例外時の扱い

- ある案件だけ処理できなくても、他の案件の処理は止めない。
- 不明点がある場合は、推測で埋めずに `NEEDS_CONFIRMATION.md` 相当の扱いで記録する。
- ルールが競合した場合は、`ARTICLE_RULES.md` と案件管理シートの記載を優先する。
