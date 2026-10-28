#!/usr/bin/env bash
set -euo pipefail
# Run on the authorized Ubuntu VM, with an explicitly reviewed source commit.
commit=${1:?Usage: sudo bash install-vm.sh <40-character source commit>}
[[ "$commit" =~ ^[0-9a-f]{40}$ ]] || exit 2
[[ $(id -u) == 0 ]] || { echo 'Run as root on the target VM'; exit 2; }
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y --no-install-recommends ca-certificates curl xz-utils git time logrotate
id esim-worker >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/esim-worker --shell /usr/sbin/nologin esim-worker
install -d -m 0755 /opt/esim-worker/releases /etc/esim-worker
install -d -o esim-worker -g esim-worker -m 0700 /var/lib/esim-worker /var/log/esim-worker
if [[ ! -x /opt/esim-worker/node/bin/node ]]; then
 work=$(mktemp -d)
 trap 'rm -rf "$work"' EXIT
 curl --fail --show-error --silent --location https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$work/SHASUMS256.txt"
 archive=$(awk '$2 ~ /linux-x64.tar.xz$/ {print $2}' "$work/SHASUMS256.txt")
 [[ "$archive" =~ ^node-v22\.[0-9]+\.[0-9]+-linux-x64.tar.xz$ ]] || exit 3
 curl --fail --show-error --silent --location "https://nodejs.org/dist/latest-v22.x/$archive" -o "$work/$archive"
 (cd "$work" && awk -v file="$archive" '$2 == file' SHASUMS256.txt | sha256sum -c -)
 install -d /opt/esim-worker/node
 tar -xJf "$work/$archive" --strip-components=1 -C /opt/esim-worker/node
fi
release="/opt/esim-worker/releases/$commit"
if [[ ! -d "$release/.git" ]]; then
 git clone --no-checkout --filter=blob:none https://github.com/brunopike/pancake-depth-viewer.git "$release"
 git -C "$release" checkout --detach "$commit"
fi
[[ $(git -C "$release" rev-parse HEAD) == "$commit" ]] || exit 4
export PATH=/opt/esim-worker/node/bin:$PATH
(cd "$release" && npm ci --omit=dev --no-audit --no-fund)
[[ ! -e "$release/.goodway" ]] && ln -s /var/lib/esim-worker "$release/.goodway"
chown -R esim-worker:esim-worker "$release/.git" "$release/public/data"
cat > /opt/esim-worker/git-credential-env <<'CREDENTIAL'
#!/bin/sh
if [ "$1" = get ]; then
 printf 'username=x-access-token\npassword=%s\n' "$GITHUB_TOKEN"
fi
CREDENTIAL
chmod 0755 /opt/esim-worker/git-credential-env
cat > /etc/logrotate.d/esim-worker <<'LOGROTATE'
/var/log/esim-worker/worker.log {
 daily
 maxsize 10M
 rotate 7
 compress
 delaycompress
 missingok
 notifempty
 copytruncate
 su esim-worker esim-worker
}
LOGROTATE
ln -sfn "$release" /opt/esim-worker/current
sed "s|@RELEASE_PATH@|$release|g" "$release/scripts/esim/deploy/esim-worker.service" > /etc/systemd/system/esim-worker.service
chmod 0644 /etc/systemd/system/esim-worker.service
systemctl daemon-reload
echo 'Installed reviewed collector. Configure /etc/esim-worker/worker.env and verify database migration before starting.'
echo 'No service was started; the current production writers are unchanged.'
