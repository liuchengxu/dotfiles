import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {reviewPacket,LIMIT_BYTES,parseArgs,loadInstalledSdk} from './closed-deepseek-review.mjs';

async function fixture(t) {
  const root=await mkdtemp(path.join(os.tmpdir(),'closed-review-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await writeFile(path.join(root,'packet.txt'),'SOURCE: contract and relevant implementation\n');
  await writeFile(path.join(root,'instructions.txt'),'Check the named contract.\n');
  return {root,options:{packet:path.join(root,'packet.txt'),instructions:path.join(root,'instructions.txt'),out:path.join(root,'out'),allowEgress:true}};
}
function fake(response={},inspect=()=>{}) {
  let calls=0;
  return {calls:()=>calls,loadSdk:async()=>({model:{provider:'zai',id:'glm-5.3'},versions:{pi:'mock',piAi:'mock'},complete:async(context,options)=>{
    calls++;inspect(context,options);
    options.onPayload({model:'glm-5.3',reasoning_effort:'high',max_tokens:24000});
    return {provider:'zai',model:'glm-5.3',providerThinkingLevel:'high',stopReason:'stop',usage:{input:10,output:5,cost:{total:0.1}},content:[{type:'thinking',thinking:'HIDDEN_REASONING'},{type:'text',text:'No confirmed defect. Coverage limited to the packet.'}],...response};
  }})};
}

test('requires explicit egress consent before any SDK access',async t=>{
  const {options}=await fixture(t);let touched=false;
  await assert.rejects(reviewPacket({...options,allowEgress:false},{loadSdk:async()=>{touched=true;}}),/EXPLICIT_EGRESS/);
  assert.equal(touched,false);
});
test('caps complete input at 80,000 bytes before SDK access',async t=>{
  const {options}=await fixture(t);await writeFile(options.packet,Buffer.alloc(LIMIT_BYTES));const sdk=fake();
  await assert.rejects(reviewPacket(options,sdk),/INPUT_TOO_LARGE/);assert.equal(sdk.calls(),0);
});
test('sends one fresh no-tool request and persists no reasoning',async t=>{
  const {options}=await fixture(t);const sdk=fake({},(context,options)=>{
    assert.deepEqual(context.tools,[]);assert.equal(context.messages.length,1);assert.equal(options.maxTokens,24000);assert.equal(options.reasoning,'high');assert.equal(options.maxRetries,0);assert.equal(options.timeoutMs,600000);
  });
  const receipt=await reviewPacket(options,sdk);assert.equal(sdk.calls(),1);assert.equal(receipt.status,'complete');
  for(const file of await readdir(options.out))assert.equal((await readFile(path.join(options.out,file),'utf8')).includes('HIDDEN_REASONING'),false);
});
test('rejects existing output without overwriting it',async t=>{
  const {options}=await fixture(t);await mkdir(options.out);await writeFile(path.join(options.out,'keep'),'KEEP');const sdk=fake();
  await assert.rejects(reviewPacket(options,sdk),/OUTPUT_ALREADY_EXISTS/);assert.equal(await readFile(path.join(options.out,'keep'),'utf8'),'KEEP');assert.equal(sdk.calls(),0);
});
test('rejects an unavailable or substituted requested model',async t=>{
  const {options}=await fixture(t);
  await assert.rejects(reviewPacket(options,{loadSdk:async()=>({model:{provider:'other',id:'other'}})}),/REQUESTED_MODEL_UNAVAILABLE/);
});
for(const [label,response,code] of [
  ['response model substitution',{model:'another-model'},'RESPONSE_IDENTITY_MISMATCH'],
  ['response provider substitution',{provider:'other-provider'},'RESPONSE_IDENTITY_MISMATCH'],
  ['empty final text',{content:[{type:'thinking',thinking:'HIDDEN_REASONING'}]},'EMPTY_RESPONSE'],
  ['truncated response',{stopReason:'length'},'TRUNCATED_RESPONSE'],
  ['tool request',{content:[{type:'toolCall',name:'read'}]},'INVALID_RESPONSE_CONTENT'],
])test(label,async t=>{
  const {options}=await fixture(t);const sdk=fake(response);await assert.rejects(reviewPacket(options,sdk),new RegExp(code));
  assert.equal(sdk.calls(),1);assert.equal((await readdir(options.out)).includes('review.md'),false);
  assert.equal(JSON.parse(await readFile(path.join(options.out,'manifest.json'),'utf8')).status,'failed');
});
test('timeout aborts one call without retry or fallback',async t=>{
  const {options}=await fixture(t);let calls=0;let aborted=false;
  await assert.rejects(reviewPacket(options,{timeoutMs:15,loadSdk:async()=>({model:{provider:'zai',id:'glm-5.3'},complete:async(_,options)=>{
    calls++;options.signal.addEventListener('abort',()=>{aborted=true;});return new Promise(()=>{});
  }})}),/TIMEOUT/);
  assert.equal(calls,1);assert.equal(aborted,true);
});
test('SDK error text cannot leak credentials',async t=>{
  const {options}=await fixture(t);
  await assert.rejects(reviewPacket(options,{loadSdk:async()=>{throw new Error('SECRET_API_KEY');}}),/SDK_OR_IO_FAILURE/);
  assert.equal((await readFile(path.join(options.out,'manifest.json'),'utf8')).includes('SECRET_API_KEY'),false);
});
test('payload identity, effort, and cap must be verified',async t=>{
  const {options}=await fixture(t);
  await assert.rejects(reviewPacket(options,{loadSdk:async()=>({model:{provider:'zai',id:'glm-5.3'},complete:async(_,options)=>{options.onPayload({model:'glm-5.3',reasoning_effort:'low',max_tokens:24000});}})}),/PAYLOAD_EFFORT_MISMATCH/);
});
test('CLI requires values and rejects unknown options',()=>{
  assert.throws(()=>parseArgs(['--packet']),/MISSING_ARGUMENT/);assert.throws(()=>parseArgs(['--fallback']),/UNKNOWN_ARGUMENT/);
});

test('installed SDK serialization uses one fake HTTP request and no tools',async()=>{
  const sdk=await loadInstalledSdk(undefined,AbortSignal.timeout(15000));let calls=0;
  const response=await sdk.complete({systemPrompt:'Fixture only.',messages:[{role:'user',content:'fixture',timestamp:1}],tools:[]},{apiKey:'test-placeholder',reasoning:'high',maxTokens:24000,maxRetries:0,timeoutMs:1000,onPayload(payload){
    assert.equal(payload.model,'glm-5.3');assert.equal(payload.reasoning_effort,'high');assert.equal(payload.max_tokens??payload.max_completion_tokens,24000);assert.equal(payload.tools?.length??0,0);
  },fetch:async()=>{
    calls++;
    const chunk=(delta,finish_reason=null,usage)=>({id:'fixture',object:'chat.completion.chunk',created:1,model:'glm-5.3',choices:[{index:0,delta,finish_reason}],...(usage?{usage}:{})});
    return new Response('data: '+JSON.stringify(chunk({role:'assistant',content:'FIXTURE_OK'}))+'\n\ndata: '+JSON.stringify(chunk({},'stop',{prompt_tokens:1,completion_tokens:1,total_tokens:2}))+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
  }});
  assert.equal(calls,1);assert.equal(response.provider,'zai');assert.equal(response.model,'glm-5.3');assert.equal(response.stopReason,'stop');
});
