# DashPlay for OpenWrt 25.12 (apk). Architecture-independent: the program bundle attached to each
# DashPlay release (Python, the receiver's jars and the web player; DashPlay builds it with
# scripts/onecloud/firmware/build-bundle.sh, since the receiver needs a JDK and Gradle, which the SDK
# does not have). The SDK downloads it and checks PKG_HASH; scripts/bump-dashplay.sh moves this package
# to another DashPlay release, and scripts/build-packages.sh can build from a local bundle instead.
include $(TOPDIR)/rules.mk

PKG_NAME:=dashplay
PKG_VERSION:=2026.10.19
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0-only
PKG_SOURCE:=dashplay-bundle-$(PKG_VERSION).tar
PKG_SOURCE_URL:=https://github.com/yizhixiaoheigou/DashPlay/releases/download/v$(PKG_VERSION)/
PKG_HASH:=c9633eb062e860a07fb0b05c84cbc12e3df8abb5d1b96251f20683bd2430c01c

include $(INCLUDE_DIR)/package.mk

define Package/dashplay
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=DashPlay: CarPlay in the car's web browser
  PKGARCH:=all
  # Runtime dependencies only (EXTRA_DEPENDS): the SDK would otherwise build them from source.
  # Wireless CarPlay also needs bluez-daemon and a Bluetooth adapter; wired CarPlay needs kmod-tun and a
  # USB host port. Neither is a hard dependency: some boards (ZTE F50) run their own BlueZ, and kernel
  # packages must match the board's kernel.
  # curl: acme.sh, for the optional own name's certificate (duckdns_domain); BusyBox/uclient wget will not do.
  EXTRA_DEPENDS:=python3 (>=3.11), ip-full (>=6.0), iw (>=5.0), openssl-util (>=3.0), curl (>=8.0), dashplay-jre (>=21)
endef

define Package/dashplay/description
  Receives CarPlay from an iPhone (Bluetooth + Wi-Fi, or the USB cable) and shows it, with sound and
  touch, in any web browser on the router's network. The MFi identity is not included: put it in
  /opt/dashplay/identity/offline-mfi/ yourself.
endef

define Package/dashplay/conffiles
/etc/config/dashplay
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)/bundle
	tar -xf $(DL_DIR)/$(PKG_SOURCE) -C $(PKG_BUILD_DIR)/bundle
endef

define Build/Compile
endef

# The Debian/Armbian pieces stay out; state/ and identity/ are created by postinst and never owned by
# the package, so an upgrade or removal keeps pairings, certificates and the MFi identity.
define Package/dashplay/install
	$(INSTALL_DIR) $(1)/opt/dashplay $(1)/etc/init.d $(1)/etc/config
	cd $(PKG_BUILD_DIR)/bundle && tar -cf - --exclude=./state --exclude=./identity --exclude=./firmware \
		--exclude=./service.json --exclude=./dashplay.service --exclude=./supervisor.py . | tar -xf - -C $(1)/opt/dashplay
	$(INSTALL_BIN) ./files/dashplay.init $(1)/etc/init.d/dashplay
	$(INSTALL_CONF) ./files/dashplay.config $(1)/etc/config/dashplay
endef

define Package/dashplay/postinst
#!/bin/sh
[ -n "$$IPKG_INSTROOT" ] && exit 0
mkdir -p /opt/dashplay/state/receiver /opt/dashplay/identity/offline-mfi
chmod 700 /opt/dashplay/state /opt/dashplay/state/receiver /opt/dashplay/identity /opt/dashplay/identity/offline-mfi
# ZTE F50 (MU300 OpenWrt): the system's boot scripts, faster and without dropping CarPlay right after it came up
# (mu300_boot.py; it changes only the exact originals, keeps them, and "mu300_boot.py revert" puts them back)
if [ -d /opt/mu300 ]; then python3 /opt/dashplay/mu300_boot.py apply; fi
/etc/init.d/dashplay enable
/etc/init.d/dashplay restart
exit 0
endef

define Package/dashplay/prerm
#!/bin/sh
[ -n "$$IPKG_INSTROOT" ] && exit 0
/etc/init.d/dashplay stop
/etc/init.d/dashplay disable
# Files the running program made beside the packaged ones; state/ and identity/ stay.
rm -f /opt/dashplay/playport/web/dist/receiver-access.js /opt/dashplay/playport/web/dist/receiver-access.json
find /opt/dashplay -name __pycache__ -type d -prune -exec rm -rf {} +
# The name's records (uci dashplay.main.public_ipv6 adds "dashplay6" and, alone, a local-only entry).
name=$$(uci -q get dhcp.dashplay.name || uci -q get dhcp.dashplay6.name)
changed=
for section in dashplay dashplay6; do
	[ "$$(uci -q get dhcp.$$section)" = domain ] && uci delete dhcp.$$section && changed=1
done
[ -n "$$name" ] && uci -q del_list dhcp.@dnsmasq[0].server="/$$name/" && changed=1
if [ -n "$$changed" ]; then
	uci commit dhcp || exit 1
	# Reloading a stopped dnsmasq can start it and wait indefinitely for netifd/procd locks.
	# Python is still installed while prerm runs; OpenWrt busybox need not include timeout.
	python3 - <<'PY'
import json, subprocess
try:
    result = subprocess.run(['ubus', '-t', '5', 'call', 'service', 'list', '{"name":"dnsmasq"}'],
                            capture_output=True, text=True, timeout=6, check=True)
    instances = json.loads(result.stdout).get('dnsmasq', {}).get('instances', {})
    if any(instance.get('running') is True for instance in instances.values()):
        subprocess.run(['/etc/init.d/dnsmasq', 'reload'], timeout=15, check=True)
except (OSError, ValueError, subprocess.SubprocessError):
    print('DashPlay DNS records removed from configuration; DNS reload unavailable, apply on next service restart.')
PY
fi
exit 0
endef

$(eval $(call BuildPackage,dashplay))
