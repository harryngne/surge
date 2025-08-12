#!/bin/bash
set -euo pipefail

CONFIG=/etc/danted.conf
INFOFILE=/root/socks5_info.txt
SERVICE=danted

detect_iface_ip() {
  IFACE=$(ip -o -4 route show to default | awk '{print $5}' | head -n1 || true)
  [[ -z "${IFACE:-}" ]] && IFACE=$(ip -o link show | awk -F': ' '$2!="lo"{print $2; exit}')
  IP_LOCAL=$(ip -o -4 addr show dev "$IFACE" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -n1)
  IP6_LOCAL=$(ip -6 addr show dev "$IFACE" scope global 2>/dev/null | awk '/inet6/{print $2}' | cut -d/ -f1 | head -n1)
  IP_PUBLIC=$(curl -s --max-time 3 https://api.ipify.org || echo "unknown")
  IP6_PUBLIC=$(curl -s --max-time 3 https://api64.ipify.org || echo "unknown")
}

ensure_log_rw() {
  mount | grep " on / " | grep -q "(rw," || mount -o remount,rw / || true
  mkdir -p /var/log
  touch /var/log/danted.log || true
  chown nobody:nogroup /var/log/danted.log 2>/dev/null || chown nobody:nobody /var/log/danted.log 2>/dev/null || true
  chmod 644 /var/log/danted.log 2>/dev/null || true
}

install_socks5() {
  echo "🚀 Cài đặt SOCKS5 (DualStack IPv4 + IPv6)..."
  detect_iface_ip

  read -p "Nhập port (mặc định 8282): " PORT; PORT=${PORT:-8282}
  if ! [[ "$PORT" =~ ^[0-9]{2,5}$ ]] || ss -tuln | grep -q ":$PORT\b"; then
    echo "❌ Port không hợp lệ hoặc đã sử dụng."; exit 1
  fi

  read -p "Nhập username (mặc định vn): " USERNAME; USERNAME=${USERNAME:-vn}
  read -s -p "Nhập password (mặc định 88888888): " PASSWORD; echo ""; PASSWORD=${PASSWORD:-88888888}

  echo "Chọn protocol: 1) TCP  2) UDP  3) Cả hai (mặc định)"
  read -p "Chọn (1/2/3): " CH; case ${CH:-3} in
    1) PROTO="tcp" ;;
    2) PROTO="udp" ;;
    3|"") PROTO="tcp udp" ;;
    *) echo "❌ Lựa chọn không hợp lệ."; exit 1 ;;
  esac

  apt update -y && apt install -y dante-server curl

  if ! id "$USERNAME" &>/dev/null; then
    useradd -M -s /usr/sbin/nologin "$USERNAME"
  fi
  echo "$USERNAME:$PASSWORD" | chpasswd

  cat > "$CONFIG" <<EOF
logoutput: /var/log/danted.log

internal: 0.0.0.0 port = $PORT
internal: :: port = $PORT
external: $IFACE

socksmethod: username
clientmethod: none
user.notprivileged: nobody

client pass {
  from: 0.0.0.0/0 to: 0.0.0.0/0
  log: connect disconnect
}
client pass {
  from: ::/0 to: ::/0
  log: connect disconnect
}

pass {
  from: 0.0.0.0/0 to: 0.0.0.0/0
  protocol: $PROTO
  log: connect disconnect
  socksmethod: username
}
pass {
  from: ::/0 to: ::/0
  protocol: $PROTO
  log: connect disconnect
  socksmethod: username
}
EOF

  ensure_log_rw
  systemctl enable "$SERVICE"
  systemctl restart "$SERVICE" || true
  sleep 1

  echo -e "Port: $PORT\nUser: $USERNAME\nPass: $PASSWORD\nProto: $PROTO\nIPv4: $IP_LOCAL / $IP_PUBLIC\nIPv6: $IP6_LOCAL / $IP6_PUBLIC" > "$INFOFILE"

  if systemctl is-active --quiet "$SERVICE"; then
    echo "✅ SOCKS5 đã được cài đặt và đang chạy."
  else
    echo "⚠️ Dante chưa chạy. Xem log:"
    journalctl -u "$SERVICE" -n 100 --no-pager || true
    exit 1
  fi
}

show_info() {
  detect_iface_ip
  echo "=== Thông tin SOCKS5 ==="
  [[ -f "$CONFIG" ]] && grep -E 'internal:|protocol:' "$CONFIG" || echo "Chưa có cấu hình."
  [[ -f "$INFOFILE" ]] && cat "$INFOFILE" || echo "Chưa có $INFOFILE"
}

reset_pass() {
  read -p "Xác nhận username (mặc định vn): " UN; UN=${UN:-vn}
  if id "$UN" &>/dev/null; then
    read -s -p "Nhập mật khẩu mới: " NP; echo ""
    echo "$UN:$NP" | chpasswd
    sed -i "/^Pass:/d" "$INFOFILE" 2>/dev/null || true
    echo "Pass: $NP" >> "$INFOFILE"
    echo "✅ Đã đổi mật khẩu."
  else
    echo "❌ User không tồn tại."
  fi
}

