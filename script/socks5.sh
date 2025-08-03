#!/bin/bash
set -e

CONFIG=/etc/danted.conf
INFOFILE=/root/socks5_info.txt
SERVICE=danted

function detect_iface_ip() {
  IFACE=$(ip -o -4 route show to default | awk '{print $5}')
  IP_LOCAL=$(ip -o -4 addr show dev "$IFACE" | awk '{print $4}' | cut -d/ -f1)
  IP6_LOCAL=$(ip -6 addr show dev "$IFACE" scope global | grep inet6 | awk '{print $2}' | cut -d/ -f1 | head -n1)
  IP_PUBLIC=$(curl -s https://api.ipify.org)
  IP6_PUBLIC=$(curl -s https://api64.ipify.org)
}

function install_socks5() {
  echo "🚀 Cài đặt SOCKS5 (DualStack IPv4 + IPv6)..."
  detect_iface_ip

  read -p "Nhập port (mặc định 8282): " PORT; PORT=${PORT:-8282}
  if ! [[ "$PORT" =~ ^[0-9]{2,5}$ ]] || ss -tuln | grep -q ":$PORT"; then
    echo "❌ Port không hợp lệ hoặc đã sử dụng."; exit 1
  fi

  read -p "Nhập username (mặc định vn): " USERNAME; USERNAME=${USERNAME:-vn}
  read -s -p "Nhập password (mặc định 88888888): " PASSWORD; echo ""; PASSWORD=${PASSWORD:-88888888}

  echo "Chọn protocol: 1) TCP 2) UDP 3) Cả hai (mặc định)"
  read -p "Chọn (1/2/3): " CH; case $CH in
    1) PROTO="tcp" ;; 2) PROTO="udp" ;; 3|"") PROTO="tcp udp" ;; *)
      echo "❌ Lựa chọn không hợp lệ."; exit 1 ;;
  esac

  apt update && apt install -y dante-server

  cat > "$CONFIG" <<EOF
logoutput: /var/log/danted.log
internal: 0.0.0.0 port = $PORT
internal: :: port = $PORT
external: $IFACE

method: username
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
  method: username
}

pass {
  from: ::/0 to: ::/0
  protocol: $PROTO
  log: connect disconnect
  method: username
}
EOF

  id "$USERNAME" &>/dev/null || useradd -M -s /usr/sbin/nologin "$USERNAME"
  echo "$USERNAME:$PASSWORD" | chpasswd

  systemctl enable "$SERVICE"
  systemctl restart "$SERVICE"

  # Firewall (UFW)
  if command -v ufw &>/dev/null && ufw status | grep -q active; then
    ufw allow $PORT/tcp || true
    ufw allow $PORT/udp || true
  fi

  echo -e "Port: $PORT\nUser: $USERNAME\nPass: $PASSWORD\nProto: $PROTO\nIPv4: $IP_LOCAL / $IP_PUBLIC\nIPv6: $IP6_LOCAL / $IP6_PUBLIC" > "$INFOFILE"
  echo "✅ SOCKS5 đã được cài đặt với hỗ trợ IPv4 và IPv6."
}

function show_info() {
  detect_iface_ip
  echo "=== Thông tin SOCKS5 ==="
  grep -E 'port|protocol' "$CONFIG"
  echo "User: $(awk -F: '/vn/ {print $1}' /etc/passwd)"
  echo "Mật khẩu lưu tại: $INFOFILE"
  echo "IP local: $IP_LOCAL | $IP6_LOCAL"
  echo "IP public: $IP_PUBLIC | $IP6_PUBLIC"
}

function reset_pass() {
  read -p "Xác nhận username (mặc định vn): " UN; UN=${UN:-vn}
  if id "$UN" &>/dev/null; then
    read -s -p "Nhập mật khẩu mới: " NP; echo ""
    echo "$UN:$NP" | chpasswd
    sed -i "/User:/d" "$INFOFILE"
    echo "User: $UN" >> "$INFOFILE"
    echo "Pass: $NP" >> "$INFOFILE"
    echo "✅ Đã đổi mật khẩu."
  else echo "❌ User không tồn tại."; fi
}

function change_port() {
  read -p "Nhập port mới: " NP
  if ! [[ "$NP" =~ ^[0-9]{2,5}$ ]] || ss -tuln | grep -q ":$NP"; then
    echo "❌ Port không hợp lệ hoặc đã dùng."; return
  fi
  sed -i -E "s/internal: 0.0.0.0 port = [0-9]{2,5}/internal: 0.0.0.0 port = $NP/" "$CONFIG"
  sed -i -E "s/internal: :: port = [0-9]{2,5}/internal: :: port = $NP/" "$CONFIG"
  systemctl restart "$SERVICE"
  sed -i "/Port:/d" "$INFOFILE"
  echo "Port: $NP" >> "$INFOFILE"
  echo "✅ Đã đổi port sang $NP"
}

function remove_socks5() {
  read -p "Xác nhận XOÁ SOCKS5? (yes để xác nhận): " Y
  if [[ "$Y" == "yes" ]]; then
    systemctl stop "$SERVICE"
    apt remove -y dante-server
    deluser --remove-home vn || true
    rm -f "$CONFIG" "$INFOFILE"
    echo "✅ Đã xoá SOCKS5 hoàn toàn."
  else
    echo "❌ Hủy bỏ."
  fi
}

# CLI menu
while true; do
  echo -e "\n=== SOCKS5 管理器 (DualStack) ==="
  echo "1) Cài đặt mới"
  echo "2) Xem thông tin"
  echo "3) Đổi mật khẩu"
  echo "4) Đổi port"
  echo "5) Xoá SOCKS5"
  echo "6) Thoát"
  read -p "Chọn (1–6): " CH
  case $CH in
    1) install_socks5 ;;
    2) show_info ;;
    3) reset_pass ;;
    4) change_port ;;
    5) remove_socks5 ;;
    6) exit ;;
    *) echo "❌ Lựa chọn không hợp lệ." ;;
  esac
done