# Eclipse Temurin 21 for musl (Adoptium's Alpine build), which OpenWrt's libc is, for the DashPlay receiver. OpenWrt has
# no Java package. Nothing is compiled: jlink (from the x86-64 JDK the SDK runs) cuts the target JDK down to the modules
# the receiver uses, 155 -> 67 MB (2026-10-20). Its libraries need zlib and libstdc++ (with libgcc), as in the early
# OpenWrt lab (install-openwrt-jre.sh).
include $(TOPDIR)/rules.mk

PKG_NAME:=dashplay-jre
PKG_VERSION:=21.0.12.1
PKG_RELEASE:=3
PKG_LICENSE:=GPL-2.0-only WITH Classpath-exception-2.0

# The CPU of the JRE; scripts/openwrt/build-packages.sh sets it (and the package architecture) to build
# the aarch64 package in the x86-64 SDK, since nothing here is compiled.
JRE_CPU ?= $(ARCH)
ifeq ($(JRE_CPU),aarch64)
  JRE_TEMURIN:=aarch64
  JRE_MUSL:=aarch64
  PKG_HASH:=8242627927adc90ac2561d0812dd39890ebc21ef09b550bc2e8b93640b8af4f8
else
  JRE_TEMURIN:=x64
  JRE_MUSL:=x86_64
  PKG_HASH:=bd8824214e42b33333c7f55a039ea078ad6ea6be20d7c5b011c801fb2bdb44f0
endif
PKG_SOURCE:=OpenJDK21U-jdk_$(JRE_TEMURIN)_alpine-linux_hotspot_21.0.12.1_1.tar.gz
PKG_SOURCE_URL:=https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/

# What the receiver's jars use (jdeps -summary, 2026-10-20): BouncyCastle java.logging/java.naming/java.sql, Netty
# jdk.unsupported, ktor-utils java.management, protocol jdk.net; jdk.crypto.ec is SunEC (P-256 for the MFi signature and
# TLS), reached by name only. Left out: java.desktop (only Typesafe Config's bean binding, which Ktor's start never uses).
JRE_MODULES:=java.base,java.logging,java.management,java.naming,java.sql,jdk.crypto.ec,jdk.net,jdk.unsupported

include $(INCLUDE_DIR)/package.mk

# jlink runs on the build host and must be the same release as the modules it links.
HOST_JDK:=OpenJDK21U-jdk_x64_linux_hotspot_21.0.12.1_1.tar.gz
define Download/host-jdk
  FILE:=$(HOST_JDK)
  URL:=$(PKG_SOURCE_URL)
  HASH:=ce79869e1307ed8ee1e2baa86a412b1eb5b75d10a01006d788a6f968bcfaee94
endef
$(eval $(call Download,host-jdk))

# Already stripped by Adoptium; the SDK's strip may not even know the target CPU.
STRIP:=:
RSTRIP:=:

define Package/dashplay-jre
  SECTION:=lang
  CATEGORY:=Languages
  TITLE:=Java 21 runtime (Eclipse Temurin, musl) for DashPlay
  URL:=https://adoptium.net/
  DEPENDS:=@(aarch64||x86_64)
  EXTRA_DEPENDS:=zlib (>=1.2), libstdcpp6 (>=11)
endef

define Package/dashplay-jre/description
  The Eclipse Temurin 21 runtime (Alpine/musl build, cut down by jlink to what DashPlay's receiver uses) in
  /usr/lib/dashplay-jre.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)/jdk $(PKG_BUILD_DIR)/host-jdk
	tar -xzf $(DL_DIR)/$(PKG_SOURCE) -C $(PKG_BUILD_DIR)/jdk --strip-components=1
	tar -xzf $(DL_DIR)/$(HOST_JDK) -C $(PKG_BUILD_DIR)/host-jdk --strip-components=1
endef

define Build/Compile
	rm -rf $(PKG_BUILD_DIR)/jre
	$(PKG_BUILD_DIR)/host-jdk/bin/jlink --module-path $(PKG_BUILD_DIR)/jdk/jmods --add-modules $(JRE_MODULES) \
		--strip-debug --no-man-pages --no-header-files --compress=zip-0 --output $(PKG_BUILD_DIR)/jre
endef

# Alpine links against musl as libc.musl-<cpu>.so.1; OpenWrt's musl is /lib/libc.so (2026-10-12: the
# SDK's library check found it missing). javax.sound is unused and its library would need ALSA.
define Package/dashplay-jre/install
	$(INSTALL_DIR) $(1)/usr/lib/dashplay-jre
	$(CP) $(PKG_BUILD_DIR)/jre/* $(1)/usr/lib/dashplay-jre/
	rm -f $(1)/usr/lib/dashplay-jre/lib/libjsound.so
	$(LN) /lib/libc.so $(1)/usr/lib/libc.musl-$(JRE_MUSL).so.1
endef

# The class data sharing archive belongs to the CPU it runs on, so it is made on the box (a few seconds); the
# receiver's AppCDS (-XX:+AutoCreateSharedArchive) builds on it. With G1, as Temurin's own: only then does it hold the
# module graph and heap objects (the receiver's Serial collector loads them). F50 in a CarPlay session (2026-10-20):
# ~148 MB resident without them (and a stale AppCDS), 117-121 MB with, as on the full Temurin JRE.
define Package/dashplay-jre/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || /usr/lib/dashplay-jre/bin/java -XX:+UseG1GC -Xshare:dump >/dev/null 2>&1 || true
endef

define Package/dashplay-jre/prerm
#!/bin/sh
rm -f /usr/lib/dashplay-jre/lib/server/classes.jsa /usr/lib/dashplay-jre/lib/server/classes_nocoops.jsa
endef

$(eval $(call BuildPackage,dashplay-jre))
