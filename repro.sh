#!/usr/bin/env bash
# runs outside Git Bash: on a macOS GitHub Actions runner
#
# A new community-template app, built for an iOS simulator in Debug with
# RCT_METRO_PORT=8090, launched against Metro on 8090 (--port 8090) and a
# listener on 8081 that logs each request and answers 404.
#
# Exit status: 1 while the app asks port 8081, 0 when it loads its bundle from
# Metro on 8090 and asks nothing of 8081, 2 when a step fails or neither shows.
#
# RN_VERSION (default 0.88.1) picks the release; RCT_USE_PREBUILT_RNCORE=0
# builds React Native's core from source instead of the prebuilt default.
# REPRO_VERDICT_ONLY=<dir> skips the run and judges the logs already in <dir>.
set -u

PORT=8090
APP=PortRepro
RN_VERSION="${RN_VERSION:-0.88.1}"
OUT="${OUT:-$PWD/out}"

step() { printf '\n== %s\n' "$*"; }

inconclusive() {
  echo "STEP FAILED: $*"
  echo "RESULT: inconclusive, a step failed ($*)"
  exit 2
}

verdict() {
  local dir="$1" asked8081 served8090
  asked8081=$(grep -c '^8081 ' "$dir/port8081.log" 2>/dev/null) || asked8081=0
  served8090=$(grep -c '^metro GET /index.bundle' "$dir/metro.log" 2>/dev/null) || served8090=0
  step "requests"
  echo "listener on 8081 got ${asked8081} request(s):"
  sed 's/^/  /' "$dir/port8081.log" 2>/dev/null
  echo "Metro on ${PORT} got ${served8090} bundle request(s):"
  { grep '^metro ' "$dir/metro.log" 2>/dev/null || true; } | sed 's/^/  /'
  if [ "$served8090" -gt 0 ] && [ "$asked8081" -eq 0 ]; then
    echo "RESULT: built with RCT_METRO_PORT=${PORT}, the app loaded its bundle from Metro on ${PORT} and asked nothing of 8081"
    exit 0
  fi
  if [ "$asked8081" -gt 0 ]; then
    echo "RESULT: built with RCT_METRO_PORT=${PORT}, the app asked port 8081 (${asked8081} request(s)) and Metro on ${PORT} got ${served8090} bundle request(s)"
    exit 1
  fi
  echo "RESULT: inconclusive, the app asked neither port 8081 nor Metro on ${PORT} for a bundle"
  exit 2
}

if [ -n "${REPRO_VERDICT_ONLY:-}" ]; then
  verdict "$REPRO_VERDICT_ONLY"
fi

mkdir -p "$OUT/work" || inconclusive "mkdir $OUT/work"
WORK="$OUT/work"

step "versions"
os_name=$(sw_vers -productName) || os_name="?"
os_version=$(sw_vers -productVersion) || os_version="?"
xcode=$(xcodebuild -version) || xcode="?"
node_version=$(node -v) || node_version="?"
echo "System: ${os_name} ${os_version}, ${xcode//$'\n'/ }, node ${node_version}"
echo "react-native ${RN_VERSION}, RCT_USE_PREBUILT_RNCORE=${RCT_USE_PREBUILT_RNCORE:-unset (template default)}"

step "npx @react-native-community/cli init ${APP} --version ${RN_VERSION}"
(cd "$WORK" && npx --yes @react-native-community/cli@latest init "$APP" --version "$RN_VERSION" \
  --skip-git-init --install-pods false) > "$OUT/init.log" 2>&1 || { tail -40 "$OUT/init.log"; inconclusive "init"; }
APPDIR="$WORK/$APP"
node -p "'react-native in package.json: ' + require('$APPDIR/package.json').dependencies['react-native']"

