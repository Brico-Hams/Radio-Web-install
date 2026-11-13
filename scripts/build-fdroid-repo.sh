#!/usr/bin/env bash
# Builds a signed F-Droid binary repository with the GitHub-signed RadiCodex APKs (flavor "github")
# of the newest android-v* releases, into <out>/repo. Needs fdroidserver, gh (GH_TOKEN), keytool and
# an Android SDK (ANDROID_HOME). Secrets come only from the environment and stay in a temp dir:
#   FDROID_KEYSTORE_BASE64, FDROID_KEYSTORE_PASS, FDROID_KEY_PASS, FDROID_KEY_ALIAS
# FDROID_DRY_RUN=1 signs with a throwaway key instead (CI validation; never published).
set -euo pipefail
out=${1:?usage: build-fdroid-repo.sh <out-dir>}
repo_url=${FDROID_REPO_URL:?FDROID_REPO_URL is required (public URL of <out>/repo)}
keep=${FDROID_KEEP:-3}
gh_repo=${GITHUB_REPOSITORY:?}
app=org.bricohams.radicodex
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/dl" "$work/repo" "$work/metadata/$app"

# 1. Signed APKs of the newest $keep stable android-v* releases, checked against their published SHA-256.
mapfile -t tags < <(gh release list -R "$gh_repo" --limit 100 --json tagName,isPrerelease,isDraft \
  --jq '.[] | select((.tagName | startswith("android-v")) and (.isPrerelease | not) and (.isDraft | not)) | .tagName' | head -n "$keep")
[ "${#tags[@]}" -gt 0 ] || { echo "::error::No android-v* release found"; exit 1; }
for tag in "${tags[@]}"; do
  version=${tag#android-v}
  if ! gh release download "$tag" -R "$gh_repo" -D "$work/dl" --clobber \
      -p "RadiCodex-$version.apk" -p "RadiCodex-$version.apk.sha256"; then
    echo "::warning::$tag has no signed APK; skipped"; continue
  fi
  (cd "$work/dl" && sha256sum -c "RadiCodex-$version.apk.sha256")
  cp "$work/dl/RadiCodex-$version.apk" "$work/repo/"
done
ls "$work"/repo/*.apk >/dev/null

# 2. Store metadata: the F-Droid recipe without its build/update sections, plus the fastlane texts.
python3 - "$root/fdroid/metadata/$app.yml" "$work/metadata/$app.yml" <<'PY'
import re, sys
drop = {"RepoType", "Repo", "Builds", "MaintainerNotes", "AutoUpdateMode", "UpdateCheckMode",
        "UpdateCheckData", "CurrentVersion", "CurrentVersionCode", "AllowedAPKSigningKeys"}
out, skip = [], False
for line in open(sys.argv[1], encoding="utf-8"):
    key = re.match(r"^([A-Za-z]+):", line)
    if key:
        skip = key.group(1) in drop
    elif line.strip().startswith("#") and not line.startswith(" "):
        skip = False
        continue
    if not skip:
        out.append(line)
open(sys.argv[2], "w", encoding="utf-8").write("".join(out))
PY
cp -r "$root/fastlane/metadata/android/." "$work/metadata/$app/"

# 3. Repository signing key (PKCS12 or JKS) and config, both only inside $work.
if [ "${FDROID_DRY_RUN:-0}" = 1 ]; then
  FDROID_KEY_ALIAS=dryrun FDROID_KEYSTORE_PASS=dryrun-pass FDROID_KEY_PASS=dryrun-pass
  keytool -genkeypair -noprompt -keystore "$work/keystore.p12" -storetype PKCS12 -alias dryrun \
    -keyalg RSA -keysize 4096 -validity 30 -dname "CN=dry run" -storepass dryrun-pass -keypass dryrun-pass >/dev/null
else
  : "${FDROID_KEYSTORE_BASE64:?}" "${FDROID_KEYSTORE_PASS:?}" "${FDROID_KEY_PASS:?}" "${FDROID_KEY_ALIAS:?}"
  (umask 077; printf '%s' "$FDROID_KEYSTORE_BASE64" | base64 -d > "$work/keystore.p12")
fi
export FDROID_KEY_ALIAS FDROID_KEYSTORE_PASS FDROID_KEY_PASS FDROID_REPO_URL
(umask 077; python3 - "$work/config.yml" <<'PY'
import json, os, sys
cfg = {
    "repo_url": os.environ["FDROID_REPO_URL"],
    "repo_name": "RadiCodex by BricoHams",
    "repo_description": "Signed RadiCodex APKs from github.com/Brico-Hams/Radio-Web-install releases (GitHub build, with OTA updater).",
    "archive_older": 0,
    "keystore": "keystore.p12",
    "repo_keyalias": os.environ["FDROID_KEY_ALIAS"],
    "keystorepass": os.environ["FDROID_KEYSTORE_PASS"],
    "keypass": os.environ["FDROID_KEY_PASS"],
    "sdk_path": os.environ.get("ANDROID_HOME") or os.environ["ANDROID_SDK_ROOT"],
}
# JSON is valid YAML and quotes every value safely.
open(sys.argv[1], "w", encoding="utf-8").write(json.dumps(cfg, indent=2) + "\n")
PY
)

# 4. Index, signed with the repo key.
(cd "$work" && fdroid update --pretty --use-date-from-apk)
fingerprint=$(keytool -list -v -keystore "$work/keystore.p12" -alias "$FDROID_KEY_ALIAS" -storepass "$FDROID_KEYSTORE_PASS" \
  | sed -n 's/^[[:space:]]*SHA256: //p' | tr -d ':' | tr 'A-F' 'a-f')
[ -n "$fingerprint" ] || { echo "::error::Could not read the repo key fingerprint"; exit 1; }
test -f "$work/repo/index-v1.jar" -a -f "$work/repo/entry.jar"

mkdir -p "$out"
rm -rf "$out/repo"
cp -r "$work/repo" "$out/repo"
printf '%s\n' "$fingerprint" > "$out/repo/fingerprint.txt"
cat > "$out/index.html" <<HTML
<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>RadiCodex F-Droid</title>
<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5">
<h1>Repositorio F-Droid de RadiCodex</h1>
<p>En F-Droid: <em>Ajustes &rarr; Repositorios &rarr; +</em> y pega esta direcci&oacute;n:</p>
<p><a href="${repo_url}?fingerprint=${fingerprint}"><code>${repo_url}</code></a></p>
<p>Huella (SHA-256) de la clave del repositorio: <code style="word-break:break-all">${fingerprint}</code></p>
<p>Son las APK firmadas de GitHub Releases (sabor <code>github</code>, con actualizador OTA). Si cambias entre esta fuente y otra, Android puede pedir desinstalar primero porque la firma es distinta.</p>
</body></html>
HTML
echo "F-Droid repo: ${#tags[@]} release(s), fingerprint $fingerprint -> $out/repo"
