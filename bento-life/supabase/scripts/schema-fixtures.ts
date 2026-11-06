/** Read-only game simulation; emits synthetic snapshots to the caller's output path. */
import { writeFileSync } from 'node:fs';
import { playthrough } from '../../tests/sim.ts';
import { captureCheckpoint } from '../../src/game/checkpoint.ts';
import { schema } from './snapshot-schema.ts';
import { available } from '../../src/game/bento.ts';
const destination = process.argv.at(-1)!;
if (!destination.endsWith('.json')) throw Error('Pass an output .json path');
const samples: unknown[] = [];
const seen = new Set<string>();
for (let seed = 1; seed <= 100; seed++) {
  playthrough(seed, 'random', undefined, undefined, run => {
    const key = `${run.age}:${run.step}:${run.today?.phase}:${run.endingId}:${run.active?.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    samples.push(JSON.parse(JSON.stringify({version:1,run,dex:{menus:[],endings:[],events:[],plays:1,hearts:123,owned:[],equip:{},photos:{}},prefs:{sound:true,haptics:true,music:true,seenTips:[],tuning:{},seenIntro:true,seenDragHint:false}})));
  });
}
// UI-only payloads are not emitted by the headless engine simulation.
const uiPhoto = {id:'d-baby',age:0,gender:'boy',expr:'happy',caption:'한글 사진 🍱',name:'테스트',theme:'theme-test',hat:'hat-test'};
const photos: any = structuredClone(samples[0]);
photos.run.photos=[uiPhoto]; photos.dex.photos={'d-baby':uiPhoto};
photos.run.eventLog=[{age:0,id:'test',expr:'happy',caption:'한글',kind:'milestone'}];
captureCheckpoint(photos.run,{eventResult:{id:'test',emoji:'🍱',title:'결과',text:'테스트',delta:{bond:1},money:0,kind:'milestone'}});
samples.push(photos);
const morning: any = structuredClone(samples.find((s:any)=>s.run.today?.phase==='morning'));
captureCheckpoint(morning.run,{morning:{draft:{base:available(morning.run,'base')[0].id},tab:'base',lastPick:available(morning.run,'base')[0].id,timer:12.75}});
samples.push(morning);
const following: any = structuredClone(samples.find((s:any)=>s.run.today?.phase==='commute'));
const state={phase:'run',t:12,px:500,kx:690,walking:false,lastMoveT:11,slow:0.2,kidState:'look',kidTimer:0.5,nextLook:4,fakeOut:false,sus:30,lostFor:0,score:44,nearMiss:1,covers:[{x:510,e:'🌳'}],crises:[],crisisLeft:1.25,log:['event'],bond:1,indep:2,happy:0,deliverLeft:0,events:[{at:0.2,kind:'dog'}],dog:{left:3,bark:0.5},newsLeft:0,newsUsed:false,heartAcc:0.4,moment:{rank:2,kind:'dog',text:'강아지'},stepAcc:0.2};
captureCheckpoint(following.run,{commute:{version:1,age:6,state}});
samples.push(following);
const { $defs, ...item } = schema;
writeFileSync(destination, JSON.stringify(samples));
writeFileSync(destination.replace('.json', '.schema.json'), JSON.stringify({$schema:schema.$schema,type:'array',items:item,$defs}));
console.log(JSON.stringify({samples:samples.length, file:destination}));