# Log each request Metro's own middleware sees, so a bundle request shows in metro.log.
cat > "$APPDIR/metro.config.js" <<'EOF'
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {
  server: {
    enhanceMiddleware: middleware => (req, res, next) => {
      console.log(`metro ${req.method} ${req.url}`);
      return middleware(req, res, next);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
EOF

step "bundle exec pod install"
(cd "$APPDIR/ios" && bundle install && bundle exec pod install) > "$OUT/pod.log" 2>&1 || { tail -40 "$OUT/pod.log"; inconclusive "pod install"; }
grep -m6 -E '\[ReactNativeCore\]|\[ReactNativeDependencies\]' "$OUT/pod.log" || true
sources=$(find "$APPDIR/ios/Pods" -name RCTBundleURLProvider.mm) || sources=""
echo "RCTBundleURLProvider.mm sources in Pods: ${sources:-none}"

step "xcodebuild Debug for the simulator with RCT_METRO_PORT=${PORT}"
(cd "$APPDIR/ios" && xcodebuild -workspace "$APP.xcworkspace" -scheme "$APP" -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath "$OUT/dd" \
  RCT_METRO_PORT="$PORT" build) > "$OUT/build.log" 2>&1 || { grep -m20 -E 'error:' "$OUT/build.log"; inconclusive "xcodebuild"; }
compiled=$(grep -c '^CompileC .*RCTBundleURLProvider\.mm' "$OUT/build.log") || compiled=0
defined=$(grep -c -- "-DRCT_METRO_PORT=${PORT}" "$OUT/build.log") || defined=0
echo "compile steps for RCTBundleURLProvider.mm: ${compiled}"
echo "compiler invocations with -DRCT_METRO_PORT=${PORT}: ${defined}"
grep -m1 -o 'Skipping bundling[^.]*' "$OUT/build.log" || true
APP_PATH="$OUT/dd/Build/Products/Debug-iphonesimulator/$APP.app"
[ -d "$APP_PATH" ] || inconclusive "no $APP_PATH"
BUNDLE_ID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP_PATH/Info.plist") || inconclusive "bundle id"

step "listener on 8081"
cat > "$OUT/listen8081.py" <<'EOF'
import http.server, socket

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        print(f"8081 {self.command} {self.path}", flush=True)
        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()
    do_POST = do_HEAD = do_GET
    def log_message(self, *args):
        pass

class Server(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()

Server(("::", 8081), Handler).serve_forever()
EOF
python3 -u "$OUT/listen8081.py" > "$OUT/port8081.log" 2> "$OUT/listen8081.err" &
LISTENER=$!

step "npx react-native start --port ${PORT}"
(cd "$APPDIR" && exec npx react-native start --port "$PORT" --no-interactive) > "$OUT/metro.log" 2>&1 &
METRO=$!
trap 'kill "$LISTENER" "$METRO" 2>/dev/null' EXIT
status=""
for _ in $(seq 1 60); do
  status=$(curl -s "http://localhost:${PORT}/status") && [ "$status" = "packager-status:running" ] && break
  sleep 2
done
echo "curl http://localhost:${PORT}/status -> ${status:-nothing}"
[ "$status" = "packager-status:running" ] || inconclusive "Metro did not start on ${PORT}"
code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/status) || code=none
echo "curl http://localhost:8081/status -> HTTP ${code}"
: > "$OUT/port8081.log"

step "simulator"
devices=$(xcrun simctl list devices available -j) || inconclusive "simctl list"
SIM=$(printf '%s' "$devices" | python3 -c '
import json, sys
d = json.load(sys.stdin)["devices"]
rts = sorted((k for k in d if "iOS" in k), key=lambda k: [int(x) for x in k.rsplit("iOS-", 1)[1].split("-")])
for rt in reversed(rts):
    for dev in d[rt]:
        if dev["name"].startswith("iPhone"):
            print(dev["udid"], rt, dev["name"]); sys.exit()
sys.exit(1)
') || inconclusive "no iPhone simulator"
echo "simulator: $SIM"
UDID=${SIM%% *}
xcrun simctl boot "$UDID" 2>/dev/null
xcrun simctl bootstatus "$UDID" -b > /dev/null || inconclusive "simulator boot"
xcrun simctl install "$UDID" "$APP_PATH" || inconclusive "install"

step "launch ${BUNDLE_ID}"
xcrun simctl launch "$UDID" "$BUNDLE_ID" || inconclusive "launch"
sleep 60
xcrun simctl io "$UDID" screenshot "$OUT/screen.png" > /dev/null 2>&1
xcrun simctl spawn "$UDID" log show --last 3m --style compact --predicate "process == \"$APP\"" > "$OUT/app.log" 2>&1
grep -m3 -oE 'No script URL provided[^"]*|Could not connect to development server[^"]*' "$OUT/app.log" || true

verdict "$OUT"
