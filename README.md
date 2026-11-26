# ヴァナDB（FF11 装備データベース・vanadb.com・2026-11-26〜）

Addness：ゴール fc1958b6-8245-4dfd-8098-173985c99f1b（FF11ブログ 5fe10d82 の下）

## 作り直し方（家PC）
```
cd C:\Users\ケンゾウ\Desktop\Claud用\ff11-db
node src/fetch.mjs   # Windower Resources から最新のデータを取る（data/*.lua・asof.json）
node src/build.mjs   # site/ を作り直す（装備 約1.55万ページ＋絞り込み＋items.json）
py -m http.server 8791 --bind 127.0.0.1 --directory site   # 手元で見る → http://127.0.0.1:8791/
```

## 中身
- データの元：Windower Resources（GitHub・BSD-3）。毎月のバージョンアップに追随。性能はゲーム内の説明文から分解（src/build.mjs の parseStats）。「ペット:」以降はペット、それ以外の「◯◯:」（潜在能力など）以降は条件付きとして絞り込みに入れない。
- ブログとのつなぎ：fc2-updater/gear_index.html（記事173の元）から「装備名→使っているセット」を読み、装備ページにリンクを出す（src/blog.mjs）。
- 画像は使わない（FF11の画像の利用条件が未確認）。オーグメントは含まない。
- 遊んで確かめる物（ドロップ率・手応え）は載せない（ブログ・攻略サイトの役割）。

## 残り
- 公開：GitHub ikou1000s/vanadb（公開リポジトリ）→ GitHub Actions が毎日5時に fetch＋build して GitHub Pages へ（.github/workflows/deploy.yml）。ドメイン vanadb.com（Cloudflare・ikou1000s・2027/11/26まで自動更新）。ブログの逆引きは build の時に fc2-updater から data/blog_gear_index.html に写す→変わったら commit・push すると反映
- AdSense・Search Console の登録
- 次の区分：アイテム・魔法・WS → 入手方法 → マップ・クエスト
