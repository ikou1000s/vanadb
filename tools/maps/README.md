# 地図の書き出し（家PCで手で回す。毎日の組み立てでは回さない）

ゲーム内の地図を、手を加えずに src/maps/*.webp と src/maps.json にする手順。FF11 が入っている PC で行う。

1. `node scan.mjs "C:/Program Files (x86)/PlayOnline/SquareEnix/FINAL FANTASY XI"` … 地図の入ったファイルを探す（found.json）
2. `node exall.mjs` … 同じエリア・階は新しい型を優先して PNG に書き出す（out/・meta.json）
3. 「仮の地図」（同じ中身が5枚以上）を外して keep.json を作る（2026-11-27 は 643枚・233エリア）
4. `node save-srv.mjs .` を立て、ブラウザで http://localhost:8766/ を開いて、コンソールで `await run(0.86)` → webp/ に WebP ができる
5. webp/*.webp を src/maps/ に、keep.json から src/maps.json（[名前, エリア番号, 階]）を作る

絵の中身は変えない（色・形・文字はそのまま。WebP にするのは大きさを小さくするためだけ）。

## リージョンの地図（2026-11-28）

ゲームのメニューのリージョンマップ（種類 menumap、512×512・256色）を、手を加えずに src/regions/*.webp に置く。maps/regions.html で使う。

| ファイル | 中身 | 元（ROM/フォルダ/番号.DAT・名前） |
| --- | --- | --- |
| rg_middle | 中の国（コンクエストの地図） | ROM/17/23・conquest（ROM/195/94 の m_ex4_rg はほぼ同じ絵） |
| rg_east | アトルガン | ROM/161/34・m_ex3_rg |
| rg_west | ウルブカ | ROM/292/107・m_ex5_rg |
| rg_san / rg_bas / rg_win / rg_jun | 国の全体図 | ROM/18/63・68・74・79（m_san_00 など。_01〜_03 は区画ごとに光る版） |

書き出しは `node idx.mjs <DAT> out/rg_xxx.png` → 上の手順4と同じく WebP（0.86）。
