/*
https://raw.githubusercontent.com/congcong0806/surge-list/master/Script/ipcheck.js

* [Panel]
* ç½‘ç»œä¿¡æ¯ = script-name=ç½‘ç»œä¿¡æ¯, title="ç½‘ç»œä¿¡æ¯", content="è¯·åˆ·æ–°", style=info, update-interval=60
* ...
* [Script]
* ç½‘ç»œä¿¡æ¯ = type=generic,timeout=3,script-path=https://raw.githubusercontent.com/TributePaulWalker/Profiles/main/JavaScript/Surge/ipcheck.js
*/

let url = "http://ip-api.com/json/?lang=vi-VN"

$httpClient.get(url, function(error, response, data) {
    let jsonData = JSON.parse(data)
    let ip = jsonData.query
    let country = jsonData.country
    let emoji = getFlagEmoji(jsonData.countryCode)
    let city = jsonData.city
    let isp = jsonData.isp
    let as = jsonData.as

    body = {
        title: "Thông tin Internet",
        content: `Địa chỉ IP: ${ip}\nISP: ${isp}\nASN: ${as}\nVị trí IP: ${emoji}${country} - ${city}`,
        icon: "link.icloud",
        'icon-color': "#5AC8FA"
    }
    $done(body);
});


function getFlagEmoji(countryCode) {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}