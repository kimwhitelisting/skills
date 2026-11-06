#!/bin/bash
set -euo pipefail
mkdir -p build
exec > >(tee build/xcodebuild-simulator.log) 2>&1
xcodebuild -version
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
xcodebuild build -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/ios-simulator CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO
test -d build/ios-simulator/Build/Products/Debug-iphonesimulator/App.app
/usr/bin/ditto -c -k --sequesterRsrc --keepParent \
  build/ios-simulator/Build/Products/Debug-iphonesimulator/App.app build/NyamnyamJoljol-Simulator.zip
