import { describe, expect, it } from 'vitest';
import { assertIOSConfiguration, assertIOSMinimum } from '../scripts/verify-ios-config.mjs';

const project = (versions = ['16.0', '16.0', '16.0', '16.0']) => versions.map(version => `IPHONEOS_DEPLOYMENT_TARGET = ${version};`).join('\n');
const spm = 'platforms: [.iOS(.v16)],';

describe('iOS supported baseline packaging', () => {
  it('accepts consistent project/target Debug and Release plus generated SPM', () => {
    expect(() => assertIOSConfiguration(project(), spm)).not.toThrow();
    expect(() => assertIOSMinimum('16.0')).not.toThrow();
  });
  it.each([0, 1, 2, 3])('rejects an old declaration in configuration %s', index => {
    const versions = ['16.0', '16.0', '16.0', '16.0'];
    versions[index] = '15.0';
    expect(() => assertIOSConfiguration(project(versions), spm)).toThrow('MinimumOSVersion');
  });
  it('rejects a sync-generated package reverted to the unsupported baseline', () => {
    expect(() => assertIOSConfiguration(project(), 'platforms: [.iOS(.v15)],')).toThrow('CapApp-SPM');
  });
  it('does not accept absent build settings or an unknown packaged minimum', () => {
    expect(() => assertIOSConfiguration('', spm)).toThrow('Missing');
    for (const value of [undefined, '15.0', '15.4', 'unknown', '17.0']) {
      expect(() => assertIOSMinimum(value)).toThrow('MinimumOSVersion');
    }
  });
});
