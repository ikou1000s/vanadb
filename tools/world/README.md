# つながり地図の位置（src/world.json）を作り直す手順（手で回す・毎日の組み立てでは回さない）

1. `node get.mjs` … 各エリアの zone.yaml（公開データ）から、種類と出入り口の座標を zl.json に集める（paths.txt はエリアのファイルの一覧）
2. `node layout.mjs <src/maps.json> <data/zones.lua>` … 屋外・街のエリアの位置を、出入り口の座標のずれから計算して world.json に
3. world.json の comps（2エリア以上の塊）を src/world.json に入れる（[{id,x,z,w,c}]・links）

地図の絵は変えない。位置と大きさは出入り口の座標からの目安。
