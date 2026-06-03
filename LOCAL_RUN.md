# Local Article Execution

`記事生成` を実際に走らせて、記事生成から Drive / Sheets 保存まで一気に実行したいときは、ローカルで次を起動します。

```powershell
node tools/article_command_server.mjs
```

起動後に次へアクセスします。

- `http://127.0.0.1:8787/`

このローカル画面では、`記事生成` ボタンを押すと `tools/run_article_batch.mjs` が実行され、記事・サムネ・保存処理まで進みます。

公開用の GitHub Pages は、案内と入力の入口です。実行はローカル版で行います。
