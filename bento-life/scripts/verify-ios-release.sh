#!/bin/sh
set -eu
if [ "${CONFIGURATION:-}" != 'Release' ] && [ "${ACTION:-}" != 'install' ] && [ "${ACTION:-}" != 'archive' ]; then exit 0; fi
if ! command -v node >/dev/null 2>&1; then
  echo 'Node 22 is required on the Xcode build PATH for release verification.' >&2
  exit 1
fi
project_dir="${SRCROOT}/../.."
if [ "${1:-}" = 'packaged' ]; then
  node --experimental-strip-types "$project_dir/scripts/verify-release-native.ts" --app "$TARGET_BUILD_DIR/$WRAPPER_NAME"
else
  node --experimental-strip-types "$project_dir/scripts/verify-release-native.ts" --assets "$SRCROOT/App/public" --capacitor "$SRCROOT/App/capacitor.config.json"
fi
