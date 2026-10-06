'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Pipeline=require('../scripts/optimize-sprint12-art'),plan=require('../assets/source/card-art-012/jobs-plan.json'),catalog=require('../balance').dataFor('sprint11').CARDS;
const copy=value=>JSON.parse(JSON.stringify(value));
test('art source plan maps all seventy-nine weak scenes, nine role repairs and three compatible reuses exactly once',()=>{
  const entries=Pipeline.validatePlan(plan,catalog);
  assert.equal(entries.length,91);assert.equal(plan.jobs.length,23);assert.equal(new Set(entries.map(e=>e.id)).size,91);
  assert.equal(entries.filter(e=>catalog[e.id].set==='tactical-011').length,40);
  assert.equal(entries.filter(e=>catalog[e.id].set!=='tactical-011'&&['order','asset'].includes(catalog[e.id].type)).length,39);
  assert.equal(entries.filter(e=>e.reuse).length,3);
  assert.equal(plan.jobs.filter(j=>j.grid===1).length,1);assert.equal(plan.jobs.find(j=>j.grid===1).cells[0].cardIds[0],'bruiser_surge_drummers');
  assert.equal(plan.jobs.find(j=>j.name==='stonewall-legacy-b').cells.find(c=>c.cell===3).cardIds.length,3);
  assert.ok(entries.every(e=>['C','D'].includes(e.classificationBefore)),'A-quality source art is preserved rather than regenerated without need');
});
test('exact square cell extraction floors dimensions and never enlarges undersized sources',()=>{
  assert.deepEqual(Pipeline.cellCrop({width:1254,height:1254},2,0),{left:0,top:0,width:627,height:627});
  assert.deepEqual(Pipeline.cellCrop({width:1255,height:1255},2,3),{left:627,top:627,width:627,height:627});
  assert.deepEqual(Pipeline.cellCrop({width:1254,height:1254},1,0),{left:0,top:0,width:1254,height:1254});
  assert.throws(()=>Pipeline.cellCrop({width:1023,height:1023},2,0),/upscale/);
  assert.throws(()=>Pipeline.cellCrop({width:1536,height:1024},2,0),/square/);
  for(const cell of [-1,4,.5])assert.throws(()=>Pipeline.cellCrop({width:1254,height:1254},2,cell),/coordinates/);
  assert.throws(()=>Pipeline.cellCrop({width:1254,height:1254},3,0),/coordinates/);
});
test('source plan rejects missing, duplicate, unknown or malformed card metadata before runtime writes',()=>{
  const mutations=[
    p=>p.jobs[0].cells[0].cardIds.push('commander_stonewall_warden'),
    p=>p.jobs[0].cells[0].cardIds.push(p.jobs[0].cells[1].cardIds[0]),
    p=>p.jobs[0].cells[0].cardIds=[],
    p=>p.jobs[0].cells[0].position='center; background-image:url(https://example.invalid)',
    p=>p.jobs[0].cells[0].position='50% 101%',
    p=>p.jobs[0].cells[0].reason='',
    p=>p.jobs[0].cells[0].classificationBefore='finished',
    p=>p.jobs[0].cells[0].cell=5,
    p=>p.jobs[0].cells[1].cell=p.jobs[0].cells[0].cell,
    p=>p.jobs[0].name='../unsafe',
    p=>p.jobs[0].source='assets/source/card-art-012/../../unsafe.png',
    p=>p.reuse[0].crop.width=513,
    p=>p.reuse[0].crop.left=-1,
    p=>p.expectedCardCount=92,
    p=>p.expectedSourceJobs=22
  ];
  for(const mutate of mutations){const malformed=copy(plan);mutate(malformed);assert.throws(()=>Pipeline.validatePlan(malformed,catalog));}
});
test('local asset destinations and focal positions cannot escape the approved namespace',()=>{
  assert.ok(Pipeline.projectFile('assets/cards/refined-012/stonewall/stonewall_dig_in.webp','assets/cards/refined-012').endsWith('stonewall_dig_in.webp'));
  for(const unsafe of ['C:/outside/master.png','assets/source/card-art-012/../outside.png','assets\\source\\card-art-012\\master.png'])assert.throws(()=>Pipeline.projectFile(unsafe,'assets/source/card-art-012'));
  assert.equal(Pipeline.position('50% 0%'),'50% 0%');assert.equal(Pipeline.position('49.5% 30.5%'),'49.5% 30.5%');
  for(const unsafe of ['-1% 0%','50% 120%','50%','center','url(unsafe)'])assert.throws(()=>Pipeline.position(unsafe));
});
test('every generated master preserves its exact executed prompt and original returned file path',()=>{
  const provenance=Pipeline.promptProvenance(plan);
  assert.equal(provenance.status,'complete-execution-provenance');
  assert.equal(provenance.exactExecutedPrompts.length,23);
  assert.deepEqual(provenance.missingExecutionRecords,[]);
  for(const record of provenance.exactExecutedPrompts){
    assert.ok(record.executedPrompt.length>100);
    assert.ok(record.sourceGeneratedPath?.endsWith('.png'),'exact original tool path remains recorded: '+record.source);
    assert.ok(record.outputHint===null||typeof record.outputHint==='string','missing historic tool hints are explicit, not fabricated');
    if(record.outputHint===null)assert.match(record.outputHintNote,/not retained.*prompt.*PNG path/i);
    assert.ok(record.recordLog.startsWith('assets/source/card-art-012/generation-'));
  }
  const pilot=provenance.exactExecutedPrompts.find(r=>r.source.endsWith('stonewall-tactical-a.png'));
  assert.equal(pilot.matchesDesignPlan,false,'actual pilot wording is preserved independently from the later design plan');
});
