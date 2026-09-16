import test from 'node:test';
import assert from 'node:assert/strict';
import {lookup, geocode, safeWebsite, createSourceRequester} from '../src/lib/utility-lookup.ts';
const originalFetch=globalThis.fetch;
test.afterEach(()=>{globalThis.fetch=originalFetch;});
test('rejects non-property geocodes and addresses outside supported states',async()=>{
 globalThis.fetch=async()=>Response.json({candidates:[{address:'Portland',score:100,location:{x:-122.6,y:45.5},attributes:{Addr_type:'Locality',RegionAbbr:'OR'}},{address:'California house',score:100,location:{x:-122,y:38},attributes:{Addr_type:'PointAddress',RegionAbbr:'CA'}}]});
 assert.deepEqual(await geocode('Portland OR'),[]);
});
test('a failed source does not become a no-service finding',async()=>{
 globalThis.fetch=async()=>Response.json({error:{message:'Unavailable'}});
 const results=await lookup(-122.6,45.5,'residential');
 assert.equal(results.length,5);assert.ok(results.every(r=>r.status==='error'&&r.providers.length===0));
});
test('Portland multifamily never presents a franchise hauler as the contract',async()=>{
 globalThis.fetch=async url=>Response.json({features:[{attributes:String(url).includes('/13/query')?{CITYNAME:'Portland'}:{NAME:'Utility',RESIDENTIA:'Residential Co',COMMERCIAL:'Contract Co',SEWER_DIST:'District',WaterProvider:'Water'}}]});
 const results=await lookup(-122.6,45.5,'multifamily');
 assert.equal(results[4].status,'review');assert.equal(results[4].providers.length,0);assert.match(results[4].note,/choose their hauler/);assert.equal(results[3].status,'review');
});
test('overlapping electricity providers are retained for review',async()=>{
 globalThis.fetch=async()=>Response.json({features:[{attributes:{NAME:'Provider A'}},{attributes:{NAME:'Provider B'}}]});
 const results=await lookup(-122.6,45.5,'residential');assert.equal(results[0].status,'review');assert.equal(results[0].providers.length,2);
});
test('coordinates and source links are validated',async()=>{
 await assert.rejects(lookup(NaN,45,'residential'));await assert.rejects(lookup(-20,45,'residential'));await assert.rejects(lookup(-122,45,'unknown'));
 assert.equal(safeWebsite('javascript:alert(1)'),undefined);assert.equal(safeWebsite('https://user:pass@example.com'),undefined);assert.equal(safeWebsite('www.nwnatural.com'),'https://www.nwnatural.com/');
});
test('transient connection errors recover after spaced retries',async()=>{
 let calls=0;const delays=[];
 const request=createSourceRequester({sleep:async ms=>{delays.push(ms);},fetcher:async()=>{if(++calls<3)throw new Error('internal error; reference = example');return Response.json({features:[]});}});
 assert.deepEqual(await request('https://example.com/query?f=json'),{features:[]});
 assert.equal(calls,3);assert.deepEqual(delays,[300,900]);
});
test('rate-limit Retry-After is honored, long waits end without hammering the source',async()=>{
 let calls=0;const delays=[];
 const request=createSourceRequester({sleep:async ms=>{delays.push(ms);},fetcher:async()=>++calls===1?new Response('',{status:429,headers:{'Retry-After':'2'}}):Response.json({features:[]})});
 await request('https://example.com/query?f=json');assert.deepEqual(delays,[2000]);
 const limited=createSourceRequester({fetcher:async()=>new Response('',{status:429,headers:{'Retry-After':'60'}})});
 await assert.rejects(limited('https://example.com/query?f=json'),e=>e.code==='http_429'&&e.attempts===1);
});
test('permanent HTTP and ArcGIS query errors are not retried',async()=>{
 for(const response of [()=>new Response('',{status:403}),()=>Response.json({error:{code:400,message:'Invalid query'}})]){
  let calls=0;const request=createSourceRequester({fetcher:async()=>{calls++;return response();}});
  await assert.rejects(request('https://example.com/query?f=json'));assert.equal(calls,1);
 }
});
test('timeouts and malformed responses retain specific failure categories',async()=>{
 for(const [code,fetcher] of [['timeout',async()=>{throw new DOMException('Timed out','TimeoutError');}],['invalid_json',async()=>new Response('<html>error</html>')],['incomplete_response',async()=>Response.json({features:[],exceededTransferLimit:true})]]){
  const request=createSourceRequester({sleep:async()=>{},fetcher});
  await assert.rejects(request('https://example.com/query?f=json'),e=>e.code===code&&e.attempts===3);
 }
});
test('identical simultaneous queries share work, and failures do not poison the next request',async()=>{
 let calls=0;let release;const gate=new Promise(resolve=>{release=resolve;});
 const request=createSourceRequester({sleep:async()=>{},fetcher:async()=>{calls++;await gate;return new Response('',{status:403});}});
 const first=request('https://example.com/query?f=json');const second=request('https://example.com/query?f=json');assert.equal(first,second);release();
 await Promise.allSettled([first,second]);assert.equal(calls,1);
 await assert.rejects(request('https://example.com/query?f=json'));assert.equal(calls,2);
});
test('a failed Portland boundary check keeps its own query and detailed failure',async()=>{
 globalThis.fetch=async url=>String(url).includes('/13/query')?new Response('',{status:403}):Response.json({features:[]});
 const result=(await lookup(-122.65,45.54,'residential'))[3];
 assert.equal(result.status,'error');assert.match(result.note,/HTTP 403/);assert.match(result.queryUrl,/Boundaries\/MapServer\/13\/query/);
});

