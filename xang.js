/**
 * Script Giá Xăng VnExpress cho Surge 5
 * Tối ưu: Hiển thị tối giản, lọc sạch dữ liệu.
 */

const url = "https://vnexpress.net/chu-de/gia-xang-dau-3026";

$httpClient.get(url, function(error, response, data) {
    if (error || !data) {
        $done({
            title: "Giá Xăng Dầu",
            content: "Lỗi kết nối dữ liệu",
            icon: "fuelpump.fill",
            "icon-color": "#FF0000"
        });
        return;
    }

    // Lấy ngày cập nhật
    const dateMatch = data.match(/Giá từ\s*([\d\/]+)/);
    const updateDate = dateMatch ? dateMatch[1] : "Hôm nay";

    // Regex bóc tách 3 cột: Tên | Giá | Biến động
    const rowRegex = /<tr>\s*<td>(.*?)<\/td>\s*<td>([\d.,]+)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/g;
    let match;
    let items = [];

    while ((match = rowRegex.exec(data)) !== null) {
        let name = match[1].replace(/<.*?>/g, "").trim();
        let price = match[2].trim();
        let change = match[3].replace(/<.*?>/g, "").trim();

        // Chỉ lấy các mặt hàng xăng dầu chính, bỏ qua tiêu đề và hàng trống
        if (name === "Mặt hàng" || !name || name.length > 20) continue;

        // Rút gọn tên mặt hàng cho đẹp Panel (Ví dụ: Xăng RON 95-III -> RON 95-III)
        name = name.replace("Xăng ", "").replace("Dầu ", "D. ");

        // Icon trạng thái
        let trend = change.includes("+") ? "🔺" : (change.includes("-") ? "🔻" : "🔹");
        
        items.push(`${trend} ${name}: ${price}đ (${change})`);
    }

    $done({
        title: `Giá Xăng ${updateDate}`,
        content: items.join("\n"),
        icon: "fuelpump.fill",
        "icon-color": "#f5a623"
    });
});
