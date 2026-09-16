// Live source and CORS check. This verifies response headers; it is not a
// substitute for a final browser check on the published GitHub origin.
import {geocode,lookup} from '../src/lib/utility-lookup.ts';
const nativeFetch=globalThis.fetch;
const origin='https://example.github.io';
globalThis.fetch=async(url,options={})=>{
 const headers=new Headers(options.headers);headers.set('Origin',origin);
 const response=await nativeFetch(url,{...options,headers});
 const allowed=response.headers.get('access-control-allow-origin');
 if(allowed!=='*'&&allowed!==origin)throw new Error(`Browser origin not allowed by ${new URL(url).hostname}`);
 return response;
};
for(const address of ['602 NE Brazee St, Portland, OR 97212','12725 SW Millikan Way, Beaverton OR','581 Holmes Ln, Oregon City OR']){
 const [point]=await geocode(address);if(!point)throw new Error(`No match: ${address}`);
 const utilities=await lookup(point.x,point.y,'residential');
 console.log(JSON.stringify({address:point.address,utilities:utilities.map(r=>({utility:r.utility,status:r.status,providers:r.providers.map(p=>p.name)}))}));
 if(utilities.some(r=>r.status==='error'))process.exitCode=1;
}
