const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('packages/sync-studio/public/logo.png');
let pos = 8, idats = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IDAT') idats.push(buf.subarray(pos + 8, pos + 8 + len));
  pos += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idats));
const width = 1024, height = 1024;
const grid = new Uint8Array(width * height);
let rawPos = 0;
const prevRow = Buffer.alloc(width * 4);
const currRow = Buffer.alloc(width * 4);

for (let y = 0; y < height; y++) {
  const filter = raw[rawPos++];
  for (let x = 0; x < width * 4; x++) {
    const rawVal = raw[rawPos++];
    const a = x >= 4 ? currRow[x - 4] : 0;
    const b = y > 0 ? prevRow[x] : 0;
    const c = (x >= 4 && y > 0) ? prevRow[x - 4] : 0;
    let val = 0;
    if (filter === 0) val = rawVal;
    else if (filter === 1) val = (rawVal + a) & 0xff;
    else if (filter === 2) val = (rawVal + b) & 0xff;
    else if (filter === 3) val = (rawVal + Math.floor((a + b) / 2)) & 0xff;
    else if (filter === 4) {
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      val = (rawVal + pr) & 0xff;
    }
    currRow[x] = val;
  }
  for (let x = 0; x < width; x++) {
    grid[y * width + x] = currRow[x * 4] < 128 ? 1 : 0;
  }
  currRow.copy(prevRow);
}

// Inner hole boundary points from (506, 560)
const holePts = [];
for (let a = 0; a < 360; a += 5) {
  const rad = a * Math.PI / 180;
  for (let r = 5; r < 250; r++) {
    const x = Math.round(506 + r * Math.cos(rad));
    const y = Math.round(560 + r * Math.sin(rad));
    if (grid[y * width + x] === 1) {
      holePts.push([x, y]);
      break;
    }
  }
}

// Outer contour tracing
let startOuterY = 0, startOuterX = 0;
outerLoop: for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (grid[y * width + x] === 1) {
      startOuterX = x;
      startOuterY = y;
      break outerLoop;
    }
  }
}

function traceOuter(startX, startY) {
  const points = [];
  let x = startX, y = startY;
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];
  let dir = 7;
  points.push([x, y]);
  let cx = x, cy = y;

  for (let step = 0; step < 50000; step++) {
    let found = false;
    for (let i = 0; i < 8; i++) {
      const ndir = (dir + i) % 8;
      const nx = cx + dx[ndir];
      const ny = cy + dy[ndir];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (grid[ny * width + nx] === 1) {
          cx = nx;
          cy = ny;
          dir = (ndir + 5) % 8;
          found = true;
          break;
        }
      }
    }
    if (!found) break;
    if (cx === startX && cy === startY) break;
    points.push([cx, cy]);
  }
  return points;
}

const outerPts = traceOuter(startOuterX, startOuterY);

function simplify(pts, tol) {
  if (pts.length <= 2) return pts;
  let maxD = 0, index = 0;
  const p1 = pts[0], p2 = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const num = Math.abs((p2[1] - p1[1]) * p[0] - (p2[0] - p1[0]) * p[1] + p2[0] * p1[1] - p2[1] * p1[0]);
    const den = Math.hypot(p2[1] - p1[1], p2[0] - p1[0]);
    const d = den === 0 ? Math.hypot(p[0] - p1[0], p[1] - p1[1]) : num / den;
    if (d > maxD) {
      maxD = d;
      index = i;
    }
  }
  if (maxD > tol) {
    const left = simplify(pts.slice(0, index + 1), tol);
    const right = simplify(pts.slice(index), tol);
    return left.slice(0, left.length - 1).concat(right);
  }
  return [p1, p2];
}

const simpOuter = simplify(outerPts, 1.2);
const simpHole = simplify(holePts, 1.0);

function ptsToPath(pts) {
  return 'M ' + pts.map(p => p[0] + ',' + p[1]).join(' L ') + ' Z';
}

const pathData = ptsToPath(simpOuter) + ' ' + ptsToPath(simpHole);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="currentColor">
  <path fill-rule="evenodd" clip-rule="evenodd" d="${pathData}" />
</svg>
`;

fs.writeFileSync('packages/sync-studio/public/logo.svg', svg);
console.log('Successfully wrote packages/sync-studio/public/logo.svg, size:', svg.length);
