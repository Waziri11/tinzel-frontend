import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const coverage=JSON.parse(fs.readFileSync(new URL('../docs/ui-redesign/production-coverage.json',import.meta.url)));
test('every approved view and state maps to real application code in both languages and viewport sizes',()=>{
 assert.equal(coverage.views,111);assert.equal(coverage.states,438);assert.equal(new Set(coverage.entries.map(e=>e.id)).size,438);
 for(const row of coverage.entries){assert.ok(fs.existsSync(new URL('../'+row.component,import.meta.url)),row.id);assert.match(row.route,/^\//);assert.ok(!row.route.includes('--'));assert.deepEqual(row.languages,['en','sw']);assert.deepEqual(row.viewports,[1440,390]);}
});
