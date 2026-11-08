import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertIOSMinimum } from './verify-ios-config.mjs';

class VerificationError extends Error {}

// Never print signing identifiers or captured entitlement contents.
export function verifySimulator(app) {
  const run = (command, args, input) => execFileSync(command, args, {
    encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'],
  });
  const plist = raw => JSON.parse(run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', '--', '-'], raw));
  const info = plist(readFileSync(join(app, 'Info.plist')));
  if (!info.CFBundleSupportedPlatforms?.includes('iPhoneSimulator')) throw new VerificationError('Expected a Simulator app.');
  try { assertIOSMinimum(info.MinimumOSVersion); }
  catch { throw new VerificationError('Packaged Simulator app must require iOS 16.0.'); }
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);
  // Xcode embeds Simulator entitlements in each Mach-O slice, not in the codesign blob.
  // Inspect the packaged executable itself; an intermediate .xcent alone is insufficient.
  const executable = join(app, info.CFBundleExecutable);
  const binary = readFileSync(executable);
  const architectures = run('/usr/bin/lipo', ['-archs', executable]).trim().split(/\s+/);
  const details = run('/usr/bin/lipo', ['-detailed_info', executable]);
  const bundle = info.CFBundleIdentifier;
  for (const architecture of architectures) {
    if (!/^[a-z0-9_]+$/.test(architecture)) throw new VerificationError('Unexpected Simulator architecture.');
    const slice = details.match(new RegExp('architecture ' + architecture + '\\s[\\s\\S]*?\\boffset (\\d+)'));
    const base = slice ? Number(slice[1]) : 0;
    const commands = run('/usr/bin/otool', ['-arch', architecture, '-l', executable]);
    const section = commands.match(/sectname __entitlements\s+segname __TEXT\s+addr \S+\s+size (\S+)\s+offset (\d+)/);
    if (!section) throw new VerificationError('Simulator embedded entitlements are missing; Keychain login cannot be verified.');
    const size = Number(section[1]);
    const start = base + Number(section[2]);
    if (!Number.isSafeInteger(size) || size <= 0 || size > 1024 * 1024 || start + size > binary.length) {
      throw new VerificationError('Invalid Simulator entitlement section.');
    }
    const identifier = plist(binary.subarray(start, start + size))['application-identifier'];
    if (typeof identifier !== 'string' || typeof bundle !== 'string'
        || !(identifier === bundle || identifier.endsWith('.' + bundle))) {
      throw new VerificationError('Simulator application-identifier entitlement is missing or mismatched.');
    }
  }
  const config = JSON.parse(readFileSync(join(app, 'capacitor.config.json'), 'utf8'));
  if ((config.ios?.loggingBehavior ?? config.loggingBehavior) !== 'none') {
    throw new VerificationError('Native bridge logging must be disabled before login.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    verifySimulator(process.argv[2] ?? 'build/ios-simulator/Build/Products/Debug-iphonesimulator/App.app');
    console.log('Simulator signature, application identifier and disabled bridge logging verified.');
  } catch (error) {
    // Child process errors may contain diagnostic payloads; expose only our controlled checks.
    console.error(error instanceof VerificationError ? error.message : 'Simulator signature/entitlement inspection failed.');
    process.exitCode = 1;
  }
}
