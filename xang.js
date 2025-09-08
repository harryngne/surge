// vn_fuel_price_petrolimex.js — parse trực tiếp header__pricePetrol (bảng <table>)
// Đủ 7 sản phẩm: RON95-V, RON95-III, E10 RON95-III, E5 RON92-II, DO 0,001S-V, DO 0,05S-II, Dầu hỏa 2-K
// Hiển thị Vùng 1 / Vùng 2, đơn vị đồng/lít. Fallback PVOIL nếu thiếu khối.

const PLX_HOME = "https://www.petrolimex.com.vn/";
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
function toNum(s) { if (!s) return null; const m = String(s).match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,7})/); return m ? parseInt(m[1].replace(/[.,]/g, ""), 10) : null; }
function stripTags(s){ return s.replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim(); }
function flat(html){ return html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/\u00A0/g," ").trim(); }

function parsePanelFromHeader(html) {
  // lấy block header__pricePetrol
  const mDiv = html.match(/<div[^>]+class=["'][^"']*header__pricePetrol[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!mDiv) return null;
  const block = mDiv[1];

  // lấy từng hàng trong tbody: <tr><td>label</td><td>v1</td><td>v2</td>
  const tbody = block.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || "";
  const rowRe = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;

  const data = {};
  let row;
  while ((row = rowRe.exec(tbody)) !== null) {
    const name = stripTags(row[1]);
    const v1 = toNum(stripTags(row[2]));
    const v2 = toNum(stripTags(row[3]));
    data[name] = { v1, v2 };
  }

  // nếu không có dòng nào, coi như lỗi
  if (Object.keys(data).length === 0) return null;

  // chu kỳ cập nhật (ở p.f-info)
  const infoTxt = stripTags(block.match(/<p[^>]*class=["']f-info["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || "");
  const cycle = infoTxt || "Kỳ điều hành gần nhất";

  // mapping tên chính thức -> label hiển thị
  function pick(n){ return data[n] || {v1:null, v2:null}; }

  const lines = [
    `RON95-V     : V1 ${fmt(pick("Xăng RON 95-V").v1)} | V2 ${fmt(pick("Xăng RON 95-V").v2)}`,
    `RON95-III   : V1 ${fmt(pick("Xăng RON 95-III").v1)} | V2 ${fmt(pick("Xăng RON 95-III").v2)}`,
    `E10 RON95   : V1 ${fmt(pick("Xăng E10 RON 95-III").v1)} | V2 ${fmt(pick("Xăng E10 RON 95-III").v2)}`,
    `E5 RON92    : V1 ${fmt(pick("Xăng E5 RON 92-II").v1)} | V2 ${fmt(pick("Xăng E5 RON 92-II").v2)}`,
    `DO 0.001S   : V1 ${fmt(pick("DO 0,001S-V").v1)} | V2 ${fmt(pick("DO 0,001S-V").v2)}`,
    `DO 0.05S    : V1 ${fmt(pick("DO 0,05S-II").v1)} | V2 ${fmt(pick("DO 0,05S-II").v2)}`,
    `Dầu hỏa 2-K : V1 ${fmt(pick("Dầu hỏa 2-K").v1)} | V2 ${fmt(pick("Dầu hỏa 2-K").v2)}`,
    cycle,
    "Nguồn: Petrolimex (header__pricePetrol)",
  ];
  return lines.join("\n");
}

function ok(title, content){ $done({title, content, icon:"fuelpump.fill", "icon-color":"#FF9500"}); }
function fail(msg){ $done({title:"Giá xăng dầu VN", content:msg, icon:"fuelpump.fill", "icon-color":"#FF3B30"}); }

// Main
httpGet(PLX_HOME, (e, r, b) => {
  if (!e && r?.status === 200 && b) {
    const panel = parsePanelFromHeader(b);
    if (panel) return ok("Giá xăng dầu VN (PLX)", panel);
  }
  // fallback PVOIL đơn giản nếu PLX không có block
  httpGet(PVOIL_FALLBACK, (e2, r2, b2) => {
    if (!e2 && r2?.status === 200 && b2) {
      const t = flat(stripTags(b2));
      function find(label){ const i=t.indexOf(label); if(i<0) return null; const seg=t.slice(i, i+220); const m=seg.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,7})/); return m?toNum(m[1]):null; }
      const lines = [
        `RON95-III : V1 ${fmt(find("Xăng RON 95-III"))}`,
        `E10 RON95 : V1 ${fmt(find("Xăng E10 RON 95-III"))}`,
        `E5 RON92  : V1 ${fmt(find("Xăng E5 RON 92-II"))}`,
        `DO 0.001S : V1 ${fmt(find("Dầu DO 0,001S-V"))}`,
        `DO 0.05S  : V1 ${fmt(find("Dầu DO 0,05S-II"))}`,
        `Dầu hỏa   : V1 ${fmt(find("Dầu KO"))}`,
        "Nguồn: PVOIL (fallback)",
      ];
      return ok("Giá xăng dầu VN", lines.join("\n"));
    }
    return fail("Không lấy được dữ liệu Petrolimex/PVOIL");
  });
});