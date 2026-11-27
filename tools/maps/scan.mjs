// ゲームのフォルダの ROM* の中から、地図の絵（512x512・256色、名前 m_エリア_階）が入ったファイルを探す
import fs from 'node:fs'; import path from 'node:path';
const G = process.argv[2]; const found = [];
for (const r of fs.readdirSync(G).filter(d => /^ROM\d*$/.test(d))) {
  for (const d of fs.readdirSync(path.join(G, r))) {
    const dp = path.join(G, r, d); let st; try { st = fs.statSync(dp); } catch { continue; } if (!st.isDirectory()) continue;
    for (const f of fs.readdirSync(dp)) {
      const fp = path.join(dp, f); const s = fs.statSync(fp).size; if (s < 200000 || s > 1200000) continue;
      const fd = fs.openSync(fp, 'r'); const b = Buffer.alloc(0x60); fs.readSync(fd, b, 0, 0x60, 0); fs.closeSync(fd);
      const cat = b.toString('latin1', 0x31, 0x39).trim(), nm = b.toString('latin1', 0x39, 0x41);
      if (b.readUInt32LE(0x41) === 40 && b.readInt32LE(0x45) === 512 && b.readUInt16LE(0x4f) === 8 && /^m_\d+_\d+$/.test(nm)) found.push([`${r}/${d}/${f}`, nm, s, cat]);
    }
  }
}
fs.writeFileSync('found.json', JSON.stringify(found));
console.log(found.length, 'zones', new Set(found.map(x => x[1].split('_')[1])).size);
