// 256色の地図を、色を変えずに 256色の PNG（色表＋透明度）として書き出す＝無加工のまま小さく
import fs from 'node:fs'; import zlib from 'node:zlib';
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'latin1'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
// buf の中の地図を全部 [{zone, floor, png}] で返す
export function maps(buf) {
  const out = []; let i = 0x31; // 0x31 から 8文字の種類（menumap・ex_data など）＋ 8文字の名前、続いて絵の頭
  while (i >= 0 && i < buf.length - 0x60) {
    const name = buf.toString('latin1', i + 8, i + 16).replace(/\0+$/, '');
    const h = i + 16; const hs = buf.readUInt32LE(h), w = buf.readInt32LE(h + 4), ht = buf.readInt32LE(h + 8), bpp = buf.readUInt16LE(h + 14);
    if (hs !== 40 || bpp !== 8 || w <= 0 || w > 4096) break;
    if (buf.toString('latin1', h + 40, h + 44) === '3TXD') { out.push(dxt3(buf, h + 52, w, Math.abs(ht), name)); break; }
    if (h + 40 + 1024 + w * Math.abs(ht) > buf.length) break;
    const H = Math.abs(ht), pal = h + 40, px = pal + 1024;
    const plte = Buffer.alloc(768), trns = Buffer.alloc(256);
    for (let c = 0; c < 256; c++) { plte[c * 3] = buf[pal + c * 4 + 2]; plte[c * 3 + 1] = buf[pal + c * 4 + 1]; plte[c * 3 + 2] = buf[pal + c * 4]; trns[c] = Math.min(255, buf[pal + c * 4 + 3] * 2); }
    const raw = Buffer.alloc((w + 1) * H);
    for (let y = 0; y < H; y++) { const sy = ht > 0 ? H - 1 - y : y; raw[y * (w + 1)] = 0; buf.copy(raw, y * (w + 1) + 1, px + sy * w, px + sy * w + w); }
    const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 3;
    const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('PLTE', plte), chunk('tRNS', trns), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
    const m = /^m_(\d+)_(\d+)/.exec(name);
    out.push({ name, zone: m ? Number(m[1]) : null, floor: m ? Number(m[2]) : null, w, h: H, png });
    i = -1;
  }
  return out;
}
if (process.argv[2]) for (const m of maps(fs.readFileSync(process.argv[2]))) { fs.writeFileSync(process.argv[3] || 'x.png', m.png); console.log(m.name, m.zone, m.floor, m.png.length); }

// DXT3（4x4 の塊ごとに 透明度4bit×16 ＋ 色2つ ＋ 2bit×16）を戻して、そのままの色で PNG（32bit）にする
function dxt3(buf, at, w, h, name) {
  const rgba = Buffer.alloc(w * h * 4); let p = at;
  const c565 = v => [((v >> 11) & 31) * 255 / 31, ((v >> 5) & 63) * 255 / 63, (v & 31) * 255 / 31];
  for (let by = 0; by < h / 4; by++) for (let bx = 0; bx < w / 4; bx++) {
    const a = buf.subarray(p, p + 8); const c0v = buf.readUInt16LE(p + 8), c1v = buf.readUInt16LE(p + 10), idx = buf.readUInt32LE(p + 12); p += 16;
    const c0 = c565(c0v), c1 = c565(c1v); const cs = [c0, c1, c0.map((v, i) => (2 * v + c1[i]) / 3), c0.map((v, i) => (v + 2 * c1[i]) / 3)];
    for (let k = 0; k < 16; k++) {
      const x = bx * 4 + (k & 3), y = by * 4 + (k >> 2); const yy = FLIP ? h - 1 - y : y; const o = (yy * w + x) * 4;
      const al = (a[k >> 1] >> ((k & 1) * 4)) & 15; const c = cs[(idx >> (k * 2)) & 3];
      rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = Math.min(255, al * 17 * 2);
    }
  }
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  const m = /^m_(\d+)_(\d+)/.exec(name); return { name, zone: m ? Number(m[1]) : null, floor: m ? Number(m[2]) : null, w, h, png };
}
var FLIP = true; // 新しい型は上下が逆に入っている
