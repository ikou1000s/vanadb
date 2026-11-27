# 地図の書き出し（家PCで手で回す。毎日の組み立てでは回さない）

ゲーム内の地図を、手を加えずに src/maps/*.webp と src/maps.json にする手順。FF11 が入っている PC で行う。

1. `node scan.mjs "C:/Program Files (x86)/PlayOnline/SquareEnix/FINAL FANTASY XI"` … 地図の入ったファイルを探す（found.json）
2. `node exall.mjs` … 同じエリア・階は新しい型を優先して PNG に書き出す（out/・meta.json）
3. 「仮の地図」（同じ中身が5枚以上）を外して keep.json を作る（2026-11-27 は 643枚・233エリア）
4. `node save-srv.mjs .` を立て、ブラウザで http://localhost:8766/ を開いて、コンソールで `await run(0.86)` → webp/ に WebP ができる
5. webp/*.webp を src/maps/ に、keep.json から src/maps.json（[名前, エリア番号, 階]）を作る

絵の中身は変えない（色・形・文字はそのまま。WebP にするのは大きさを小さくするためだけ）。
