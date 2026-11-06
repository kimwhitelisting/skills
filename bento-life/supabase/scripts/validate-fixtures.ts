/** Validate generated game snapshots without a database or credentials. */
import { Ajv2020 } from 'npm:ajv@8.20.0/dist/2020.js';
const [schemaPath, fixturesPath] = Deno.args;
if (!schemaPath || !fixturesPath) throw Error('Usage: validate-fixtures.ts snapshot.schema.json fixtures.json');
const schema = JSON.parse(await Deno.readTextFile(schemaPath));
const fixtures = JSON.parse(await Deno.readTextFile(fixturesPath));
const validate = new Ajv2020({ strict: false }).compile(schema);
for (const [index, value] of fixtures.entries()) {
  if (!validate(value)) throw Error(`Fixture ${index}: ${JSON.stringify(validate.errors)}`);
}
const bad = [null, [], {version:1,dex:{paidHearts:3},prefs:{}}, {version:1,dex:{},prefs:{access_token:'not-allowed'}}, {version:1,dex:{},prefs:{},user_id:'not-allowed'}, {version:1,run:{version:2},dex:{},prefs:{}}];
for (const value of bad) if (validate(value)) throw Error('Malformed or authority-bearing payload passed');
console.log(JSON.stringify({ valid: fixtures.length, invalidRejected: bad.length }));
