# openwrt-dashplay

[中文](README.md)

OpenWrt packages for [DashPlay](https://github.com/yizhixiaoheigou/DashPlay): receive an iPhone's CarPlay on an OpenWrt 25.12 router or portable Wi-Fi, and show it, with sound and touch, in the browser of the head unit or any other device.

- `dashplay`: the program and its service (`/opt/dashplay`, `/etc/init.d/dashplay`, `/etc/config/dashplay`), for every architecture. The program itself is the `dashplay-bundle-<version>.tar` attached to each DashPlay release (`PKG_SOURCE_URL` and `PKG_HASH` in `dashplay/Makefile`); this repository keeps no second copy of the source.
- `dashplay-jre`: the musl build of the Eclipse Temurin 21 JRE (OpenWrt has no Java), for aarch64 and x86_64.
- `luci-app-dashplay` (with a Chinese translation): the admin page "Services → DashPlay".

**No technical background needed**: once you have a Phicomm N1, a OneCloud (玩客云), a ZTE F50 running OpenWrt or another OpenWrt router, send this sentence to your AI assistant (Claude Code, Codex, WorkBuddy, Doubao, DeepSeek and the like all work). It asks which device you have and installs DashPlay step by step, calling you only to plug or unplug power or tap something on your phone:

> Please read https://github.com/yizhixiaoheigou/DashPlay/blob/main/skills/dashplay-install/SKILL.md and follow it step by step to install DashPlay for me.

> **This is not an Apple-certified product.** You have to supply your own accessory authentication identity; see DashPlay's README.

DashPlay on a router or portable Wi-Fi you already run with OpenWrt: the iPhone connects wirelessly (Bluetooth + Wi-Fi) or by cable, and the head unit's browser opens a web page with CarPlay. The network stays configured in OpenWrt as usual; the plugin does not take it over.

## 1. Requirements

- OpenWrt **25.12** (the release that installs packages with `apk`), on an **aarch64 (ARM64) or x86_64** CPU (the only two with a Java build).
- About 230 MB of free storage (including dependencies, mostly Java; measured: about 225 MB more after installation) and preferably 512 MB of memory or more.
- Preferably 5 GHz Wi-Fi; wireless CarPlay also needs Bluetooth that Linux supports (built in or a USB dongle); wired CarPlay needs a USB port that works as a host (a port that takes a USB stick usually does).
- Your own CarPlay authentication files (not included; see section 3).

## 2. Install

Download the packages from this repository's release page, copy them to the router (for example `scp` to `/tmp`), log in over SSH and run:

```sh
cd /tmp
apk update
apk add --allow-untrusted dashplay-jre-*_$(cat /etc/apk/arch).apk dashplay-2*.apk luci-app-dashplay-*.apk luci-i18n-dashplay-zh-cn-*.apk
# Wireless CarPlay (Bluetooth); add kmod-btusb for a USB Bluetooth dongle:
apk add bluez-daemon
# Wired CarPlay (cable):
apk add kmod-tun
```

There is one `dashplay-jre` package per architecture; the command above picks the one that matches `cat /etc/apk/arch` (downloading only that one also works). The packages are not signed, hence `--allow-untrusted`.

## 3. Add the CarPlay authentication files

Give DashPlay's [install notes for AI assistants (Chinese)](https://github.com/yizhixiaoheigou/DashPlay/blob/main/docs/DashPlay-AI安装说明.md) and your two files to your AI assistant, with the router's address and SSH user name and password; the files go to `/opt/dashplay/identity/offline-mfi/`. DashPlay starts working once they are in place.

## 4. Set up and use

1. In the OpenWrt admin, "Services → DashPlay": check that it is running and choose the "Wi-Fi handed to the iPhone" (default automatic: the first access point that is up, 5 GHz first).
2. Click "DashPlay settings (add iPhone)" to open the settings page (`http://<router address>:18080/`) and add the iPhone from the head unit's screen: on the iPhone open "Settings → Bluetooth" and stay on that page, compare the six digits and confirm on both sides. With a cable, tap "Trust" on the iPhone the first time.
3. The head unit joins the router's Wi-Fi and opens `https://dashplay.lan:18443/` in its browser (or `https://<router address>:18443/`). When it warns about the certificate, choose "continue".

When the Wi-Fi name, password or channel changes in the admin, DashPlay follows on its own; no reinstall needed.

**When the router joins the car hotspot or a portable Wi-Fi as a client**: the head unit does not use the router's DNS, so use `https://<router's address on that network>:18443/`; and that network must be in a firewall zone that accepts input (the default wan zone rejects the iPhone's connections; the settings page warns about it).

When the head unit's browser cannot open the page or blocks the certificate, see section 4 of the [AI install notes (Chinese)](https://github.com/yizhixiaoheigou/DashPlay/blob/main/docs/DashPlay-AI安装说明.md).

## 5. Security note

As with the boxes, anyone who can join this Wi-Fi can open the CarPlay page and the settings page. Keep that in mind on your main home router; on a router used only in the car it matters little.

## 6. Uninstall

```sh
apk del luci-i18n-dashplay-zh-cn luci-app-dashplay dashplay dashplay-jre
```

Added iPhones, certificates and the authentication files stay in `/opt/dashplay/`; delete them by hand when you no longer need them.

## ZTE F50 (MU300 OpenWrt)

The F50 runs a vendor 5.4 kernel and must not get the system `bluez-daemon` (it pulls in 6.12 kernel modules). DashPlay brings the F50's own Bluetooth start-up with BlueZ in a separate directory:

```sh
python3 /opt/dashplay/board_zte_f50.py --setup      # makes /opt/dashplay-bluez from the F50's own official package feeds
uci set dashplay.main.bluetooth_service='/usr/bin/python3 /opt/dashplay/board_zte_f50.py'
uci set dashplay.main.dbus_address='unix:path=/var/run/dashplay/bluetooth/system_bus_socket'
uci commit dashplay && /etc/init.d/dashplay restart
```

The F50's USB port cannot act as a host, so it is wireless only. This repository contains no tools or firmware for flashing OpenWrt onto the F50.

## Building the packages

Needs Docker (the container needs no privileges, host network or devices).

```sh
sh scripts/build-packages.sh out/                         # the SDK downloads the program bundle from DashPlay's release and checks it
sh scripts/build-packages.sh out/ dashplay-bundle.tar     # or uses a bundle you built yourself
sh scripts/lab-test.sh out/                               # installs, starts, checks and removes them in a clean OpenWrt 25.12.5 container
```

This repository also works as a package feed: add `src-git dashplay https://github.com/yizhixiaoheigou/openwrt-dashplay.git` to the OpenWrt SDK's `feeds.conf`. Dependencies are runtime-only (`EXTRA_DEPENDS`), so packaging compiles neither Python nor kernel modules.

After a new DashPlay release, download its `dashplay-bundle-<version>.tar` and run `sh scripts/bump-dashplay.sh <version> dashplay-bundle-<version>.tar` to update the version and hash in `dashplay/Makefile`, then build.

## License and trademarks

GPL-3.0; see [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). CarPlay, iPhone, AirPlay and MFi are trademarks of Apple Inc.; this project is not affiliated with or endorsed by Apple.
