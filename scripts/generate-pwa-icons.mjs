import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const crcTable = new Uint32Array(256);

for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function makeIcon(size, output, maskable = false) {
  const bytesPerPixel = 4;
  const stride = size * bytesPerPixel + 1;
  const raw = Buffer.alloc(stride * size);
  const center = size / 2;
  const safeRadius = maskable ? size * 0.45 : size * 0.4;

  for (let y = 0; y < size; y += 1) {
    const row = y * stride;
    raw[row] = 0;

    for (let x = 0; x < size; x += 1) {
      const offset = row + 1 + x * bytesPerPixel;
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const glow = Math.max(0, 1 - distance / safeRadius);
      const band = Math.abs(y - (size * 0.62 - Math.sin(x / size * Math.PI * 2) * size * 0.08));
      const line = band < size * 0.025;

      raw[offset] = Math.round(10 + glow * 16);
      raw[offset + 1] = Math.round(10 + glow * 70 + (line ? 170 : 0));
      raw[offset + 2] = Math.round(10 + glow * 50 + (line ? 110 : 0));
      raw[offset + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  writeFileSync(output, png);
}

makeIcon(192, "public/icons/icon-192.png");
makeIcon(512, "public/icons/icon-512.png");
makeIcon(512, "public/icons/maskable-512.png", true);
makeIcon(72, "public/icons/badge-72.png", true);
