// vn_fuel_price_petrolimex.js
// Surge Panel: Giá xăng dầu VN theo PETROLIMEX, chia Vùng 1/Vùng 2
// Có thêm Xăng E10 RON95-III (nếu Petrolimex công bố), đơn vị đồng/lít.

const PETROLIMEX_SOURCES = [
  "https://www.petrolimex.com.vn/ndi/tin-gia-xang-dau.html",
  "https://www.petrolimex.com.vn/ndi/Thong-tin-dieu-hanh-gia-xang-dau.html",
  "https://www.petrolimex.com.vn/",
];
const PVOIL_FALLBACK = "https://www.pvoil.com.vn/tin-gia-xang-dau";

// ===== Helpers =====
function toNumVND(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,7})/);
  return m ? parseInt(m[1].replace(/[.,]/g, ""), 10) : null;
}
function fmt(v) {
  return v == null ? "—" : v.toLocaleString("vi-VN") + " đ/lít";
}
function extractCycle(text) {
  const m =
    text.match(/15:00[^\n]{0,100}?(?:ngày|Ngày)\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/i) ||
    text.match(/từ\s*15[:. ]00[^\n]{0,80}(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
  return m ? m[0].replace(/\s+/g, " ").trim() : "Kỳ điều hành gần nhất";
}
function flattenHTML(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function doneError(msg) {
  $done({ title: "Giá xăng dầu VN", content: msg, icon: "fuelpump.fill", "icon-color": "#FF3B30" });
}
function okPanel(title, content) {
  $done({ title, content, icon: "fuelpump.fill", "icon-color": "#FF9500" });
}

// ===== Parse Petrolimex =====
function parseRegionPrices(text) {
  const LABELS = [
    { key: "RON95_III", patterns: ["RON ?95-?III", "Xăng RON ?95"] },
    { key: "E5_RON92_II", patterns: ["E5\\s*RON\\s*92-?II", "Xăng E5\\s*RON92"] },
    { key: "E10_RON95_III", patterns: ["E10\\s*RON ?95-?III", "Xăng E10\\s*RON95"] },
    { key: "DO_005S_II", patterns: ["Dầu DO 0[,\\.]?05S-?II", "Dầu Diesel 0[,\\.]?05S-?II"] },
    { key: "DO_0001S_V", patterns: ["Dầu DO 0[,\\.]?001S-?V", "Dầu Diesel 0[,\\.]?001S-?V"] },
    { key: "KO", patterns: ["Dầu h?o?a?", "Dầu KO"] },
  ];
  function getAround(src, nameRegex, startIdx) {
    const idx = src.slice(startIdx).search(nameRegex);
    if (idx < 0) return { val: null, next: startIdx };
    const abs = startIdx + idx;
    const near = src.slice(abs, abs + 220);
    const m = near.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,7})\s*(?:đ|đồng)/iu);
    return { val: toNumVND(m && m[1]), next: abs + 30 };
  }
  // Tách khối Vùng 1 / Vùng 2
  const r1Idx = text.search(/Vùng\s*1/i);
  const r2Idx = text.search(/Vùng\s*2/i);
  let r1Text = "", r2Text = "";
  if (r1Idx >= 0 && r2Idx > r1Idx) {
    r1Text = text.slice(r1Idx, r2Idx);
    r2Text = text.slice(r2Idx);
  } else if (r2Idx >= 0 && r1Idx > r2Idx) {
    r2Text = text.slice(r2Idx, r1Idx);
    r1Text = text.slice(r1Idx);
  }
  function parseBlock(block) {
    const out = {};
    LABELS.forEach(lbl => {
      for (const p of lbl.patterns) {
        const { val } = getAround(block, new RegExp(p, "i"), 0);
        if (val) { out[lbl.key] = val; break; }
      }
      if (!(lbl.key in out)) out[lbl.key] = null;
    });
    return out;
  }
  const region1 = r1Text ? parseBlock(r1Text) : null;
  const region2 = r2Text ? parseBlock(r2Text) : null;
  return { region1, region2 };
}
function renderFromPetrolimex(html) {
  const text = flattenHTML(html);
  const cycle = extractCycle(text);
  const { region1, region2 } = parseRegionPrices(text);
  if (!region1 && !region2) return null;
  function linesFor(label, obj) {
    if (!obj) return [];
    return [
      `${label}`,
      `  RON95-III   : ${fmt(obj.RON95_III)}`,
      `  E5 RON92    : ${fmt(obj.E5_RON92_II)}`,
      `  E10 RON95   : ${fmt(obj.E10_RON95_III)}`,
      `  DO 0.05S-II : ${fmt(obj.DO_005S_II)}`,
      `  DO 0.001S-V : ${fmt(obj.DO_0001S_V)}`,
      `  Dầu hỏa     : ${fmt(obj.KO)}`,
    ];
  }
  const lines = [
    ...linesFor("Vùng 1", region1),
    ...linesFor("Vùng 2", region2),
    cycle,
    "Nguồn: Petrolimex",
  ].filter(Boolean);
  return lines.join("\n");
}

// ===== Fallback PVOIL =====
function renderFromPVOIL(html) {
  const text = flattenHTML(html);
  function find(label) {
    const idx = text.indexOf(label);
    if (idx < 0) return null;
    const near = text.slice(idx, idx + 200);
    const m = near.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,7})\s*(?:đ|đồng)/i);
    return toNumVND(m && m[1]);
  }
  const cycle =
    text.match(/15:00[^\n]{0,100}?(?:ngày|Ngày)\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/i)?.[0] ||
    "Kỳ điều hành gần nhất";
  const p = {
    r95: find("Xăng RON 95-III"),
    e10: find("Xăng E10 RON 95-III"),
    r92: find("Xăng E5 RON 92-II"),
    do05: find("Dầu DO 0,05S-II"),
    ko: find("Dầu KO"),
  };
  const lines = [
    `RON95-III : ${fmt(p.r95)}`,
    `E5 RON92  : ${fmt(p.r92)}`,
    `E10 RON95 : ${fmt(p.e10)}`,
    `DO 0.05S  : ${fmt(p.do05)}`,
    `Dầu hỏa   : ${fmt(p.ko)}`,
    cycle,
    "Nguồn: PVOIL (fallback)",
  ];
  return lines.join("\n");
}

// ===== Main =====
function fetchFirstWorking(urls, cb) {
  let i = 0;
  const tryNext = () => {
    if (i >= urls.length) return cb(new Error("no source"));
    const u = urls[i++];
    $httpClient.get({ url: u, headers: { "User-Agent": "Surge", "Accept-Language": "vi-VN" } },
      (err, resp, body) => {
        if (!err && resp && resp.status === 200 && body) cb(null, { url: u, body });
        else tryNext();
      });
  };
  tryNext();
}
fetchFirstWorking(PETROLIMEX_SOURCES, (err, res) => {
  if (!err && res) {
    const rendered = renderFromPetrolimex(res.body);
    if (rendered) return okPanel("Giá xăng dầu VN (PLX)", rendered);
  }
  $httpClient.get({ url: PVOIL_FALLBACK }, (e2, r2, b2) => {
    if (!e2 && r2 && r2.status === 200 && b2) {
      const rendered = renderFromPVOIL(b2);
      return okPanel("Giá xăng dầu VN", rendered);
    }
    return doneError("Không lấy được dữ liệu Petrolimex/PVOIL");
  });
});