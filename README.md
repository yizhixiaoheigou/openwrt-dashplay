# openwrt-dashplay

[English](README.en.md)

[DashPlay](https://github.com/yizhixiaoheigou/DashPlay) 的 OpenWrt 软件包：在 OpenWrt 25.12 路由器或随身 WiFi 上接收 iPhone 的 CarPlay，车机或任何设备用浏览器显示、出声、触控。

- `dashplay`：程序与开机服务（`/opt/dashplay`、`/etc/init.d/dashplay`、`/etc/config/dashplay`），各架构通用。程序本身来自 DashPlay 每次发布附带的 `dashplay-bundle-<版本>.tar`（`dashplay/Makefile` 里的 `PKG_SOURCE_URL` 与 `PKG_HASH`），本仓库不另存一份源码。
- `dashplay-jre`：Eclipse Temurin 21 JRE 的 musl 版（OpenWrt 没有 Java），aarch64 与 x86_64。
- `luci-app-dashplay`（含中文）：后台「服务 → DashPlay」。

**不懂技术也能装**：买好斐讯 N1、玩客云、ZTE F50（已刷 OpenWrt）或其他 OpenWrt 路由器后，把下面这句话发给你的 AI 助手（Claude Code、Codex、WorkBuddy、豆包、DeepSeek 等都可以），它会问清楚你的设备，一步步帮你装好，只在需要你插拔电源、在手机上点选时叫你：

> 请在终端用 curl 下载 https://raw.githubusercontent.com/yizhixiaoheigou/DashPlay/main/skills/dashplay-install/SKILL.md 的原文并完整读完（不要用网页摘要工具，它可能给出旧版或删节版），再按它一步步帮我把 DashPlay 装好。

> **这不是 Apple 认证产品。** 运行需要你自己提供配件认证身份，见 DashPlay 的说明。

给已经在用 OpenWrt 的路由器或随身 WiFi 装上 DashPlay：iPhone 无线（蓝牙 + WiFi）或插数据线连路由器，车机浏览器打开网页就能用 CarPlay。网络照常在 OpenWrt 后台设置，插件不接管。

## 1. 需要什么

- OpenWrt **25.12**（用 `apk` 装包的版本），CPU 为 **aarch64（ARM64）或 x86_64**（Java 只有这两种）。
- 约 230 MB 可用存储（含依赖，Java 运行环境占大头；实测装好后增加约 225 MB），内存建议 512 MB 以上。
- WiFi 最好有 5 GHz；无线 CarPlay 还要 Linux 能用的蓝牙（内置或 USB 蓝牙棒）；有线 CarPlay 要路由器的 USB 口能当主机用（能插 U 盘的口一般可以）。
- 你自己的 CarPlay 认证文件（插件不含，见第 3 节）。

## 2. 安装

从本仓库发布页下载这几个包，传到路由器（例如 `scp` 到 `/tmp`），SSH 登录后：

```sh
cd /tmp
apk update
apk add --allow-untrusted dashplay-jre-*_$(cat /etc/apk/arch).apk dashplay-2*.apk luci-app-dashplay-*.apk luci-i18n-dashplay-zh-cn-*.apk
# 无线 CarPlay（蓝牙）；用 USB 蓝牙棒时再加 kmod-btusb：
apk add bluez-daemon
# 有线 CarPlay（数据线）：
apk add kmod-tun
```

`dashplay-jre` 每种架构一个包，上面的命令按 `cat /etc/apk/arch` 自动选对应的那个（只下载那一个也行）。包没有签名，所以要加 `--allow-untrusted`。

## 3. 放入 CarPlay 认证文件

把 DashPlay 的 [给 AI 助手的安装说明](https://github.com/yizhixiaoheigou/DashPlay/blob/main/docs/DashPlay-AI安装说明.md) 和你的两个文件交给你的 AI 助手，告诉它路由器地址和 SSH 用户名、密码；文件放在 `/opt/dashplay/identity/offline-mfi/`。放好后 DashPlay 自动开始工作。

## 4. 设置与使用

1. OpenWrt 后台「服务 → DashPlay」：看运行状态，选「交给 iPhone 的 WiFi」（默认自动：第一个开着的热点，优先 5 GHz）。
2. 点「DashPlay 设置（添加 iPhone）」打开设置页（`http://路由器地址:18080/`），在车机屏幕上添加 iPhone：iPhone 打开「设置 → 蓝牙」并停在那一页，核对六位数字后两边确认。插数据线的话，第一次在 iPhone 上点「信任」即可。
3. 车机连路由器的 WiFi，浏览器打开 `https://dashplay.lan:18443/`（也可以用 `https://路由器地址:18443/`）。提示证书不安全时点「继续访问」。

WiFi 名称、密码或信道在后台改了以后，DashPlay 会自动跟着改，不用重装。

**车机打不开画面时**：一般用不到，按顺序只做需要的一步——提示证书不安全但有「继续访问」：点继续；没有继续选项：装 DashPlay 的 CA 证书（设置页「下载盒子 CA 证书」）或用下面的「自己的域名」；车机不让打开局域网地址：用下面的「车机不让开任何局域网地址」或「访问名称指向公网 IPv6」。这几项都在后台「服务 → DashPlay → 车机打不开画面时」标签里，每项都写了它解决什么问题。

**车机不让打开局域网地址时（可选）**：有的车机浏览器拒绝访问 `192.168.x.x` 这类局域网地址。路由器有公网 IPv6、并把 IPv6 分给 WiFi 里的设备时，可以在后台「服务 → DashPlay → 车机打不开画面时」把「访问名称指向公网 IPv6」设为「同时」：访问名称（如 `dashplay.lan`）还会指向路由器自己的公网 IPv6 地址，车机看到的是公网地址，但这个地址就是路由器自己，画面仍然直接走 WiFi，不经过外网、不耗流量。地址变了（移动网络重新拨号）DashPlay 会自动跟着改。「只用」去掉局域网地址，便于确认这条路是否通；这时 DashPlay 设置页要用 `http://路由器地址:18080/` 打开。车机必须连着路由器的 WiFi；车机热点在设备之间的隔离、只放行白名单网站等限制这样也绕不过。命令：`uci set dashplay.main.public_ipv6=1 && uci commit dashplay && /etc/init.d/dashplay restart`。

**特斯拉（可选）**：在后台「服务 → DashPlay → 常规」打开「特斯拉模式」：路由器自己 WiFi 的网段改成 `100.96.0.1/24`（特斯拉浏览器不让开 `192.168.x.x` 这类局域网地址，用名称也不行；这段运营商共享地址它能开），访问名称和自己的域名自动跟着改；音乐、电话、Siri 交给特斯拉蓝牙（iPhone 用蓝牙连特斯拉并选为媒体来源，方向盘、媒体卡片、音量都是原生的），网页负责画面和导航播报（播报放大）；CarPlay 网页右上角的全屏经腾讯视频、1905 跳转回本页、去掉地址栏。**特斯拉 WiFi 必须打开「行驶中保持连接」**，否则一出 P 挡（倒车、开车）就断开 WiFi，画面中断到挂回 P 挡。打开后车机和手机重连一次 WiFi，后台改用 `http://100.96.0.1/`；取消勾选改回原来的地址。特斯拉搜不到 WiFi 时把地区设为中国、信道改 149。别的车拒绝局域网地址时，可在「车机打不开画面时」只勾选「车机不让开任何局域网地址」改网段。

**声音走车机蓝牙（可选，任何车）**：车机自己能用蓝牙连 iPhone 时，在「常规」勾选「音乐走车机蓝牙」：方向盘切歌、媒体卡片、音量都用车机原生的，网页只负责画面和导航播报（播报放大）；勾选「通话与 Siri 走车机蓝牙」：通话和 Siri 用车机自己的麦克风和喇叭，不经过网页（网页通话有回声时可以试）。两项可单独用，特斯拉模式已包含。iPhone 要先用蓝牙连上车机并选为媒体来源。命令：`uci set dashplay.main.car_music=1`（或 `car_voice=1`），再 `uci commit dashplay && /etc/init.d/dashplay restart`。特斯拉哪次更新把这段地址也拦了，这个办法就失效。

**车机浏览器拦截证书、没有「继续访问」时（可选）**：在 duckdns.org 免费注册一个子域名，在后台「服务 → DashPlay → 车机打不开画面时」填「自己的域名」（如 `mycar`）和「DuckDNS token」。访问名称会变成 `mycar.duckdns.org`：DashPlay 把它指向路由器，并用内置的 acme.sh 向 Let's Encrypt 申请免费正式证书（DNS 验证，不需要开放端口，路由器要能上网），到期前自动续签；证书在 DashPlay 下次启动时启用，之后车机打开 `https://mycar.duckdns.org:18443/` 不再有证书警告。DashPlay 设置页「车机打不开画面时」里能看到进度和有效期。

**没人看画面时释放 iPhone（可选）**：没有任何网页在看画面超过 5 分钟，DashPlay 就结束无线 CarPlay，iPhone 不再持续编码、发送画面。路由器常开、手机放在旁边时（比如在家），手机就不会一直发热、变卡。代价是：画面页关掉超过 5 分钟后再打开，要重新邀请 iPhone，约 7 秒才出画面；画面页一直开着（包括倒车、切到别的应用时被藏起来）不受影响，有线 CarPlay 也不受影响。想要再打开时立刻出画面，可以在后台「服务 → DashPlay」把「无人观看多久后释放 iPhone」改成 0（永不释放），或改成别的秒数；也可以用命令：`uci set dashplay.main.idle_release=0 && uci commit dashplay && /etc/init.d/dashplay restart`。

**路由器作为客户端连车机热点或随身 WiFi 时**：车机不经过路由器的 DNS，只能用 `https://路由器在那个网络里的地址:18443/`；而且那个网络要放进允许入站的防火墙区域（默认的 wan 区域会拒绝 iPhone 的连接，设置页会提示）。

**用另一台路由器的 WiFi（可选）**：想让手机和车机连一台无线更好的便携路由器（GL.iNet、Cudy 等），而 DashPlay 仍装在本机（比如 F50 提供 4G 和 DashPlay）时：
1. 便携路由器设成**桥接进本机局域网的无线接入点**：它连本机的那一路（网线口，或插 F50 USB 得到的 USB 共享网卡，F50 上是 cdc_ncm）和它的 WiFi 放进同一个桥，关掉它自己的 DHCP，让手机和车机从本机拿地址。WiFi 设成**固定信道**。
2. 本机后台「服务 → DashPlay」的「交给 iPhone 的 WiFi」选「另一台路由器的 WiFi」，填它的 WiFi 名称、加密方式、密码和**实际在用的信道**（到它的状态页或手机的 WiFi 详情里看；有的路由器会自动换主信道，实测设 36 变成了 40）；「桥接进的网络」一般是 `lan`。
3. 车机连便携路由器的 WiFi，照常打开 `https://dashplay.lan:18443/`。

便携路由器的 WiFi 名称、密码或信道改了，要在这里同步改。特斯拉模式改网段后，连在便携路由器上的设备要手动重连一次 WiFi。2026-10-19 用玩客云模拟便携路由器实测通过（F50 的 USB 插玩客云，玩客云的 USB 无线网卡桥接发热点）：iPhone 连上并出画面，延迟约 90 ms、不丢帧。命令：`uci set dashplay.main.wifi=external`，再设 `external_ssid`、`external_key`、`external_security`（wpa2/wpa3/open）、`external_channel`，`uci commit dashplay && /etc/init.d/dashplay restart`。

车机浏览器打不开或拦截证书时，见 [AI 安装说明](https://github.com/yizhixiaoheigou/DashPlay/blob/main/docs/DashPlay-AI安装说明.md) 第 4 节「车机浏览器打不开时」。

**打电话和 Siri**：用车机的麦克风（经浏览器），从车机的媒体声道出声（不是头枕喇叭）；对方可能听到自己的回声。iPhone 同时连着车机自带蓝牙时，车机自己也进入通话、占住麦克风，对方听不到你：用 CarPlay 打电话时请断开 iPhone 与车机自带蓝牙。车机自己的应用放声音会让 iPhone 暂停，回来后按一次方向盘或音乐卡片的播放键即可继续。

## 5. 安全提醒

和盒子版一样，能连上这个 WiFi 的人都能打开 CarPlay 画面和设置页。装在家里的主路由上时请注意这一点；只在车上用的路由器问题不大。

## 6. 卸载

```sh
apk del luci-i18n-dashplay-zh-cn luci-app-dashplay dashplay dashplay-jre
```

已添加的 iPhone、证书和认证文件留在 `/opt/dashplay/`，确定不用了再手动删除。

## ZTE F50（MU300 OpenWrt）

F50 用厂商 5.4 内核，不能装系统的 `bluez-daemon`（它会带入 6.12 的内核模块）。DashPlay 自带 F50 的蓝牙启动程序，用独立目录里的 BlueZ：

```sh
python3 /opt/dashplay/board_zte_f50.py --setup      # 从 F50 自己的官方软件源生成 /opt/dashplay-bluez
uci set dashplay.main.bluetooth_service='/usr/bin/python3 /opt/dashplay/board_zte_f50.py'
uci set dashplay.main.dbus_address='unix:path=/var/run/dashplay/bluetooth/system_bus_socket'
uci commit dashplay && /etc/init.d/dashplay restart
```

F50 的 USB 口不能当主机，只能无线。原厂 B16 的备份、Root 和 SD OpenWrt 路线见 [AI 装机 skill](https://github.com/yizhixiaoheigou/DashPlay/blob/main/skills/dashplay-install/SKILL.md)。相关源码工具在主仓库；本仓库仍不分发原厂固件、设备备份或认证文件。

## 自己打包

需要 Docker（容器不需要特权、主机网络或设备）。

```sh
sh scripts/build-packages.sh out/                         # SDK 从 DashPlay 发布页下载程序包并校验
sh scripts/build-packages.sh out/ dashplay-bundle.tar     # 或用你自己构建的程序包
sh scripts/lab-test.sh out/                               # 在干净的 OpenWrt 25.12.5 容器里安装、启动、检查、卸载
```

也可以把本仓库当软件源：在 OpenWrt SDK 的 `feeds.conf` 里加 `src-git dashplay https://github.com/yizhixiaoheigou/openwrt-dashplay.git`。依赖只写成运行依赖（`EXTRA_DEPENDS`），打包时不会编译 Python 或内核模块。

DashPlay 发布新版本后，下载它的 `dashplay-bundle-<版本>.tar`，运行 `sh scripts/bump-dashplay.sh <版本> dashplay-bundle-<版本>.tar` 更新 `dashplay/Makefile` 的版本与校验值，再打包。

## 许可与商标

GPL-3.0，见 [LICENSE](LICENSE) 与 [NOTICE.md](NOTICE.md)。CarPlay、iPhone、AirPlay 和 MFi 是 Apple Inc. 的商标；本项目与 Apple 无从属或背书关系。

## 升级现有设备

按 [装机 skill 的“升级已装好的盒子”](https://github.com/yizhixiaoheigou/DashPlay/blob/main/skills/dashplay-install/SKILL.md) 先把程序、设置、配对与认证备份到电脑，再用 `apk update && apk add --upgrade --simulate --allow-untrusted /tmp/dashplay-upgrade/*.apk` 检查本次四个包（先 `apk update`，试运行才能看到联网时会一起升级的依赖），确认后去掉 `--simulate` 执行。不要卸载重装或覆盖 state/identity。F50 保留独立 BlueZ，出现内核/kmod 升级计划就停止。特斯拉模式运行中每 10 秒检查上游地址冲突，设置页和 LuCI 会显示警告；不会自动变更网络。
