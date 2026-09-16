export type Candidate = { address: string; x: number; y: number; score: number; matchType: string; region: string };
export type ServiceType = "residential" | "multifamily" | "commercial";
export type Provider = { name: string; phone?: string; website?: string };
export type UtilityResult = { utility: string; status: "mapped" | "review" | "missing" | "error"; providers: Provider[]; note: string; source: string; sourceUrl: string; queryUrl?: string; checkedAt: string };
export const sources = {
 electricity: "https://services.arcgis.com/uUvqNMGPm7axC2dD/ArcGIS/rest/services/OregonElectric_Utilities_WGS_1984_6_26_2023/FeatureServer/0",
 gas: "https://services.arcgis.com/uUvqNMGPm7axC2dD/ArcGIS/rest/services/Natural_Gas_Service_Territories_OR/FeatureServer/0",
 water: "https://www.portlandmaps.com/arcgis/rest/services/Public/Utilities_Water/MapServer/6",
 garbage: "https://services2.arcgis.com/McQ0OlIABe29rJJy/arcgis/rest/services/Garbage_Hauler_Boundaries/FeatureServer/0",
 sewer: "https://services2.arcgis.com/McQ0OlIABe29rJJy/arcgis/rest/services/Sewer_Districts/FeatureServer/0",
 portland: "https://www.portlandmaps.com/arcgis/rest/services/Public/Boundaries/MapServer/13",
 garbageFallback: "https://www.portlandmaps.com/arcgis/rest/services/Public/Boundaries/MapServer/16",
};
type Attributes = Record<string, unknown>;
type ArcResponse = { error?: {code?:number;message?: string}; features?: {attributes:Attributes}[]; exceededTransferLimit?: boolean; candidates?: {address:string;location:{x:number;y:number};score:number;attributes:Record<string,string>}[] };
export class SourceError extends Error {
 code:string; attempts=1; retryable:boolean; retryAfterMs=0;
 constructor(code:string,message:string,retryable:boolean){super(message);this.name="SourceError";this.code=code;this.retryable=retryable;}
}
export function sourceFailure(error:unknown):string {
 if(error instanceof SourceError)return `${error.message} (${error.attempts} ${error.attempts===1?"attempt":"attempts"}.) Use Refresh to try again or open the source query.`;
 return "The source returned incomplete or unexpected data. Use Refresh or open the source query.";
}
// One in-flight request per exact query, no saved address or provider cache.
export function createSourceRequester(options:{fetcher?:typeof fetch;sleep?:(ms:number)=>Promise<void>;timeoutMs?:number}={}){
 const pending=new Map<string,Promise<ArcResponse>>();
 const wait=options.sleep||((ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms)));
 return (url:string):Promise<ArcResponse>=>{
  const existing=pending.get(url);if(existing)return existing;
  const task=(async()=>{
   for(let attempt=1;attempt<=3;attempt++){
    try{
     const response=await (options.fetcher||fetch)(url,{signal:AbortSignal.timeout(options.timeoutMs??6000),headers:{Accept:"application/json"}});
     if(!response.ok){
      const retryable=[408,429,500,502,503,504].includes(response.status);
      const error=new SourceError(`http_${response.status}`,response.status===429?"The source is limiting requests.":`The source returned HTTP ${response.status}.`,retryable);
      const retryAfter=response.headers.get("Retry-After");
      if(retryAfter){const seconds=Number(retryAfter);error.retryAfterMs=Number.isFinite(seconds)?seconds*1000:Math.max(0,Date.parse(retryAfter)-Date.now());}
      throw error;
     }
     let data:ArcResponse;
     try{data=await response.json() as ArcResponse;}catch(error){if(error instanceof Error&&["TimeoutError","AbortError"].includes(error.name))throw error;throw new SourceError("invalid_json","The source returned an unreadable response.",true);}
     if(!data||typeof data!=="object")throw new SourceError("invalid_response","The source returned an unexpected response.",true);
     if(data.error){const code=data.error.code;throw new SourceError(`arcgis_${code??"unknown"}`,`The map service rejected the query${code?` (ArcGIS ${code})`:""}.`,!!code&&[429,500,502,503,504].includes(code));}
     if(url.includes("/query?")&&(!Array.isArray(data.features)||data.exceededTransferLimit))throw new SourceError("incomplete_response","The map service returned incomplete query results.",true);
     return data;
    }catch(raw){
     const error=raw instanceof SourceError?raw:new SourceError(raw instanceof Error&&["TimeoutError","AbortError"].includes(raw.name)?"timeout":"connection",raw instanceof Error&&["TimeoutError","AbortError"].includes(raw.name)?"The source did not respond before the time limit.":"The connection to the source failed before usable data arrived.",true);
     error.attempts=attempt;
     if(!error.retryable||attempt===3||error.retryAfterMs>3000){console.warn("Utility source failed",new URL(url).pathname,{code:error.code,attempts:attempt,detail:raw instanceof Error?raw.message:String(raw)});throw error;}
     await wait(Math.max(error.retryAfterMs,attempt===1?300:900));
    }
   }
   throw new Error("Unreachable retry state");
  })();
  pending.set(url,task);void task.finally(()=>pending.delete(url)).catch(()=>{});return task;
 };
}
const requestJson=createSourceRequester();
export function safeWebsite(value: unknown): string | undefined {
 if(typeof value!=="string" || !value.trim()) return;
 try { const url=new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`); if(["https:","http:"].includes(url.protocol)&&url.hostname.includes(".")&&!url.username&&!url.password) return url.href; }catch{}
}
export async function geocode(address: string): Promise<Candidate[]> {
 if(typeof address!=="string" || address.trim().length<6 || address.length>250) throw new Error("Enter a street address with city and state or ZIP code.");
 const p=new URLSearchParams({f:"json",SingleLine:address.trim(),maxLocations:"5",outFields:"Addr_type,RegionAbbr,City",outSR:"4326",countryCode:"USA",forStorage:"false"});
 const data=await requestJson(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${p}`);
 if(!Array.isArray(data.candidates)) throw new Error("The address source returned an unexpected response.");
 return data.candidates.filter(c=>["OR","WA"].includes(c.attributes.RegionAbbr)&&["PointAddress","StreetAddress","Subaddress"].includes(c.attributes.Addr_type)&&c.score>=85).map(c=>({address:c.address,x:c.location.x,y:c.location.y,score:c.score,matchType:c.attributes.Addr_type,region:c.attributes.RegionAbbr}));
}
export function pointQuery(source: string, x:number,y:number) {
 return `${source}/query?${new URLSearchParams({f:"json",where:"1=1",geometry:JSON.stringify({x,y,spatialReference:{wkid:4326}}),geometryType:"esriGeometryPoint",inSR:"4326",spatialRel:"esriSpatialRelIntersects",outFields:"*",returnGeometry:"false"})}`;
}
async function intersect(source: string,x:number,y:number) {
 const queryUrl=pointQuery(source,x,y);const data=await requestJson(queryUrl);
 if(!Array.isArray(data.features)||data.exceededTransferLimit)throw new Error("The source returned incomplete or unexpected results.");
 return {attributes:data.features.map(f=>f.attributes),queryUrl};
}
const str=(v:unknown)=>typeof v==="string"?v.trim():"";
function providers(attrs:Attributes[],name:string,phone?:string,website?:string):Provider[]{
 const seen=new Set<string>();return attrs.flatMap(a=>{const n=str(a[name]);if(!n||seen.has(n))return [];seen.add(n);return [{name:n,phone:phone?str(a[phone])||undefined:undefined,website:website?safeWebsite(a[website]):undefined}];});
}
const base=(utility:string,source:string,sourceUrl:string):UtilityResult=>({utility,source,sourceUrl,status:"missing",providers:[],note:"No provider was returned for this point. This does not mean the property has no service.",checkedAt:new Date().toISOString()});
async function standard(utility:string,source:string,url:string,x:number,y:number,name:string,phone?:string,website?:string,note="Mapped service territory; confirm the building’s connection with the provider."):Promise<UtilityResult>{
 const result=base(utility,source,url);result.queryUrl=pointQuery(url,x,y);try{const match=await intersect(url,x,y);result.providers=providers(match.attributes,name,phone,website);if(result.providers.length){result.status=result.providers.length>1?"review":"mapped";result.note=result.providers.length>1?`Overlapping results: ${note}`:note;}}catch(error){result.status="error";result.note=sourceFailure(error);}return result;
}
export async function lookup(x:number,y:number,type:ServiceType):Promise<UtilityResult[]> {
 if(!Number.isFinite(x)||!Number.isFinite(y)||x < -125 || x > -116 || y < 41.9 || y > 49.1)throw new Error("Choose a matched address in Oregon or Washington.");
 if(!["residential","multifamily","commercial"].includes(type))throw new Error("Choose a property type.");
 const portland=intersect(sources.portland,x,y).then(m=>({inside:m.attributes.length>0,error:null as unknown})).catch(error=>({inside:null,error}));
 const sewer=async()=>{
   const result=await standard("Sewer","Metro · Sewer Districts",sources.sewer,x,y,"SEWER_DIST");
   if(result.providers.length){result.status="review";result.note="District boundary match only. Metro explicitly states these are political boundaries, not service areas; city sewer services are excluded. Verify the serving and billing agency in PortlandMaps or with the district.";return result;}
   const {inside,error}=await portland;
   if(inside){result.providers=[{name:"City of Portland · Environmental Services",website:"https://www.portland.gov/bes"}];result.status="review";result.source="PortlandMaps · City boundary";result.sourceUrl=sources.portland;result.queryUrl=pointQuery(sources.portland,x,y);result.note="Possible provider inferred from the City of Portland boundary. This is not a sewer connection lookup; confirm in PortlandMaps Utilities or with Environmental Services.";}
   else if(inside===null){const districtNote=result.status==="error"?`Metro district check: ${result.note} `:"No Metro special sewer district matched. ";result.status="error";result.source="PortlandMaps · City boundary";result.sourceUrl=sources.portland;result.queryUrl=pointQuery(sources.portland,x,y);result.note=`${districtNote}Portland boundary check: ${sourceFailure(error)}`;}
   else if(result.status!=="error"){result.note="No special sewer district found. This layer excludes city services. Check PortlandMaps Utilities or the local sewer agency; do not assume septic.";}
   return result;
 };
 const garbage=async()=>{
   const residential=type==="residential";
   let result=await standard("Garbage / Recycling","Metro · Garbage Hauler Boundaries",sources.garbage,x,y,residential?"RESIDENTIA":"COMMERCIAL",residential?"PHONE":"COMM_PHONE",undefined,"Mapped garbage/recycling franchise. Confirm current service and collection arrangements with the hauler.");
   if(result.status==="error"||result.status==="missing"){
     const fallback=await standard("Garbage / Recycling","PortlandMaps · Garbage Hauler Boundaries",sources.garbageFallback,x,y,residential?"RESIDENTIA":"COMMERCIAL",residential?"PHONE":"COMM_PHONE");
     if(fallback.providers.length){result=fallback;result.note="PortlandMaps fallback boundary match. Verify current service with the hauler.";}
   }
   if(!residential){
    const {inside}=await portland;
    if(inside){result.status="review";result.providers=[];result.source="Portland · Commercial and multifamily garbage";result.sourceUrl="https://www.portland.gov/bps/garbage-recycling/multifamily-recycling/set-garbage-service";result.note="Portland properties with five or more units and businesses choose their hauler. An address cannot reveal the current contract. Check the property’s invoice or management records.";}
    else if(result.providers.length){result.status="review";result.note="Commercial franchise candidate. Multifamily rules vary by jurisdiction; verify the property’s contract. A boundary cannot confirm the current hauler.";}
   }
   if(residential)result.note+=" If this address is a multifamily property, this garbage/recycling provider is not definite. Verify the property's actual hauler using its service contract, recent invoice, or management records.";
   return result;
 };
 return Promise.all([
 standard("Electricity","Oregon energy · Electric utility territories",sources.electricity,x,y,"NAME","Phone","Website"),
 standard("Gas","Oregon energy · Natural gas territories",sources.gas,x,y,"NAME","TELEPHONE","WEBSITE","Mapped gas territory only. NW Natural serves the Portland area, but a territory match does not confirm a gas meter, connection, or active account."),
 standard("Water","PortlandMaps · Regional water boundaries",sources.water,x,y,"WaterProvider","PhoneNo","WebSite","Regional drinking-water advisory boundary match. Confirm the retail/billing provider and building connection; this map is not a service account record."),
 sewer(),garbage(),
 ]);
}
