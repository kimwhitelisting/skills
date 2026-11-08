import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('excludes only the pinned secure credential prefs from all three Android backup paths', () => {
  const root = new URL('../android/app/src/main/', import.meta.url);
  const manifest = readFileSync(new URL('AndroidManifest.xml', root), 'utf8');
  expect(manifest).toContain('android:allowBackup="true"');
  expect(manifest).toContain('android:fullBackupContent="@xml/backup_rules"');
  expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"');
  const legacy = readFileSync(new URL('res/xml/backup_rules.xml', root), 'utf8');
  const modern = readFileSync(new URL('res/xml/data_extraction_rules.xml', root), 'utf8');
  const exclusion = '<exclude domain="sharedpref" path="WSSecureStorageSharedPreferences.xml" />';
  expect(legacy.match(/<exclude\b[^>]*>/g)).toEqual([exclusion]);
  for (const section of ['cloud-backup', 'device-transfer']) {
    const block = modern.match(new RegExp(`<${section}>([\\s\\S]*?)</${section}>`))?.[1];
    expect(block?.match(/<exclude\b[^>]*>/g)).toEqual([exclusion]);
  }
  expect(modern.match(/<exclude\b[^>]*>/g)).toHaveLength(2);
  expect(legacy + modern).not.toMatch(/<include\b|CapacitorStorage\.xml|bento-life|bento-cloud/);
});
