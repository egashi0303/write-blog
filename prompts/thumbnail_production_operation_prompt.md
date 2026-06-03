# Thumbnail Production Operation Prompt

この手順は、記事本文からサムネイル背景を生成し、その後に各案件フォルダへ保存するための正式運用手順である。

## 入力

- 記事Markdown
- 記事タイトル
- 案件IDまたは記事slug
- 案件名
- 保存先フォルダ: `https://drive.google.com/drive/u/0/folders/1Wd_sWynNWrOfofWM3uYVzfXS6fgtEvQN`

## 目的

記事内容に合う、写真ベースの高品質なサムネイル背景を安定して生成する。

## テンプレートルール

- 毎回 `templates/thumbnail_no_text_template.md` を使う
- Canva の生成ベースは `desktop_wallpaper` を優先する
- `youtube_thumbnail` や `facebook_post` のような見出し入りテンプレートは使わない
- 文字、見出し、ラベル、バッジ、説明文が入った候補は採用しない
- 候補に文字が見えた場合は、その候補を捨てて再生成する
- 画像は必ず後工程の文字載せ前提の「背景」として扱う

## 生成ルール

- イラストにしない
- 文字を入れない
- ロゴを入れない
- 読めるテキストを画像内に生成しない
- 主役は1人または1つの明確な被写体に絞る
- 余白を残し、後工程の文字載せを前提にする
- 暗すぎる、派手すぎる、情報量が多すぎる構図は避ける
- 記事の年齢層やトーンに合わせて、安心感のある写真にする

## プロンプト雛形

```text
Create a photorealistic editorial photo, not an illustration, not a vector graphic, not a 3D render, not a cartoon.
Use a blank, text-zero canvas with no typography, no caption blocks, no title blocks, and no labels.
Preferred canvas type: desktop_wallpaper.

Main subject: [記事内容に合う具体的な被写体]

Article theme: [記事の主題を短く要約]

Setting: warm natural light, realistic environment, subtle relevant props, calm and trustworthy atmosphere.

Leave clean negative space for later Japanese title overlay, especially upper-left and center-left.

Do not include any readable text, letters, numbers, logos, brand names, or fake UI text.
Avoid flashy colors, luxury imagery, stacks of cash, coins, aggressive screens, anxiety, and gambling feeling.
Professional blog thumbnail photograph, soft contrast, warm but restrained colors.
```

## 採用基準

- 写真であること
- 文字がないこと
- テキスト枠や見出し枠がないこと
- 余白があること
- 主役が記事のテーマを自然に伝えていること
- 文字が見える候補は不採用

## 保存手順

1. Canvaで候補を生成する。
2. 採用候補を1枚選ぶ。
3. `get_design` で取得した `selected_candidate_thumbnail_url` をローカルにダウンロードする。
4. `tools/download_and_upload_image_to_drive.mjs` で、案件名フォルダの中へアップロードする。
5. ローカルキャッシュも `outputs/thumbnail_downloads` 配下に残す。
6. サムネイルは、案件フォルダの中に保存する。
7. 保存したURLは、対応する記事行の `サムネイルURL` にリンクとして反映する。
