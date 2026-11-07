#!/bin/bash
set -euo pipefail
mkdir -p build
exec > >(tee build/xcodebuild-simulator.log) 2>&1
xcodebuild -version
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
# Keep Xcode's Simulator entitlements: disabling signing breaks Keychain writes (-34018).
xcodebuild build -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/ios-simulator CODE_SIGN_IDENTITY="-" CODE_SIGNING_ALLOWED=YES
test -d build/ios-simulator/Build/Products/Debug-iphonesimulator/App.app
node scripts/verify-ios-simulator.mjs
/usr/bin/ditto -c -k --sequesterRsrc --keepParent \
  build/ios-simulator/Build/Products/Debug-iphonesimulator/App.app build/NyamnyamJoljol-Simulator.zip
