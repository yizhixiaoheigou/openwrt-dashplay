#!/bin/sh
# Install the built packages into a clean OpenWrt 25.12.5 x86_64 container (procd, ubus, netifd and
# dnsmasq running; no Wi-Fi, no Bluetooth) and check what can be checked without radios:
# installation and its dependencies, Java, the service, the wait for Wi-Fi, and, with a stand-in Wi-Fi
# reported through a fake `ubus`/`iw` (only for one manual run), the settings page, the dashplay.lan
# record and the certificate. Then removal. The receiver's CarPlay side needs a real router (F50).
#   sh scripts/lab-test.sh DIR_WITH_APKS
# No privileges, host network or devices; the container is removed at the end.
set -eu
pkgs=$(realpath "${1:?Usage: lab-test.sh DIR_WITH_APKS}")
image=${OPENWRT_ROOTFS:-openwrt/rootfs:x86_64-25.12.5}
name=dashplay-openwrt-lab
stage=$(mktemp -d "${TMPDIR:-/tmp}/dashplay-lab.XXXXXX")
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$stage"; }
trap cleanup EXIT
cp "$pkgs"/dashplay-*.apk "$pkgs"/luci-*.apk "$stage"/
docker run -d --name "$name" --memory 2g --pids-limit 512 -v "$stage:/pkgs:ro" "$image" /sbin/init >/dev/null
lab() { docker exec "$name" sh -c "$1"; }
for _ in $(seq 30); do lab 'ubus list network >/dev/null 2>&1' && break; sleep 1; done

echo "== install (unsigned local packages; dependencies from downloads.openwrt.org)"
lab 'apk update >/dev/null && apk add --allow-untrusted /pkgs/dashplay-jre-*_x86_64.apk /pkgs/dashplay-2*.apk \
     /pkgs/luci-app-dashplay-*.apk /pkgs/luci-i18n-dashplay-zh-cn-*.apk 2>&1 | tail -3'
lab '/usr/lib/dashplay-jre/bin/java -version 2>&1 | head -1'
lab 'python3 /opt/dashplay/supervisor_openwrt.py --root /opt/dashplay --check'
lab 'ls -ld /opt/dashplay/state /opt/dashplay/identity/offline-mfi | cut -c1-10'

echo "== service under procd, no Wi-Fi yet"
sleep 6
lab 'ubus call service list "{\"name\":\"dashplay\"}" | grep -c "\"running\": true"'
lab 'logread -e supervisor_openwrt -e dashplay | tail -3; logread | grep -m2 "waiting:"'

echo "== one manual run with a stand-in access point (fake ubus/iw on PATH)"
lab '/etc/init.d/dashplay stop; mkdir -p /tmp/fake
     ip=$(ip -4 -o addr show eth0 | awk "{print \$4}" | cut -d/ -f1)
     cat > /tmp/fake/ubus <<EOF
#!/bin/sh
case "\$2" in
network.wireless) echo "{\"radio0\":{\"up\":true,\"config\":{\"band\":\"5g\",\"channel\":\"36\"},\"interfaces\":[{\"section\":\"default_radio0\",\"ifname\":\"eth0\",\"config\":{\"mode\":\"ap\",\"ssid\":\"Lab-5G\",\"encryption\":\"psk2\",\"key\":\"lab-secret\",\"network\":[\"lan\"]}}]}}" ;;
network.interface.lan) echo "{\"up\":true,\"l3_device\":\"eth0\",\"ipv4-address\":[{\"address\":\"$ip\",\"mask\":16}]}" ;;
*) exec /bin/ubus "\$@" ;;
esac
EOF
     printf "#!/bin/sh\necho \"Interface eth0\"; echo \"	channel 36 (5180 MHz), width: 80 MHz\"\n" > /tmp/fake/iw
     chmod +x /tmp/fake/ubus /tmp/fake/iw
     PATH=/tmp/fake:$PATH python3 /opt/dashplay/supervisor_openwrt.py --root /opt/dashplay > /tmp/sup.log 2>&1 &
     pid=$!; sleep 45; cat /tmp/sup.log
     echo "-- settings page"; wget -qO- http://127.0.0.1:18080/ | grep -o "交给 iPhone 的 WiFi\|Lab-5G\|在 OpenWrt 后台设置 WiFi\|https://dashplay.lan:18443/\|还缺 CarPlay 认证文件" | sort -u
     echo "-- name record (dnsmasq itself does not run here: netifd cannot set up the LAN)"; uci show dhcp.dashplay
     echo "-- certificate names"; cat /opt/dashplay/state/tls/leaf.san.json; echo
     kill $pid; sleep 3; tail -1 /tmp/sup.log
     echo "-- the receiver on this JRE (cable only): the viewer page over HTTPS"
     # A throwaway self-signed stand-in so the server starts; it cannot authenticate with any iPhone.
     d=/opt/dashplay/identity/offline-mfi
     echo "{\"ssid\": \"Lab-5G\", \"passphrase\": \"lab-secret\"}" > /tmp/lab-handoff.json
     openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -keyout /tmp/k.pem -out /tmp/c.pem -days 1 -subj /CN=lab 2>/dev/null
     openssl pkcs8 -topk8 -nocrypt -in /tmp/k.pem -outform DER -out $d/identity.pk8
     openssl crl2pkcs7 -nocrl -certfile /tmp/c.pem -outform DER -out $d/certificate.p7b
     python3 /opt/dashplay/run-receiver.py --root /opt/dashplay --bind $ip --interface eth0 --channel 36 \
         --hotspot /tmp/lab-handoff.json --java /usr/lib/dashplay-jre/bin/java --settings-port 18080 \
         --no-wireless --web-host 0.0.0.0 > /tmp/receiver.log 2>&1 &
     pid=$!; sleep 40
     python3 -c "import ssl,urllib.request; c=ssl._create_unverified_context(); print(urllib.request.urlopen(\"https://127.0.0.1:18443/\", context=c, timeout=10).read()[:2000].decode(errors=\"replace\").count(\"<script\"), \"script tags in the viewer page\")" 2>&1 | tail -1
     grep -v "\[cds\]" /tmp/receiver.log | tail -12
     kill $pid; rm -f $d/identity.pk8 $d/certificate.p7b'

echo "== removal keeps state and the identity directory, drops the name record"
lab 'apk del luci-i18n-dashplay-zh-cn luci-app-dashplay dashplay dashplay-jre 2>&1 | tail -1
     ls /opt/dashplay; uci -q get dhcp.dashplay || echo "dhcp.dashplay removed"; ls /etc/init.d/dashplay 2>&1 | tail -1'
