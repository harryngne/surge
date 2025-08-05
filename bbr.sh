#!/bin/bash

echo "🔧 Kích hoạt TCP BBR..."

# Bước 1: Kiểm tra kernel hỗ trợ BBR
KERNEL_VER=$(uname -r | cut -d. -f1-2 | awk -F. '{print ($1*100 + $2)}')

if [ "$KERNEL_VER" -lt 414 ]; then
  echo "❌ Kernel của bạn quá cũ. Cần >= 4.14 để dùng BBR."
  echo "Phiên bản kernel hiện tại: $(uname -r)"
  exit 1
fi

# Bước 2: Thêm cấu hình vào sysctl
cat <<EOF | tee /etc/sysctl.d/99-bbr.conf
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
EOF

# Bước 3: Apply cấu hình
sysctl --system

# Bước 4: Kiểm tra lại
echo ""
echo "✅ Kiểm tra cấu hình:"
sysctl net.ipv4.tcp_congestion_control
sysctl net.core.default_qdisc

echo ""
if lsmod | grep -q bbr; then
  echo "✅ BBR đã được kích hoạt (module đã load)."
else
  echo "⚠️ BBR chưa được load hoặc hệ thống không hỗ trợ."
fi
