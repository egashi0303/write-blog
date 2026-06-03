# 記事生成の準備: サムネイル画像フロー

記事タイトルができたら、すぐにサムネイル準備へ進む。

## 基本ルール

- 毎回 `templates/thumbnail_no_text_template.md` を使う
- Canva の生成ベースは `desktop_wallpaper` を優先する
- `youtube_thumbnail` や `facebook_post` のような見出し入りテンプレートは使わない
- 文字、ラベル、ロゴ、見出しブロックは入れない
- 画像は写真ベースに限定する
- サムネイルは案件名フォルダの中に保存する

## 生成順

1. 記事 Markdown からタイトルを読み取る
2. タイトルに合う no-text のプロンプトを作る
3. まず Canva で `desktop_wallpaper` を使って候補を生成する
4. Canva が月次上限・quota limit・timeout・一時エラーを返したら、即座に direct image に切り替える
5. direct image も同じく写真ベース・文字ゼロ・余白ありで生成する
6. 先に成功した画像を 1 枚だけ採用する
7. `selected_candidate_thumbnail_url` または direct image の実体を取得する
8. `tools/publish_thumbnail_report_to_drive.mjs` で Drive へ保存する
9. ローカルキャッシュは `outputs/thumbnail_downloads` 配下に残す

## 複数記事のとき

- 複数記事をまとめて渡しても、1記事につき1枚を生成する
- まとめて準備する場合は `tools/prepare_thumbnail_batch.mjs` を使う
- まとめてDrive保存する場合は `tools/publish_thumbnail_reports_batch.mjs` を使う
- Canva で止まった記事だけ direct image に回して、他の記事はそのまま続ける

## ねらい

記事タイトルができた時点で、サムネイルの準備と Drive 保存までを止めずに回す。  
Canva が詰まっても、同じ文字ゼロ方針の写真ベース画像へすぐ切り替えて、最終的に画像が 0 枚になる状態を避ける。
