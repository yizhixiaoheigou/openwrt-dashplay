# LuCI page "Services → DashPlay": status, the Wi-Fi handed to the iPhone, links to the DashPlay settings
# page (adding iPhones) and the CarPlay viewer.
include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI page for DashPlay
# Runtime dependencies only: building luci-base's own dependencies needs the full package feeds.
LUCI_DEPENDS:=
LUCI_EXTRA_DEPENDS:=dashplay (>=2026.10.12), luci-base (>=0)
LUCI_PKGARCH:=all
PKG_LICENSE:=GPL-3.0-only

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
