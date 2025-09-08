/**
 * Giá xăng dầu Việt Nam - Petrolimex (VN)
 * Tương thích: Surge / Loon
 * Phong cách: class giống script China
 * Nguồn chính: https://www.petrolimex.com.vn/ (div.header__pricePetrol)
 * Fallback: https://www.pvoil.com.vn/tin-gia-xang-dau
 */

class GasPriceVNQuery {
  constructor() {
    this.title = 'Giá xăng dầu VN (PLX)';
    this.icon = 'fuelpump.fill';
    this.color = '#FF9500';
    this.headers = {
      'referer': 'https://www.petrolimex.com.vn/',
      'user-agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'accept-language': 'vi-VN,vi;q=0.9',
    };
    this.urlPLX = 'https://www.petrolimex.com.vn/';
    this.urlPVOIL = 'https://www.pvoil.com.vn/tin-gia-xang-dau';
    // tên hiển thị -> key map (giữ nguyên theo bảng PLX)
    this.labels = [
      'Xăng RON 95-V',
      'Xăng RON 95-III',
      'Xăng E10 RON 95-III',
      'Xăng E5 RON 92-II',
      'DO 0,001S-V',
      'DO 0,05S-II',
      'Dầu hỏa 2-K',
    ];
  }

  // -------- Utils --------
  toNum(s) {
    if (!s) return null;
    const m = String(s).match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,7})/);
    return m ? parseInt(m[1].replace(/[.,]/g, ''), 10) : null;
  }
  stripTags(s = '') {
    return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
  }
  fmt(v) {
    return v == null ? '—' : v.toLocaleString('vi-VN') + ' đ/lít';
  }

  // -------- Parse Petrolimex header__pricePetrol --------
  parsePLX(html) {
    const divMatch = html.match(
      /<div[^>]+class=["'][^"']*header__pricePetrol[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    if (!divMatch) return null;

    const block = divMatch[1];
    const tbody = block.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || '';
    const rowRe =
      /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;

    const map = {};
    let m;
    while ((m = rowRe.exec(tbody)) !== null) {
      const name = this.stripTags(m[1]);
      const v1 = this.toNum(this.stripTags(m[2]));
      const v2 = this.toNum(this.stripTags(m[3]));
      map[name] = { v1, v2 };
    }
    if (Object.keys(map).length === 0) return null;

    // thời điểm cập nhật
    const infoTxt = this.stripTags(
      block.match(/<p[^>]*class=["']f-info["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || ''
    );

    return { map, info: infoTxt || 'Kỳ điều hành gần nhất' };
  }

  // -------- Parse PVOIL fallback (đơn giản) --------
  parsePVOIL(html) {
    const text = this.stripTags(html);
    const find = (label) => {
      const i = text.indexOf(label);
      if (i < 0) return null;
      const seg = text.slice(i, i + 220);
      const m = seg.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,7})/);
      return this.toNum(m && m[1]);
    };
    const lines = [
      `RON95-III   : V1 ${this.fmt(find('Xăng RON 95-III'))}`,
      `E10 RON95   : V1 ${this.fmt(find('Xăng E10 RON 95-III'))}`,
      `E5 RON92    : V1 ${this.fmt(find('Xăng E5 RON 92-II'))}`,
      `DO 0.001S-V : V1 ${this.fmt(find('Dầu DO 0,001S-V'))}`,
      `DO 0.05S-II : V1 ${this.fmt(find('Dầu DO 0,05S-II'))}`,
      `Dầu hỏa     : V1 ${this.fmt(find('Dầu KO'))}`,
      'Nguồn: PVOIL (fallback)',
    ];
    return lines.join('\n');
  }

  // -------- Format output --------
  formatPLX(map, info) {
    const pick = (n) => map[n] || { v1: null, v2: null };
    const lines = [
      `RON95-V     : V1 ${this.fmt(pick('Xăng RON 95-V').v1)} | V2 ${this.fmt(
        pick('Xăng RON 95-V').v2
      )}`,
      `RON95-III   : V1 ${this.fmt(pick('Xăng RON 95-III').v1)} | V2 ${this.fmt(
        pick('Xăng RON 95-III').v2
      )}`,
      `E10 RON95   : V1 ${this.fmt(pick('Xăng E10 RON 95-III').v1)} | V2 ${this.fmt(
        pick('Xăng E10 RON 95-III').v2
      )}`,
      `E5 RON92    : V1 ${this.fmt(pick('Xăng E5 RON 92-II').v1)} | V2 ${this.fmt(
        pick('Xăng E5 RON 92-II').v2
      )}`,
      `DO 0.001S-V : V1 ${this.fmt(pick('DO 0,001S-V').v1)} | V2 ${this.fmt(
        pick('DO 0,001S-V').v2
      )}`,
      `DO 0.05S-II : V1 ${this.fmt(pick('DO 0,05S-II').v1)} | V2 ${this.fmt(
        pick('DO 0,05S-II').v2
      )}`,
      `Dầu hỏa 2-K : V1 ${this.fmt(pick('Dầu hỏa 2-K').v1)} | V2 ${this.fmt(
        pick('Dầu hỏa 2-K').v2
      )}`,
      info,
      'Nguồn: Petrolimex (header__pricePetrol)',
    ];
    return lines.join('\n');
  }

  // -------- Request helpers --------
  get(url, cb) {
    $httpClient.get({ url, headers: this.headers, timeout: 15000 }, cb);
  }

  // -------- Run --------
  run() {
    this.get(this.urlPLX, (err, resp, data) => {
      if (err || !resp || resp.status !== 200 || !data) {
        return this.fallback('Không truy cập được Petrolimex');
      }
      try {
        const parsed = this.parsePLX(data);
        if (parsed) {
          return $done({
            title: this.title,
            content: this.formatPLX(parsed.map, parsed.info),
            icon: this.icon,
            'icon-color': this.color,
          });
        }
        // nếu không tìm thấy khối -> fallback
        this.fallback('Không thấy header__pricePetrol');
      } catch (e) {
        this.fallback('Parse Petrolimex lỗi: ' + e.message);
      }
    });
  }

  fallback(reason) {
    // Lấy nhanh từ PVOIL để panel vẫn có dữ liệu
    this.get(this.urlPVOIL, (e2, r2, b2) => {
      if (!e2 && r2 && r2.status === 200 && b2) {
        const content = this.parsePVOIL(b2);
        return $done({
          title: 'Giá xăng dầu VN',
          content,
          icon: this.icon,
          'icon-color': this.color,
        });
      }
      // Thất bại hẳn
      $done({
        title: 'Giá xăng dầu VN',
        content: reason + ' • Đồng thời không lấy được PVOIL',
        icon: 'exclamationmark.triangle.fill',
        'icon-color': '#FF3B30',
      });
    });
  }
}

// Execute
try {
  new GasPriceVNQuery().run();
} catch (e) {
  $done({
    title: 'Giá xăng dầu VN',
    content: 'Lỗi chạy script: ' + e.message,
    icon: 'exclamationmark.triangle.fill',
    'icon-color': '#FF3B30',
  });
}