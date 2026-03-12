/**
 * Script Giá Xăng VnExpress cho Surge 5 - Thêm đơn vị tính
 */

const url = "https://vnexpress.net/chu-de/gia-xang-dau-3026";

$httpClient.get(url, function(error, response, data) {
    if (error || !data) {
        $done({ title: "Giá Xăng", content: "Lỗi kết nối", icon: "fuelpump.fill" });
        return;
    }

    // Lấy ngày cập nhật từ VnExpress
    const dateMatch = data.match(/Giá từ\s*([\d\/]+)/);
    const updateDate = dateMatch ? dateMatch[1] : "Hôm nay";

    const rowRegex = /<tr>\s*<td>(.*?)<\/td>\s*<td>([\d.,]+)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/g;
    let match;
    let items = [];

    while ((match = rowRegex.exec(data)) !== null) {
        let name = match[1].replace(/<.*?>/g, "").trim();
        let price = match[2].trim();
        let change = match[3].replace(/<.*?>/g, "").trim();

        if (name === "Mặt hàng" || !name) continue;

        // Tối ưu tên cực gọn
        name = name.replace("Xăng RON ", "")
                   .replace("Xăng E5 RON ", "E5 ")
                   .replace("Dầu diesel", "Diesel")
                   .replace("Dầu hỏa", "D.Hỏa");

        let trend = change.includes("+") ? "🔺" : (change.includes("-") ? "🔻" : "🔹");
        
        items.push(`${trend} ${name}: ${price}đ (${change})`);
    }

    const finalContent = items.slice(0, 4).join("\n");

    $done({
        // Thêm đơn vị vào tiêu đề ở đây
        title: `Giá Xăng ${updateDate} (đơn vị: đồng/lít)`,
        content: finalContent,
        icon: "fuelpump.fill",
        "icon-color": "#f5a623"
    });
});