change_port() {
  if [[ ! -f "$CONFIG" ]]; then echo "❌ Chưa cài đặt."; return; fi
  read -p "Nhập port mới: " NP
  if ! [[ "$NP" =~ ^[0-9]{2,5}$ ]] || ss -tuln | grep -q ":$NP\b"; then
    echo "❌ Port không hợp lệ hoặc đã dùng."; return
  fi
  sed -i -E "s/internal: 0.0.0.0 port = [0-9]+/internal: 0.0.0.0 port = $NP/" "$CONFIG"
  sed -i -E "s/internal: :: port = [0-9]+/internal: :: port = $NP/" "$CONFIG"
  systemctl restart "$SERVICE" || true
  sed -i "/^Port:/d" "$INFOFILE" 2>/dev/null || true
  echo "Port: $NP" >> "$INFOFILE"
  echo "✅ Đã đổi port sang $NP"
}

status_socks5() {
  echo "=== Trạng thái dịch vụ ==="
  if systemctl is-active --quiet "$SERVICE"; then
    echo "Service: running"
  else
    echo "Service: NOT running"
  fi

  PORT=$(grep -oP 'internal: 0\.0\.0\.0 port = \K[0-9]+' "$CONFIG" 2>/dev/null || echo "unknown")
  [[ "$PORT" != "unknown" ]] && ss -tuln | grep -E ":$PORT\b" || echo "Chưa lắng nghe trên port xác định."

  echo "--- systemctl status ---"
  systemctl --no-pager --full -l status "$SERVICE" || true

  echo "--- Journal (last 50 lines) ---"
  journalctl -u "$SERVICE" -n 50 --no-pager || true

  # test TCP connect nếu có nc
  if command -v nc &>/dev/null && [[ "$PORT" != "unknown" ]]; then
    echo "--- TCP connect test (localhost:$PORT) ---"
    (nc -vz -w2 127.0.0.1 "$PORT" && echo "OK") || echo "Fail (có thể do firewall/khác)."
  fi
}

change_user() {
  if [[ ! -f "$CONFIG" ]]; then
    echo "❌ Chưa cài đặt SOCKS5."
    return
  fi

  OLD_USER=$(grep -oP '^User:\s*\K\S+' "$INFOFILE" 2>/dev/null || echo vn)

  read -p "Nhập username mới: " NEW_USER
  if [[ -z "$NEW_USER" ]]; then
    echo "❌ Username mới không được để trống."
    return
  fi

  # Nếu user mới chưa tồn tại, tạo mới
  if ! id "$NEW_USER" &>/dev/null; then
    useradd -M -s /usr/sbin/nologin "$NEW_USER"
    echo "✅ Đã tạo user $NEW_USER."
  else
    echo "⚠️ User $NEW_USER đã tồn tại, sẽ dùng lại."
  fi

  # Lấy password cũ từ file info
  OLD_PASS=$(grep -oP '^Pass:\s*\K.*' "$INFOFILE" 2>/dev/null || echo "88888888")

  # Gán lại mật khẩu cũ cho user mới
  echo "$NEW_USER:$OLD_PASS" | chpasswd

  # Xóa user cũ nếu tồn tại
  if id "$OLD_USER" &>/dev/null; then
    deluser --remove-home "$OLD_USER" || true
    echo "✅ Đã xóa user cũ: $OLD_USER"
  fi

  # Cập nhật file config (không cần sửa socksmethod vì Dante check user qua PAM)
  sed -i "/^User:/d" "$INFOFILE" 2>/dev/null || true
  echo "User: $NEW_USER" >> "$INFOFILE"

  echo "✅ Đã đổi username sang: $NEW_USER"
}


remove_socks5() {
  echo "⚠️ Thao tác này sẽ gỡ Dante, xóa user và file cấu hình."
  read -p "Gõ 'yes' để xác nhận: " Y
  if [[ "$Y" == "yes" ]]; then
    systemctl stop "$SERVICE" || true
    systemctl disable "$SERVICE" || true
    apt purge -y dante-server || apt remove -y dante-server || true
    UN="$(grep -oP '^User:\s*\K\S+' "$INFOFILE" 2>/dev/null || echo vn)"
    id "$UN" &>/dev/null && deluser --remove-home "$UN" || true
    rm -f "$CONFIG" "$INFOFILE" /var/log/danted.log
    echo "✅ Đã gỡ SOCKS5 hoàn toàn."
  else
    echo "❌ Hủy bỏ."
  fi
}

while true; do
  echo -e "\n=== SOCKS5 管理器 (DualStack) ==="
  echo "1) Cài đặt mới"
  echo "2) Xem thông tin"
  echo "3) Đổi mật khẩu"
  echo "4) Đổi username"
  echo "5) Đổi port"
  echo "6) Kiểm tra trạng thái"
  echo "7) Gỡ cài đặt (uninstall)"
  echo "8) Thoát"
  read -p "Chọn (1–8): " CH
  case $CH in
    1) install_socks5 ;;
    2) show_info ;;
    3) reset_pass ;;
    4) change_user ;;
    5) change_port ;;
    6) status_socks5 ;;
    7) remove_socks5 ;;
    8) exit 0 ;;
    *) echo "❌ Lựa chọn không hợp lệ." ;;
  esac
done
