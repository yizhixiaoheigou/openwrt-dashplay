#!/bin/sh
# Move the dashplay package to a DashPlay release: its version, the release's program bundle hash, and
# release 1 of the package.
#   sh scripts/bump-dashplay.sh VERSION dashplay-bundle-VERSION.tar
# The bundle is the one attached to the DashPlay release vVERSION (download it first).
set -eu
version=${1:?Usage: bump-dashplay.sh VERSION dashplay-bundle-VERSION.tar}
bundle=${2:?Usage: bump-dashplay.sh VERSION dashplay-bundle-VERSION.tar}
echo "$version" | grep -Eq '^[0-9]{4}\.[0-9]{1,2}\.[0-9]{1,2}(\.[0-9]+)?$' || { echo "version like 2026.10.12" >&2; exit 1; }
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -f "$here/../dashplay/Makefile" ]; then makefile="$here/../dashplay/Makefile"; else makefile="$here/../../openwrt/dashplay/Makefile"; fi
tar -tf "$bundle" ./supervisor_openwrt.py >/dev/null 2>&1 || { echo "$bundle is not a DashPlay program bundle" >&2; exit 1; }
hash=$(sha256sum "$bundle" | cut -d" " -f1)
sed -i -e "s/^PKG_VERSION:=.*/PKG_VERSION:=$version/" -e "s/^PKG_RELEASE:=.*/PKG_RELEASE:=1/" \
    -e "s/^PKG_HASH:=.*/PKG_HASH:=$hash/" "$makefile"
grep -E '^PKG_(VERSION|RELEASE|HASH):=' "$makefile"
