/**
 * Script Giá Xăng VnExpress cho Surge 5 - Fix hiển thị 4 dòng
 */

const url = "https://vnexpress.net/chu-de/gia-xang-dau-3026";

$httpClient.get(url, function(error, response, data) {
    if (error || !data) {
        $done({ title: "Giá Xăng", content: "Lỗi kết nối mạng", icon: "fuelpump.fill" });
        return;
    }

    // Lấy ngày cập nhật
    const dateMatch = data.match(/Giá từ\s*([\d\/]+)/);
    const updateDate = dateMatch ? dateMatch[1] : "12/3/2026";

    const rowRegex = /<tr>\s*<td>(.*?)<\/td>\s*<td>([\d.,]+)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/g;
    let match;
    let items = [];

    while ((match = rowRegex.exec(data)) !== null) {
        let name = match[1].replace(/<.*?>/g, "").trim();
        let price = match[2].trim();
        let change = match[3].replace(/<.*?>/g, "").trim();

        if (name === "Mặt hàng" || !name) continue;

        // Rút gọn tối đa để vừa chiều ngang panel
        name = name.replace("Xăng RON ", "RON ")
                   .replace("Xăng E5 RON ", "E5 ")
                   .replace("Dầu diesel", "Diesel")
                   .replace("Dầu hỏa", "D.Hỏa");

        let trend = change.includes("+") ? "🔺" : (change.includes("-") ? "🔻" : "🔹");
        
        // Tạo dòng text cho mỗi mặt hàng
        items.push(`${trend} ${name}: ${price} (${change})`);
    }

    // Chỉ lấy 4 dòng đầu tiên: RON 95, E5, Diesel, Dầu hỏa
    const finalContent = items.slice(0, 4).join("\n");

    $done({
        title: `Giá Xăng ${updateDate} (đồng/lít)`,
        content: finalContent,
        icon: "fuelpump.fill",
        "icon-color": "#f5a623"
    });
});
