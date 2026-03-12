/**
 * Script Giá Xăng VnExpress cho Surge 5
 * Tối ưu: Regex từng ô, Tự động căn lề thẳng hàng.
 */

const url = "https://vnexpress.net/chu-de/gia-xang-dau-3026";

$httpClient.get(url, function(error, response, data) {
    if (error || !data) {
        $done({ title: "Giá Xăng", content: "Lỗi kết nối", icon: "fuelpump.fill" });
        return;
    }

    // 1. Lấy ngày cập nhật
    const dateMatch = data.match(/Giá từ\s*([\d\/]+)/);
    const updateDate = dateMatch ? dateMatch[1] : "Hôm nay";

    // 2. Regex bóc tách toàn bộ các ô <td> sạch sẽ
    // Loại bỏ tag HTML bên trong ô (như <span>) để lấy nội dung thuần
    const cleanData = data.replace(/<span.*?>|<\/span>/g, "");
    const tdRegex = /<td.*?>([\s\S]*?)<\/td>/g;
    let cells = [];
    let m;
    while ((m = tdRegex.exec(cleanData)) !== null) {
        cells.push(m[1].trim());
    }

    // 3. Xử lý dữ liệu theo nhóm 3 cột (Mặt hàng | Giá | Biến động)
    let rows = [];
    for (let i = 0; i < cells.length; i += 3) {
        let name = cells[i];
        let price = cells[i+1];
        let change = cells[i+2];

        if (!name || name.includes("Mặt hàng")) continue;

        // Rút gọn tên để tiết kiệm diện tích
        name = name.replace("Xăng RON ", "").replace("Xăng E5 RON ", "E5-").replace("Dầu diesel", "Diesel").replace("Dầu hỏa", "D.Hỏa");
        
        let trend = change.includes("+") ? "🔺" : (change.includes("-") ? "🔻" : "🔹");
        
        // Lưu vào mảng để xử lý căn lề
        rows.push({ trend, name, price, change });
    }

    // 4. Tự động căn lề (Padding) để các cột thẳng hàng
    // Tìm độ dài tên mặt hàng dài nhất để căn chỉnh
    const maxNameLen = Math.max(...rows.map(r => r.name.length));
    
    let content = rows.slice(0, 4).map(r => {
        // Thêm khoảng trắng vào sau tên mặt hàng để bằng nhau
        let paddedName = r.name.padEnd(maxNameLen + 1, ' ');
        return ${r.trend} ${paddedName}: ${r.price} (${r.change});
    }).join("\n");

    $done({
        title: Giá Xăng ${updateDate} (đồng/lít),
        content: content,
        icon: "fuelpump.fill",
        "icon-color": "#f5a623"
    });
});