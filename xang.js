/**
 * Giá xăng dầu Việt Nam - VnExpress (VNE)
 * Tương thích: Surge / Loon
 * Phong cách: Class - Hiển thị 4 dòng, có biến động, tự căn lề.
 */

class GasPriceVNQuery {
  constructor() {
    this.title = 'Giá Xăng Dầu VN';
    this.icon = 'fuelpump.fill';
    this.color = '#FF9500';
    this.url = 'https://vnexpress.net/chu-de/gia-xang-dau-3026?t=' + Math.random();
  }

  // Tự động căn lề để các cột thẳng hàng
  pad(str, len) {
    str = String(str);
    return str + ' '.repeat(Math.max(0, len - str.length));
  }

  run() {
    $httpClient.get({ url: this.url, timeout: 15000 }, (err, resp, data) => {
      if (err || !data) {
        return $done({ title: this.title, content: "Lỗi kết nối VnExpress", icon: this.icon });
      }

      try {
        // 1. Lấy ngày cập nhật
        const dateMatch = data.match(/Giá từ\s*([\d\/]+)/);
        const updateDate = dateMatch ? dateMatch[1] : "Mới nhất";

        // 2. Bóc tách dữ liệu sạch từ <td>
        const cleanHTML = data.replace(/<(span|strong|a|em).*?>|<\/(span|strong|a|em)>/g, "");
        const tdRegex = /<td.*?>([\s\S]*?)<\/td>/g;
        let cells = [], m;
        while ((m = tdRegex.exec(cleanHTML)) !== null) {
          cells.push(m[1].trim());
        }

        let results = [];
        for (let i = 0; i < cells.length; i += 3) {
          let name = cells[i];
          if (!name || name.includes("Mặt hàng")) continue;

          // Rút gọn tên cực ngắn để vừa chiều ngang Panel
          let sName = name.replace("Xăng RON ", "").replace("Xăng E5 RON ", "E5-").replace("Dầu diesel", "Diesel").replace("Dầu hỏa", "D.Hỏa");
          let price = cells[i+1];
          let change = cells[i+2];
          let trend = change.includes("+") ? "🔺" : (change.includes("-") ? "🔻" : "🔹");

          results.push({ trend, sName, price, change });
        }

        // 3. Căn lề và tạo nội dung (Lấy 4 dòng chính)
        const maxN = Math.max(...results.map(r => r.sName.length));
        const content = results.slice(0, 4).map(r => {
          return `${r.trend} ${this.pad(r.sName, maxN)}: ${r.price} (${r.change})`;
        }).join("\n");

        $done({
          title: `${this.title} ${updateDate} (đ/lít)`,
          content: content,
          icon: this.icon,
          'icon-color': this.color
        });

      } catch (e) {
        $done({ title: this.title, content: "Lỗi xử lý dữ liệu: " + e.message });
      }
    });
  }
}

// Chạy script
new GasPriceVNQuery().run();
