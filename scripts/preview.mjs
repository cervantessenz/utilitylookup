// Serves only compiled static files, under a repository-style subpath.
// There are no lookup APIs, proxies, or server-side utility requests here.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../docs/',import.meta.url));
const prefix='/property-utilities/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(pathname==='/'){res.writeHead(302,{Location:prefix}).end();return;}
 if(!pathname.startsWith(prefix)||!['GET','HEAD'].includes(req.method)){res.writeHead(404).end();return;}
 const path=resolve(root,pathname.slice(prefix.length)||'index.html');
 if(!path.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
 try{const content=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:content);}catch{res.writeHead(404).end('Not found');}
}).listen(5174,'127.0.0.1',()=>console.log('GitHub version preview: http://127.0.0.1:5174/property-utilities/'));
