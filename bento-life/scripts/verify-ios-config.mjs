import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const IOS_MINIMUM = '16.0';

export function assertIOSMinimum(value) {
  if (typeof value !== 'string' || !/^16(?:\.0){0,2}$/.test(value)) {
    throw new Error('App MinimumOSVersion must match the supported iOS 16.0 baseline.');
  }
}

export function assertIOSConfiguration(project, swiftPackage) {
  const targets = [...project.matchAll(/\bIPHONEOS_DEPLOYMENT_TARGET\s*=\s*"?([0-9.]+)"?\s*;/g)];
  // Project and App each have Debug/Release settings. A missing declaration is not a pass.
  if (targets.length < 4) throw new Error('Missing iOS deployment declarations; inspect project and App Debug/Release.');
  for (const target of targets) assertIOSMinimum(target[1]);
  if (!/platforms:\s*\[\s*\.iOS\(\.v16\)\s*\]/.test(swiftPackage)) {
    throw new Error('Generated CapApp-SPM minimum must be iOS 16. Run cap sync ios after correcting the Xcode deployment targets.');
  }
}

export function verifyIOSConfiguration(root = process.cwd()) {
  assertIOSConfiguration(
    readFileSync(join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8'),
    readFileSync(join(root, 'ios/App/CapApp-SPM/Package.swift'), 'utf8'),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const isOtherPlatform = process.argv.includes('--hook') && process.env.CAPACITOR_PLATFORM_NAME !== 'ios';
  if (!isOtherPlatform) {
    try {
      verifyIOSConfiguration();
      console.log(`Project, App and generated SPM minimum iOS ${IOS_MINIMUM} verified.`);
    } catch (error) {
      // Only source configuration is checked; never print signing configuration or identifiers.
      console.error(error instanceof Error && !('code' in error) ? error.message : 'Unable to inspect iOS minimum-version configuration.');
      process.exitCode = 1;
    }
  }
}
