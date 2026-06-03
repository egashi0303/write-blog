# my-app

## 概要
このアプリは、記事投稿を自動化するための社内用アプリです。

## 初回セットアップ

```powershell
npm install

# Article Production Platform

このリポジトリは、案件管理シートの情報をもとに記事とサムネを量産し、案件ごとのスプレッドシートとDrive保存をまとめて回すための運用基盤です。

## 目的

- 案件の情報を共有する
- コンセプトを決めて記事作成の下準備をする
- 案件情報から記事を自動生成する
- 記事生成後にサムネ準備までつなげる
- Drive とスプレッドシートへ出力する

## 本番運用

ユーザーが `記事作成` と送信したら、`prompts/article_production_operation_prompt.md` の正式手順で以下を一括実行する。

- 案件管理シートを確認する
- 登録されている全案件を同じタイミングで処理する
- 新規案件があればその回に含める
- 案件ごとに1本の記事を生成する
- ローカルに原稿を保存する
- 案件名フォルダを Drive 内に作成または再利用する
- その中に案件名のスプレッドシートを保存する
- 各案件シートの `記事一覧` に末尾追記する
- 記事タイトルができた案件は、そのままサムネ準備に進める
- サムネ背景を生成して Drive に保存する
- サムネイルURLを記事情報にリンクとして書き込む

## 保存ルール

- 1案件につきスプレッドシートは1つ
- 新規案件は案件名フォルダの中に保存する
- 既存案件は同じ案件名フォルダへ追記する
- 記事本文は案件管理シートに保存しない
- サムネも案件名フォルダ側で揃えて管理する
- 記事情報の末尾に `サムネイルURL` 列を持たせる

## 主要ファイル

- 記事ルール: `ARTICLE_RULES.md`
- 正式運用プロンプト: `prompts/article_production_operation_prompt.md`
- 重複回避ルール: `prompts/repeat_case_generation_rules.md`
- 記事保存先対応表: `config/article_output_spreadsheets.json`
- サムネ正式手順: `prompts/thumbnail_production_operation_prompt.md`
- サムネ準備フロー: `prompts/記事生成の準備/thumbnail_flow.md`
- サムネ保存先: `config/thumbnail_drive_destination.json`
- サムネ複数準備: `tools/prepare_thumbnail_batch.mjs`
- サムネ複数保存: `tools/publish_thumbnail_reports_batch.mjs`

実行例:

```powershell
node tools/prepare_thumbnail_batch.mjs outputs/generated_articles/CASE-0001_bandee.md outputs/generated_articles/CASE-0001_bandee_variant_02.md
```

`publish_thumbnail_reports_batch.mjs` には、`batch_manifest.json` か各記事の `thumbnail_generation_report.json` を渡す。
中身だけ確認したいときは `--dry-run` を付ける。

## GitHub共有時の注意

- `.env.local` はコミットしない
- `outputs/` は生成物のため Git 管理外にする
- `config/article_output_spreadsheets.json` と `config/thumbnail_drive_destination.json` には実運用の ID が入るため、公開範囲に応じて確認する
