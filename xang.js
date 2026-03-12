/**
 * Giá xăng dầu Việt Nam - VnExpress (VNE)
 * Phiên bản: Tối giản - Chỉ 1 icon trạng thái duy nhất ở tiêu đề
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
        const updateDate = dateMatch ? dateMatch[1] : "Mới nhất";

        const cleanHTML = data.replace(/<(span|strong|a|em).*?>|<\/(span|strong|a|em)>/g, "");
        const tdRegex = /<td.*?>([\s\S]*?)<\/td>/g;
        let cells = [], m;
        while ((m = tdRegex.exec(cleanHTML)) !== null) {
          cells.push(m[1].trim());
        }

        let results = [];
        let isIncreasing = false; // Biến để kiểm tra trạng thái chung

        for (let i = 0; i < cells.length; i += 3) {
          let name = cells[i];
          if (!name || name.includes("Mặt hàng")) continue;

          // Rút gọn chữ
          let sName = name.replace("Xăng RON ", "RON").replace("Xăng E5 RON ", "E5-RON").replace("Dầu diesel", "Dầu Diesel");
          let price = cells[i+1];
          let change = cells[i+2];
          
          if (change.includes("+")) isIncreasing = true;

          // Từng dòng chỉ hiện chữ và số, không hiện icon nữa
          results.push(`• ${sName}: ${price} (${change})`);
        }

        // Quyết định icon tiêu đề: Đỏ nếu có mặt hàng tăng, Xanh nếu giảm/đứng giá
        const statusIcon = isIncreasing ? "🔴" : "🟢";

        $done({
          title: `${statusIcon} ${this.title} ${updateDate} (đ/lít)`,
          content: results.slice(0, 4).join("\n"),
          icon: this.icon,
          'icon-color': isIncreasing ? "#FF3B30" : "#34C759"
        });

      } catch (e) {
        $done({ title: this.title, content: "❌ Lỗi xử lý" });
      }
    });
  }
}

new GasPriceVNQuery().run();
