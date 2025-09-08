// vn_fuel_price_petrolimex.js
// Surge Panel: Giá xăng dầu VN từ Petrolimex (đọc trực tiếp div .header__pricePetrol)
// Chia Vùng 1/Vùng 2, đơn vị đồng/lít, có E10 RON95-III. Fallback: news pages / PVOIL.

const PLX_HOME = "https://www.petrolimex.com.vn/";
const PLX_NEWS = [
  "https://www.petrolimex.com.vn/ndi/tin-gia-xang-dau.html",
  "https://www.petrolimex.com.vn/ndi/Thong-tin-dieu-hanh-gia-xang-dau.html",
];
const PVOIL_FALLBACK = "https://www.pvoil.com.vn/tin-gia-xang-dau";

function H() {
  return {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Accept-Language": "vi-VN,vi;q=0.9",
  };
}

function httpGet(url, cb) { $httpClient.get({ url, headers: H() }, cb); }
function fmt(v) { return v == null ? "—" : v.toLocaleString("vi-VN") + " đ/lít"; }
function toNum(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,7})/);
  return m ? parseInt(m[1].replace(/[.,]/g, ""), 10) : null;
}
function flat(html) { return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function cycleFrom(t) {
  const m =
    t.match(/15:00[^\n]{0,100}?(?:ngày|Ngày)\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/i) ||
    t.match(/cập nhật lúc\s*15[:. ]00[^\n]{0,80}\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/i);
  return m ? m[0].replace(/\s+/g, " ").trim() : "Kỳ điều hành gần nhất";
}
function ok(title, content) { $done({ title, content, icon: "fuelpump.fill", "icon-color": "#FF9500" }); }
function fail(msg) { $done({ title: "Giá xăng dầu VN", content: msg, icon: "fuelpump.fill", "icon-color": "#FF3B30" }); }

// ---- Parse khối header__pricePetrol ----
function parseHeaderPriceDiv(html) {
  const m = html.match(/<div[^>]+class=["'][^"']*header__pricePetrol[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!m) return null;
  const inner = m[1];

  // Lấy từng "hàng": tên sản phẩm + 2 cột số
  // Convert sang text phẳng để regex dễ bắt 2 giá sau nhãn
  const t = flat(inner);

  // Map nhãn → các mẫu tìm kiếm (để chịu được thay đổi nhỏ)
  const LABELS = [
    { key: "RON95_III", names: ["Xăng RON 95-III", "RON 95-III", "RON95-III"] },
    { key: "E10_RON95_III", names: ["Xăng E10 RON 95-III", "E10 RON 95-III", "E10 RON95"] },
    { key: "E5_RON92_II", names: ["Xăng E5 RON 92-II", "E5 RON 92-II", "E5 RON92"] },
    { key: "DO_0001S_V", names: ["DO 0,001S-V", "DO 0.001S-V", "0,001S-V"] },
    { key: "DO_005S_II", names: ["DO 0,05S-II", "DO 0.05S-II", "0,05S-II"] },
    { key: "KO", names: ["Dầu hỏa", "Dầu hoả", "Dầu hỏa 2-K", "Dầu hỏa 2K", "Dầu KO"] },
    // (Tuỳ ý thêm RON95-V nếu muốn)
  ];

  function twoAfter(label) {
    const i = t.indexOf(label);
    if (i < 0) return [null, null];
    const seg = t.slice(i, i + 80); // ngay sau nhãn có 2 con số
    const ms = [...seg.matchAll(/(\d{1,2}[.,]\d{3}|\d{4,6})/g)].map(x => x[1]);
    // Lấy 2 số đầu tiên
    return [toNum(ms[0]), toNum(ms[1])];
  }

  const out = {};
  LABELS.forEach(L => {
    for (const name of L.names) {
      const [v1, v2] = twoAfter(name);
      if (v1 || v2) { out[L.key] = { v1, v2 }; return; }
    }
    out[L.key] = { v1: null, v2: null };
  });

  // Chu kỳ cập nhật (nằm ngay dưới bảng)
  const cy = cycleFrom(t);

  function blockLine(label, pair) {
    return `  ${label.padEnd(12)}: V1 ${fmt(pair.v1)}  |  V2 ${fmt(pair.v2)}`;
  }

  const lines = [
    blockLine("RON95-III", out.RON95_III),
    blockLine("E10 RON95", out.E10_RON95_III),
    blockLine("E5 RON92", out.E5_RON92_II),
    blockLine("DO 0.001S", out.DO_0001S_V),
    blockLine("DO 0.05S", out.DO_005S_II),
    blockLine("Dầu hỏa", out.KO),
    cy,
    "Nguồn: Petrolimex (header__pricePetrol)",
  ];

  return lines.join("\n");
}

// ---- Fallback: news pages (trường hợp header không có) ----
function tryNewsPages(i, done) {
  if (i >= PLX_NEWS.length) return done(null);
  httpGet(PLX_NEWS[i], (e, r, b) => {
    if (!e && r?.status === 200 && b) {
      const txt = flat(b);
      if (/(Vùng\s*1).*(Vùng\s*2)/i.test(txt)) {
        // Tận dụng parser cũ: tìm theo nhãn và 2 số ngay sau
        const res = parseHeaderPriceDiv(b); // trick: dùng lại parser header vì cũng là bảng 2 cột
        if (res) return done(res);
      }
    }
    tryNewsPages(i + 1, done);
  });
}

// ---- Fallback cuối: PVOIL ----
function fallbackPVOIL() {
  httpGet(PVOIL_FALLBACK, (e, r, b) => {
    if (!e && r?.status === 200 && b) {
      const t = flat(b);
      function find(label) {
        const i = t.indexOf(label);
        if (i < 0) return null;
        const near = t.slice(i, i + 200);
        const m = near.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,7})\s*(?:đ|đồng)/i);
        return toNum(m && m[1]);
      }
      const lines = [
        `  RON95-III  : V1 ${fmt(find("Xăng RON 95-III"))}`,
        `  E10 RON95  : V1 ${fmt(find("Xăng E10 RON 95-III"))}`,
        `  E5 RON92   : V1 ${fmt(find("Xăng E5 RON 92-II"))}`,
        `  DO 0.001S  : V1 ${fmt(find("Dầu DO 0,001S-V"))}`,
        `  DO 0.05S   : V1 ${fmt(find("Dầu DO 0,05S-II"))}`,
        `  Dầu hỏa    : V1 ${fmt(find("Dầu KO"))}`,
        cycleFrom(t),
        "Nguồn: PVOIL (fallback)",
      ];
      return ok("Giá xăng dầu VN", lines.join("\n"));
    }
    fail("Không lấy được dữ liệu Petrolimex/PVOIL");
  });
}

// ---- Main flow ----
httpGet(PLX_HOME, (e, r, b) => {
  if (!e && r?.status === 200 && b) {
    const panel = parseHeaderPriceDiv(b);
    if (panel) return ok("Giá xăng dầu VN (PLX)", panel);
  }
  // Thử các news pages
  tryNewsPages(0, (panel) => {
    if (panel) return ok("Giá xăng dầu VN (PLX)", panel);
    // Fallback cuối
    fallbackPVOIL();
  });
});