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

**When the head unit cannot open the page**: usually not needed; do only the step that applies. A certificate warning with "continue": continue. No way to continue: install the DashPlay CA certificate (settings page, "Download the box CA certificate") or use the own name below. The head unit refuses a LAN address: use "Head unit refuses every LAN address" or "Public IPv6 address for the name" below. All of them are on the tab "Services → DashPlay → When the head unit cannot open the page", each saying which problem it solves.

**When the head unit refuses a LAN address (optional)**: some head unit browsers will not open a private address such as `192.168.x.x`. If the router has a public IPv6 address and hands IPv6 on to its Wi-Fi, set "Public IPv6 address for the name" in "Services → DashPlay → When the head unit cannot open the page" to "Also": the name (`dashplay.lan`, say) then also points at the router's own public IPv6 address. The head unit sees a public address, but that address is the router itself, so the picture still comes straight over the Wi-Fi, without the internet and without mobile data. DashPlay follows a new address (a mobile network reconnecting). "Only" leaves the LAN address out, to check that this path works; the DashPlay settings page then opens at `http://<router address>:18080/`. The head unit must be on the router's Wi-Fi; client isolation or a browser that only opens listed sites is not got round this way. Command: `uci set dashplay.main.public_ipv6=1 && uci commit dashplay && /etc/init.d/dashplay restart`.

**Tesla (optional)**: turn on "Tesla mode" in "Services → DashPlay → General". The network of the router's own Wi-Fi moves to `100.96.0.1/24` (Tesla's browser opens no LAN address such as `192.168.x.x`, not even by name, but opens this carrier shared range), and the name and own name follow; music, calls and Siri are left to the Tesla over Bluetooth (pair the iPhone with the car and pick it as the media source: steering wheel, media card and volume are the car's own), while the page shows the picture and plays navigation prompts, louder; the page's fullscreen button goes through v.qq.com and 1905.com back to the page without the address bar. **Turn on "Remain connected in Drive" for the Tesla's Wi-Fi**: otherwise it leaves the Wi-Fi as soon as it leaves Park (reverse, drive) and the picture stops until it is back in Park. Afterwards reconnect the car and phones to the Wi-Fi and open the admin at `http://100.96.0.1/`; turning it off puts the previous address back. If the Tesla does not see the Wi-Fi, set the country to China and the channel to 149. For another car that refuses LAN addresses, "Head unit refuses every LAN address" in "When the head unit cannot open the page" moves the network alone.

**Sound over the car's Bluetooth (optional, any car)**: when the car itself can pair with the iPhone over Bluetooth, turn on "Music over the car's Bluetooth" in "General": the steering wheel, media card and volume are the car's own, and the page shows the picture and plays navigation prompts, louder. "Calls and Siri over the car's Bluetooth" keeps calls and Siri on the car's own microphone and speakers instead of the page (worth a try when calls through the page echo). Either works alone; Tesla mode includes both. Pair the iPhone with the car first and pick it as the media source. Command: `uci set dashplay.main.car_music=1` (or `car_voice=1`), then `uci commit dashplay && /etc/init.d/dashplay restart`. A Tesla update that blocks this range too would end this way.

**Releasing the iPhone when nobody watches (optional)**: when no page has shown the picture for 5 minutes, DashPlay ends wireless CarPlay and the iPhone stops encoding and sending its screen, so a phone left near a router that stays on (at home, say) does not keep running hot and slow. The cost: a page opened again after that has to invite the iPhone, about 7 s to the picture; a page that stays open (also while hidden by the reverse camera or another app) is not affected, nor is wired CarPlay. For the picture at once, set "Release the iPhone after (seconds)" in "Services → DashPlay" to 0 (never) or another number of seconds, or run `uci set dashplay.main.idle_release=0 && uci commit dashplay && /etc/init.d/dashplay restart`.

**When the head unit's browser blocks the certificate with no "continue" (optional)**: sign up for a free sub-domain at duckdns.org and enter it ("Own name", e.g. `mycar`) with the "DuckDNS token" under "Services → DashPlay → When the head unit cannot open the page". The address name becomes `mycar.duckdns.org`: DashPlay points it at the router and uses the bundled acme.sh to get a free Let's Encrypt certificate (DNS validation, no open port; the router needs internet access), renewed automatically. The certificate is used from DashPlay's next start; the head unit then opens `https://mycar.duckdns.org:18443/` without a warning. The DashPlay settings page shows its progress and end date under "When the head unit cannot open the page".

**When the router joins the car hotspot or a portable Wi-Fi as a client**: the head unit does not use the router's DNS, so use `https://<router's address on that network>:18443/`; and that network must be in a firewall zone that accepts input (the default wan zone rejects the iPhone's connections; the settings page warns about it).

When the head unit's browser cannot open the page or blocks the certificate, see section 4 of the [AI install notes (Chinese)](https://github.com/yizhixiaoheigou/DashPlay/blob/main/docs/DashPlay-AI安装说明.md).

**Calls and Siri** use the head unit's microphone through the browser and play on its media channel (not the headrest speakers); the other side may hear its own echo. While the iPhone is also on the car's own Bluetooth, the car takes the call and the microphone and the other side hears nothing: disconnect the iPhone from the car's own Bluetooth to call over CarPlay. An app of the head unit playing sound pauses the iPhone; press play once on the steering wheel or the media card to go on.

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
