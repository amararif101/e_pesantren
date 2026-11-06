/**
 * Self-contained ISO/IEC 18004 QR Code Generator (Byte Mode, Error Correction Level M/L)
 * Zero external dependencies — generates crisp SVG & DataURL for A4 print, PDF, and screen.
 */

// Version 1 to 6 specifications for Error Correction Level L (total codewords, ec codewords per block, num blocks, alignment centers)
const VERSION_SPECS = [
  null,
  { size: 21, totalCodewords: 26, dataCodewords: 19, ecCodewords: 7, align: [] }, // V1-L (up to 17 bytes)
  { size: 25, totalCodewords: 44, dataCodewords: 34, ecCodewords: 10, align: [6, 18] }, // V2-L (up to 32 bytes)
  { size: 29, totalCodewords: 70, dataCodewords: 55, ecCodewords: 15, align: [6, 22] }, // V3-L (up to 53 bytes)
  { size: 33, totalCodewords: 100, dataCodewords: 80, ecCodewords: 20, align: [6, 26] }, // V4-L (up to 78 bytes)
  { size: 37, totalCodewords: 134, dataCodewords: 108, ecCodewords: 26, align: [6, 30] }, // V5-L (up to 106 bytes)
  { size: 41, totalCodewords: 172, dataCodewords: 136, ecCodewords: 18, blocks: 2, align: [6, 34] }, // V6-L (up to 134 bytes)
];

// GF(256) log/exp tables with primitive polynomial 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function getGeneratorPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data, ecLen) {
  const gen = getGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

function encodeUtf8Bytes(str) {
  const encoder = new TextEncoder();
  return encoder.encode(String(str || ""));
}

export function generateQrMatrix(text) {
  const bytes = encodeUtf8Bytes(text);

  // Pick smallest version from 1..5 that fits (bytes.length + 2 <= dataCodewords)
  let version = 1;
  while (version <= 5 && VERSION_SPECS[version].dataCodewords < bytes.length + 2) {
    version++;
  }
  if (version > 5) version = 5;
  const spec = VERSION_SPECS[version];
  const maxBytes = spec.dataCodewords - 2;
  const payload = bytes.length > maxBytes ? bytes.slice(0, maxBytes) : bytes;

  // Build bit stream: Mode 0100 (4 bits), Byte count (8 bits), Data, Terminator (up to 4 bits), Pad bytes 0xEC/0x11
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode
  pushBits(payload.length, 8);
  for (let i = 0; i < payload.length; i++) {
    pushBits(payload[i], 8);
  }

  const maxBits = spec.dataCodewords * 8;
  const terminatorLen = Math.min(4, maxBits - bits.length);
  pushBits(0, terminatorLen);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataWords = new Uint8Array(spec.dataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataWords[i] = b;
  }

  let padToggle = true;
  for (let i = bits.length / 8; i < spec.dataCodewords; i++) {
    dataWords[i] = padToggle ? 0xec : 0x11;
    padToggle = !padToggle;
  }

  const ecWords = computeReedSolomon(dataWords, spec.ecCodewords);
  const allWords = new Uint8Array(spec.totalCodewords);
  allWords.set(dataWords, 0);
  allWords.set(ecWords, dataWords.length);

  // Build matrix
  const size = spec.size;
  const matrix = Array.from({ length: size }, () => new Uint8Array(size));
  const reserved = Array.from({ length: size }, () => new Uint8Array(size));

  const setFunctionModule = (r, c, isDark) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    matrix[r][c] = isDark ? 1 : 0;
    reserved[r][c] = 1;
  };

  // Finder patterns + separators
  const drawFinder = (row, col) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter && (isBorder || isCenter));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment patterns
  if (spec.align.length > 0) {
    for (const ar of spec.align) {
      for (const ac of spec.align) {
        if (
          (ar === 6 && ac === 6) ||
          (ar === 6 && ac === size - 7) ||
          (ar === size - 7 && ac === 6)
        ) {
          continue;
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isDark =
              Math.max(Math.abs(dr), Math.abs(dc)) === 2 || (dr === 0 && dc === 0);
            setFunctionModule(ar + dr, ac + dc, isDark);
          }
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Dark module
  setFunctionModule(size - 8, 8, true);

  // Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      reserved[8][i] = 1;
      reserved[i][8] = 1;
    }
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = 1;
    reserved[size - 1 - i][8] = 1;
  }

  // Place data bits in upward/downward 2-column zig-zag
  const finalBits = [];
  for (let i = 0; i < allWords.length; i++) {
    for (let b = 7; b >= 0; b--) {
      finalBits.push((allWords[i] >> b) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;
  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // skip vertical timing line
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = rightCol - dc;
        if (!reserved[r][c]) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          // Apply Mask 0: (r + c) % 2 === 0
          const masked = (r + c) % 2 === 0 ? bit ^ 1 : bit;
          matrix[r][c] = masked;
        }
      }
    }
    upward = !upward;
  }

  // Format information for Error Correction Level L (01) and Mask 0 (000)
  // Precomputed BCH(15,5) masked with 0x5412 for (EC=L: 01, Mask=000 -> 01000): 0x77c4
  const formatBits = 0x77c4;
  const getFormatBit = (idx) => (formatBits >> idx) & 1;

  // Place format bits around top-left
  const tlRows = [8, 8, 8, 8, 8, 8, 8, 8, 7, 5, 4, 3, 2, 1, 0];
  const tlCols = [0, 1, 2, 3, 4, 5, 7, 8, 8, 8, 8, 8, 8, 8, 8];
  for (let i = 0; i < 15; i++) {
    matrix[tlRows[i]][tlCols[i]] = getFormatBit(14 - i);
  }

  // Place format bits on bottom-left and top-right
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = getFormatBit(14 - i);
  }
  for (let i = 7; i < 15; i++) {
    matrix[8][size - 15 + i] = getFormatBit(14 - i);
  }

  return matrix;
}

export function generateQrSvgDataUrl(text, { margin = 3, darkColor = "#1e293b", lightColor = "#ffffff" } = {}) {
  const matrix = generateQrMatrix(text || "SLV");
  const n = matrix.length;
  const total = n + margin * 2;

  let pathData = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        pathData += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${lightColor}"/><path d="${pathData}" fill="${darkColor}"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
