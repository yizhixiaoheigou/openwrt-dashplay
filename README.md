# openwrt-dashplay

[DashPlay](https://github.com/yizhixiaoheigou/DashPlay) 的 OpenWrt 软件包：在 OpenWrt 25.12 路由器或随身 WiFi 上接收 iPhone 的 CarPlay，车机或任何设备用浏览器显示、出声、触控。

- `dashplay`：程序与开机服务（`/opt/dashplay`、`/etc/init.d/dashplay`、`/etc/config/dashplay`），各架构通用。程序本身来自 DashPlay 每次发布附带的 `dashplay-bundle-<版本>.tar`（`dashplay/Makefile` 里的 `PKG_SOURCE_URL` 与 `PKG_HASH`），本仓库不另存一份源码。
- `dashplay-jre`：Eclipse Temurin 21 JRE 的 musl 版（OpenWrt 没有 Java），aarch64 与 x86_64。
- `luci-app-dashplay`（含中文）：后台「服务 → DashPlay」。

**不懂技术也能装**：买好斐讯 N1、玩客云、ZTE F50（已刷 OpenWrt）或其他 OpenWrt 路由器后，把下面这句话发给你的 AI 助手（Claude Code、Codex 等能在电脑上执行命令的那种），它会问清楚你的设备，一步步帮你装好，只在需要你插拔电源、在手机上点选时叫你：

> 请阅读 https://github.com/yizhixiaoheigou/DashPlay/blob/main/skills/dashplay-install/SKILL.md ，按它一步步帮我把 DashPlay 装好。

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
apk add --allow-untrusted dashplay-jre-*.apk dashplay-2*.apk luci-app-dashplay-*.apk luci-i18n-dashplay-zh-cn-*.apk
# 无线 CarPlay（蓝牙）；用 USB 蓝牙棒时再加 kmod-btusb：
apk add bluez-daemon
# 有线 CarPlay（数据线）：
apk add kmod-tun
```

`dashplay-jre` 选和路由器一致的那个（`cat /etc/apk/arch` 看架构，例如 `aarch64_cortex-a53`）。包没有签名，所以要加 `--allow-untrusted`。

## 3. 放入 CarPlay 认证文件

把 DashPlay 的 [给 AI 助手的安装说明](https://github.com/yizhixiaoheigou/DashPlay/blob/main/docs/DashPlay-AI安装说明.md) 和你的两个文件交给你的 AI 助手，告诉它路由器地址和 SSH 用户名、密码；文件放在 `/opt/dashplay/identity/offline-mfi/`。放好后 DashPlay 自动开始工作。

## 4. 设置与使用

1. OpenWrt 后台「服务 → DashPlay」：看运行状态，选「交给 iPhone 的 WiFi」（默认自动：第一个开着的热点，优先 5 GHz）。
2. 点「DashPlay 设置（添加 iPhone）」打开设置页（`http://路由器地址:18080/`），在车机屏幕上添加 iPhone：iPhone 打开「设置 → 蓝牙」并停在那一页，核对六位数字后两边确认。插数据线的话，第一次在 iPhone 上点「信任」即可。
3. 车机连路由器的 WiFi，浏览器打开 `https://dashplay.lan:18443/`（也可以用 `https://路由器地址:18443/`）。提示证书不安全时点「继续访问」。

WiFi 名称、密码或信道在后台改了以后，DashPlay 会自动跟着改，不用重装。

**路由器作为客户端连车机热点或随身 WiFi 时**：车机不经过路由器的 DNS，只能用 `https://路由器在那个网络里的地址:18443/`；而且那个网络要放进允许入站的防火墙区域（默认的 wan 区域会拒绝 iPhone 的连接，设置页会提示）。

车机浏览器打不开或拦截证书时，见 [AI 安装说明](https://github.com/yizhixiaoheigou/DashPlay/blob/main/docs/DashPlay-AI安装说明.md) 第 4 节「车机浏览器打不开时」。

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

F50 的 USB 口不能当主机，只能无线。本仓库不包含为 F50 刷入 OpenWrt 的任何工具或固件。

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
