# Eclipse Temurin 21 JRE built for musl (Adoptium's Alpine build), which OpenWrt's libc is, for the
# DashPlay receiver. OpenWrt has no Java package. Prebuilt and already stripped: nothing is compiled.
# Its libraries need zlib and libstdc++ (with libgcc), as in the early OpenWrt lab (install-openwrt-jre.sh).
include $(TOPDIR)/rules.mk

PKG_NAME:=dashplay-jre
PKG_VERSION:=21.0.12.1
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only WITH Classpath-exception-2.0

# The CPU of the JRE; scripts/openwrt/build-packages.sh sets it (and the package architecture) to build
# the aarch64 package in the x86-64 SDK, since nothing here is compiled.
JRE_CPU ?= $(ARCH)
ifeq ($(JRE_CPU),aarch64)
  JRE_TEMURIN:=aarch64
  JRE_MUSL:=aarch64
  PKG_HASH:=98e15ae359e1f87160ee4c0abb43336513e41712d439fd4a805a5474af32b2c7
else
  JRE_TEMURIN:=x64
  JRE_MUSL:=x86_64
  PKG_HASH:=7bc7c2f9ba5ffea5f727e14581964bd54294b8edc2be9a79ea6393f8d0799200
endif
PKG_SOURCE:=OpenJDK21U-jre_$(JRE_TEMURIN)_alpine-linux_hotspot_21.0.12.1_1.tar.gz
PKG_SOURCE_URL:=https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/

include $(INCLUDE_DIR)/package.mk

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
  The Eclipse Temurin 21 JRE (Alpine/musl build) in /usr/lib/dashplay-jre, used by DashPlay's receiver.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)/jre
	tar -xzf $(DL_DIR)/$(PKG_SOURCE) -C $(PKG_BUILD_DIR)/jre --strip-components=1
endef

define Build/Compile
endef

# Alpine links against musl as libc.musl-<cpu>.so.1; OpenWrt's musl is /lib/libc.so (2026-10-12: the
# SDK's library check found it missing). javax.sound is unused and its library would need ALSA.
define Package/dashplay-jre/install
	$(INSTALL_DIR) $(1)/usr/lib/dashplay-jre
	$(CP) $(PKG_BUILD_DIR)/jre/* $(1)/usr/lib/dashplay-jre/
	rm -f $(1)/usr/lib/dashplay-jre/lib/libjsound.so
	$(LN) /lib/libc.so $(1)/usr/lib/libc.musl-$(JRE_MUSL).so.1
endef

$(eval $(call BuildPackage,dashplay-jre))
