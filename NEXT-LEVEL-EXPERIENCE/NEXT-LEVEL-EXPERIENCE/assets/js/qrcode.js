/* ==========================================================================
   Gerador de QR Code — implementação própria, sem dependências.
   Baseado na especificação ISO/IEC 18004 (modo byte, versões 1–40).
   Uso: NLX.QR.svg("https://...", { ecl: "M", margin: 4 })
   ========================================================================== */
(function () {
  "use strict";
  var ECL = { L: { o: 0, f: 1 }, M: { o: 1, f: 0 }, Q: { o: 2, f: 3 }, H: { o: 3, f: 2 } };
  var ECC_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  var NUM_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];

  function rawModules(v) {
    var r = (16 * v + 128) * v + 64;
    if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  function dataCodewords(v, e) { return Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[e.o][v] * NUM_BLOCKS[e.o][v]; }

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
    return z & 0xff;
  }
  function rsDivisor(deg) {
    var r = []; for (var i = 0; i < deg - 1; i++) r.push(0); r.push(1);
    var root = 1;
    for (i = 0; i < deg; i++) {
      for (var j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = gfMul(root, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift(); r.push(0);
      div.forEach(function (c, i) { r[i] ^= gfMul(c, f); });
    });
    return r;
  }

  function utf8(s) {
    if (window.TextEncoder) return Array.from(new TextEncoder().encode(s));
    var out = [], e = unescape(encodeURIComponent(s));
    for (var i = 0; i < e.length; i++) out.push(e.charCodeAt(i));
    return out;
  }

  function encode(text, eclName) {
    var e = ECL[eclName || "M"] || ECL.M;
    var bytes = utf8(text);
    var ver, ccBits;
    for (ver = 1; ver <= 40; ver++) {
      ccBits = ver <= 9 ? 8 : 16;
      var used = 4 + ccBits + bytes.length * 8;
      if (bytes.length < (1 << ccBits) && used <= dataCodewords(ver, e) * 8) break;
    }
    if (ver > 40) throw new Error("Texto longo demais para um QR Code.");

    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4); put(bytes.length, ccBits);
    bytes.forEach(function (b) { put(b, 8); });
    var cap = dataCodewords(ver, e) * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - (bits.length % 8)) % 8);
    for (var pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var b = 0; for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; data.push(b);
    }

    // blocos + correção de erros + intercalação
    var nb = NUM_BLOCKS[e.o][ver], eccLen = ECC_PER_BLOCK[e.o][ver];
    var raw = Math.floor(rawModules(ver) / 8);
    var nShort = nb - (raw % nb), shortLen = Math.floor(raw / nb);
    var div = rsDivisor(eccLen), blocks = [], p = 0;
    for (i = 0; i < nb; i++) {
      var dat = data.slice(p, p + shortLen - eccLen + (i < nShort ? 0 : 1));
      p += dat.length;
      var ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var cw = [];
    for (i = 0; i < blocks[0].length; i++)
      for (var j = 0; j < blocks.length; j++)
        if (i !== shortLen - eccLen || j >= nShort) cw.push(blocks[j][i]);

    // matriz
    var size = ver * 4 + 17;
    var M = [], F = [];
    for (i = 0; i < size; i++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
    function setF(x, y, d) { M[y][x] = d; F[y][x] = true; }

    for (i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var align = [];
    if (ver > 1) {
      var na = Math.floor(ver / 7) + 2;
      var step = Math.floor((ver * 8 + na * 3 + 5) / (na * 4 - 4)) * 2;
      align = [6];
      for (var pos = size - 7; align.length < na; pos -= step) align.splice(1, 0, pos);
    }
    for (i = 0; i < align.length; i++) for (j = 0; j < align.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) continue;
      for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++)
        setF(align[i] + ax, align[j] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
    }
    function formatBits(mask) {
      var d = (e.f << 3) | mask, r = d;
      for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var bt = ((d << 10) | r) ^ 0x5412;
      var g = function (i) { return ((bt >>> i) & 1) !== 0; };
      for (i = 0; i <= 5; i++) setF(8, i, g(i));
      setF(8, 7, g(6)); setF(8, 8, g(7)); setF(7, 8, g(8));
      for (i = 9; i < 15; i++) setF(14 - i, 8, g(i));
      for (i = 0; i < 8; i++) setF(size - 1 - i, 8, g(i));
      for (i = 8; i < 15; i++) setF(8, size - 15 + i, g(i));
      setF(8, size - 8, true);
    }
    formatBits(0);
    if (ver >= 7) {
      var r = ver;
      for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      var vb = (ver << 12) | r;
      for (i = 0; i < 18; i++) {
        var bit = ((vb >>> i) & 1) !== 0, a = size - 11 + (i % 3), c = Math.floor(i / 3);
        setF(a, c, bit); setF(c, a, bit);
      }
    }
    // dados
    var bi = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (j = 0; j < 2; j++) {
        var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!F[y][x] && bi < cw.length * 8) { M[y][x] = ((cw[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0; bi++; }
      }
    }
    function applyMask(m) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        if (F[y][x]) continue;
        var inv;
        switch (m) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
        }
        if (inv) M[y][x] = !M[y][x];
      }
    }
    function penalty() {
      var s = 0, x, y, run, dark = 0;
      for (y = 0; y < size; y++) {
        run = 1;
        for (x = 1; x < size; x++) { if (M[y][x] === M[y][x - 1]) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; }
      }
      for (x = 0; x < size; x++) {
        run = 1;
        for (y = 1; y < size; y++) { if (M[y][x] === M[y - 1][x]) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; }
      }
      for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
        var c = M[y][x];
        if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) s += 3;
      }
      for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (M[y][x]) dark++;
      var total = size * size;
      s += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return s;
    }
    var best = 0, bestP = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m); formatBits(m);
      var pn = penalty();
      if (pn < bestP) { bestP = pn; best = m; }
      applyMask(m);
    }
    applyMask(best); formatBits(best);
    return { size: size, version: ver, modules: M };
  }

  function svg(text, opts) {
    opts = opts || {};
    var q = encode(text, opts.ecl || "M"), mg = opts.margin == null ? 4 : opts.margin;
    var dim = q.size + mg * 2, d = "";
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++)
      if (q.modules[y][x]) d += "M" + (x + mg) + "," + (y + mg) + "h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + " " + dim + '" shape-rendering="crispEdges" role="img" aria-label="QR Code">' +
      '<rect width="100%" height="100%" fill="' + (opts.light || "#ffffff") + '"/><path d="' + d + '" fill="' + (opts.dark || "#08070D") + '"/></svg>';
  }

  function png(text, px, opts) {
    opts = opts || {};
    var q = encode(text, opts.ecl || "M"), mg = 4, dim = q.size + mg * 2;
    var scale = Math.max(1, Math.floor((px || 1024) / dim));
    var c = document.createElement("canvas");
    c.width = c.height = dim * scale;
    var g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#08070D";
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++)
      if (q.modules[y][x]) g.fillRect((x + mg) * scale, (y + mg) * scale, scale, scale);
    return c.toDataURL("image/png");
  }

  window.NLX = window.NLX || {};
  window.NLX.QR = { encode: encode, svg: svg, png: png };
})();
