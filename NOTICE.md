# openwrt-dashplay — notices and attribution

The package definitions and scripts in this repository are distributed under the GNU General Public
License v3.0 (see `LICENSE`), like [DashPlay](https://github.com/yizhixiaoheigou/DashPlay), whose program they package.

The built packages contain:

- **dashplay**: the DashPlay program bundle of the release named in `dashplay/Makefile` — DashPlay
  (GPL-3.0), PlayPort built from DashPlay's patches with its Maven dependencies (licenses inside each
  JAR) and dbus-next 0.2.3 (MIT). See DashPlay's NOTICE for the projects it derives from.
- **dashplay-jre**: Eclipse Temurin 21 JRE, Alpine Linux (musl) build, by the Eclipse Adoptium
  project (<https://adoptium.net/>), GPL-2.0 with the Classpath Exception; unmodified except that the
  unused `lib/libjsound.so` is left out and a `libc.musl-<cpu>.so.1` link to OpenWrt's musl is added.
- **luci-app-dashplay**: original to this repository (GPL-3.0).

No accessory authentication identity, certificate, private key, pairing record, password or token is
included in this repository or the packages.

CarPlay, iPhone, AirPlay and MFi are trademarks of Apple Inc. This is an independent project; no Apple
affiliation or endorsement is implied.
