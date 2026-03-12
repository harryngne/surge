/**
 * Giá xăng dầu Việt Nam - VnExpress (VNE)
 * Phiên bản: Mũi tên Đỏ/Xanh - Chống cache - Hiện đủ 4 dòng
 */

class GasPriceVNQuery {
  constructor() {
    this.title = 'Giá Xăng Dầu';
    this.icon = 'fuelpump.fill';
    this.color = '#FF9500';
    this.url = 'https://vnexpress.net/chu-de/gia-xang-dau-3026?t=' + Date.now();
  }

  run() {
    $httpClient.get({ url: this.url, timeout: 10000 }, (err, resp, data) => {
      if (err || !data) {
        return $done({ title: this.title, content: "⚠️ Lỗi kết nối", icon: this.icon });
      }

      try {
        const dateMatch = data.match(/Giá từ\s*([\d\/]+)/);
        const updateDate = dateMatch ? dateMatch[1] : "Hôm nay";

        const cleanHTML = data.replace(/<(span|strong|a|em).*?>|<\/(span|strong|a|em)>/g, "");
        const tdRegex = /<td.*?>([\s\S]*?)<\/td>/g;
        let cells = [], m;
        while ((m = tdRegex.exec(cleanHTML)) !== null) {
          cells.push(m[1].trim());
        }

        let rows = [];
        for (let i = 0; i < cells.length; i += 3) {
          let name = cells[i];
          if (!name || name.includes("Mặt hàng")) continue;

          let price = cells[i+1];
          let change = cells[i+2];
          
          // --- Logic Mũi tên Đỏ/Xanh ---
          let status = "";
          if (change.includes("+")) {
            status = "🔴 ⬆️"; // Tăng - Đỏ
          } else if (change.includes("-")) {
            status = "🟢 ⬇️"; // Giảm - Xanh
          } else {
            status = "🟡 ➡️"; // Không đổi - Vàng
          }

          rows.push({ status, name, price, change: change.replace(/[+-]/g, "") });
        }

        // Tạo nội dung với cấu trúc cực gọn để ép Surge hiện đủ 4 dòng
        const content = rows.slice(0, 4).map(r => {
          return `${r.status} ${r.name}: ${r.price} (${r.change})`;
        }).join("\n");

        $done({
          title: `⛽️ ${this.title} ${updateDate} (đ/lít)`,
          content: content,
          icon: this.icon,
          'icon-color': this.color
        });

      } catch (e) {
        $done({ title: this.title, content: "❌ Lỗi xử lý" });
      }
    });
  }
}

new GasPriceVNQuery().run();
