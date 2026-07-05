// Generates Bajgala app icons as PNGs with zero dependencies:
// indigo gradient rounded square + white chat bubble + indigo typing dots.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- drawing helpers (signed distance functions) ---
const roundRect = (px, py, cx, cy, hw, hh, r) => {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    r
  );
};
const circle = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) - r;
// point-in-triangle via barycentric sign test
function inTri(px, py, a, b, c) {
  const s = (p, q) => (px - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (py - q[1]);
  const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => c1.map((v, i) => lerp(v, c2[i], t));

function drawIcon(S, { maskable = false } = {}) {
  const rgba = Buffer.alloc(S * S * 4);
  const top = [122, 108, 255], bottom = [72, 84, 220]; // indigo gradient
  const dot = [91, 108, 255];
  const cornerR = maskable ? 0 : S * 0.225;
  // bubble geometry (relative to S)
  const bc = { x: S * 0.5, y: S * 0.46 };
  const bh = { w: S * 0.315, h: S * 0.21, r: S * 0.115 };
  const tail = [
    [S * 0.33, S * 0.6],
    [S * 0.29, S * 0.76],
    [S * 0.47, S * 0.665],
  ];
  const dots = [
    [S * 0.365, bc.y],
    [S * 0.5, bc.y],
    [S * 0.635, bc.y],
  ];
  const dotR = S * 0.042;
  const AA = S >= 512 ? 1.5 : 1.0; // anti-alias width in px

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const px = x + 0.5, py = y + 0.5;
      // background: rounded square (or full square for maskable)
      const bgD = roundRect(px, py, S / 2, S / 2, S / 2, S / 2, cornerR);
      const bgA = Math.max(0, Math.min(1, -bgD / AA + 0.5));
      if (bgA <= 0) continue; // transparent corner
      let col = mix(top, bottom, y / S);
      // white bubble (body + tail)
      const bubD = roundRect(px, py, bc.x, bc.y, bh.w, bh.h, bh.r);
      const bubA = Math.max(0, Math.min(1, -bubD / AA + 0.5));
      const tailA = inTri(px, py, ...tail) ? 1 : 0;
      const whiteA = Math.max(bubA, tailA);
      if (whiteA > 0) col = mix(col, [255, 255, 255], whiteA);
      // typing dots (only inside bubble body)
      if (bubA > 0.5) {
        for (const [dx, dy] of dots) {
          const dD = circle(px, py, dx, dy, dotR);
          const dA = Math.max(0, Math.min(1, -dD / AA + 0.5));
          if (dA > 0) col = mix(col, dot, dA);
        }
      }
      rgba[i] = Math.round(col[0]);
      rgba[i + 1] = Math.round(col[1]);
      rgba[i + 2] = Math.round(col[2]);
      rgba[i + 3] = Math.round(bgA * 255);
    }
  }
  return encodePNG(S, S, rgba);
}

const out = process.argv[2] ?? ".";
writeFileSync(`${out}/icon-512.png`, drawIcon(512));
writeFileSync(`${out}/icon-192.png`, drawIcon(192));
writeFileSync(`${out}/icon-maskable-512.png`, drawIcon(512, { maskable: true }));
writeFileSync(`${out}/apple-touch-icon.png`, drawIcon(180, { maskable: true }));
console.log("icons written to", out);
