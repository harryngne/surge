/**
 * Script Giá Xăng VnExpress - Tối ưu Regex & Căn hàng tự động
 */

const url = "https://vnexpress.net/chu-de/gia-xang-dau-3026";

$httpClient.get(url, function(error, response, data) {
    if (error || !data) {
        $done({ title: "Giá Xăng", content: "Lỗi kết nối", icon: "fuelpump.fill" });
        return;
    }

    const dateMatch = data.match(/Giá từ\s*([\d\/]+)/);
    const updateDate = dateMatch ? dateMatch[1] : "12/03/2026";

    // Regex lấy sạch ô <td> không bị kẹt bởi tag lồng
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

        // Rút gọn tên cực ngắn để dành chỗ cho việc căn lề
        name = name.replace("Xăng RON ", "95-").replace("Xăng E5 RON ", "E5-").replace("Dầu diesel", "Diesel").replace("Dầu hỏa", "D.Hỏa");
        
        let price = cells[i+1];
        let change = cells[i+2];
        let trend = change.includes("+") ? "🔺" : (change.includes("-") ? "🔻" : "🔹");
        
        rows.push({ trend, name, price, change });
    }

    // Tự động căn lề: Tìm độ dài lớn nhất của từng cột
    const maxNameLen = Math.max(...rows.map(r => r.name.length));
    const maxPriceLen = Math.max(...rows.map(r => r.price.length));

    let content = rows.slice(0, 4).map(r => {
        // Căn tên mặt hàng sang trái
        let n = r.name.padEnd(maxNameLen, ' ');
        // Căn giá tiền sang phải (để các dấu chấm phân cách hàng nghìn thẳng nhau)
        let p = r.price.padStart(maxPriceLen, ' ');
        
        return ${r.trend} ${n}: ${p} (${r.change});
    }).join("\n");

    $done({
        title: Giá Xăng ${updateDate} (đồng/lít),
        content: content,
        icon: "fuelpump.fill",
        "icon-color": "#f5a623"
    });
});