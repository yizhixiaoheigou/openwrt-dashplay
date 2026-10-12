#!/bin/sh
# Build the DashPlay packages for OpenWrt 25.12 (.apk) in the official SDK container:
#   dashplay and luci-app-dashplay (+ luci-i18n-dashplay-zh-cn): all architectures;
#   dashplay-jre: aarch64 (one package per OpenWrt aarch64 package architecture) and x86_64.
#   sh scripts/build-packages.sh OUT_DIR [dashplay-bundle.tar]
# Without a bundle the SDK downloads the DashPlay release named in dashplay/Makefile and checks its
# hash; with one (a DashPlay build not released yet) that file is used instead.
# Needs Docker; the container gets no privileges, host network or devices.
set -eu
out=$(realpath -m "${1:?Usage: build-packages.sh OUT_DIR [dashplay-bundle.tar]}")
bundle=${2:+$(realpath "$2")}
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# The packages sit at the top of openwrt-dashplay, or under openwrt/ in the private DashPlay workspace.
if [ -f "$here/../dashplay/Makefile" ]; then feed=$(CDPATH= cd -- "$here/.." && pwd); else feed=$(CDPATH= cd -- "$here/../../openwrt" && pwd); fi
image=${OPENWRT_SDK:-openwrt/sdk:x86-64-25.12.5}
# OpenWrt names aarch64 package architectures per CPU family; the JRE is the same for all of them.
jre_arches=${JRE_ARCHES:-"aarch64_generic aarch64_cortex-a53 aarch64_cortex-a72 aarch64_cortex-a76"}
version=$(sed -n 's/^PKG_VERSION:=//p' "$feed/dashplay/Makefile")
mkdir -p "$out"
# The Docker daemon may not see this checkout (a network mount): hand it local copies.
stage=$(mktemp -d "${TMPDIR:-/tmp}/dashplay-openwrt.XXXXXX")
trap 'rm -rf "$stage"' EXIT
mkdir "$stage/feed" "$stage/dl"
for package in dashplay dashplay-jre luci-app-dashplay; do cp -R "$feed/$package" "$stage/feed/"; done
local_hash=""
if [ -n "$bundle" ]; then
    cp "$bundle" "$stage/dl/dashplay-bundle-$version.tar"
    local_hash=$(sha256sum "$bundle" | cut -d" " -f1)
fi
mkdir -m 777 "$stage/out"
docker run --rm --cap-drop ALL --security-opt no-new-privileges \
    -v "$stage/feed:/feed:ro" -v "$stage/dl:/dl-local:ro" -v "$stage/out:/out" \
    -e JRE_ARCHES="$jre_arches" -e LOCAL_HASH="$local_hash" --entrypoint sh "$image" -c '
set -eu
cd /builder
# Only our feed and luci (for luci.mk and its host tools): dependencies are runtime-only (EXTRA_DEPENDS),
# so nothing from the package feeds is compiled.
echo "src-link dashplay /feed" >> feeds.conf.default
./scripts/feeds update luci dashplay >/dev/null 2>&1
./scripts/feeds install -p dashplay -a >/dev/null 2>&1
make defconfig >/dev/null 2>&1
cp /dl-local/* dl/ 2>/dev/null || true
build() { make "$@" V=s >/tmp/build.log 2>&1 || { grep -B5 -A5 "ERROR:\|Hash mismatch\|hash" /tmp/build.log | tail -40; exit 1; }; }
# A local bundle has its own hash; set it for this package only (the JRE keeps the one in its Makefile).
build package/dashplay/compile ${LOCAL_HASH:+PKG_HASH=$LOCAL_HASH}
build package/luci-app-dashplay/compile package/dashplay-jre/compile
cp bin/packages/*/dashplay/dashplay-2*.apk bin/packages/*/dashplay/luci-*.apk /out/
# The JRE package names no architecture in its file name: give each copy its own.
for jre in bin/packages/*/dashplay/dashplay-jre-*.apk; do cp "$jre" "/out/$(basename "$jre" .apk)_x86_64.apk"; done
for arch in $JRE_ARCHES; do
    rm -f bin/packages/*/dashplay/dashplay-jre-*.apk
    make package/dashplay-jre/clean >/dev/null 2>&1
    build package/dashplay-jre/compile JRE_CPU=aarch64 PKGARCH=$arch
    for jre in bin/packages/*/dashplay/dashplay-jre-*.apk; do cp "$jre" "/out/$(basename "$jre" .apk)_$arch.apk"; done
done
for apk in /out/*.apk; do
    echo "$(basename "$apk"): $(staging_dir/host/bin/apk adbdump "$apk" | sed -n "s/^  arch: //p")"
done
'
cp "$stage"/out/*.apk "$out"/
(cd "$out" && sha256sum *.apk > SHA256SUMS)
