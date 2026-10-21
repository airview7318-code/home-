import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root=process.env.BUJA_SERVE_DIST==='1'?'dist':'.';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
createServer(async(req,res)=>{try{let urlPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(urlPath==='/')urlPath='/index.html';let file=normalize(join(root,urlPath));if(!file.startsWith(normalize(root)))throw Error('bad path');let data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(data)}catch{res.writeHead(404);res.end('Not found')}}).listen(Number(process.env.PORT||4173),()=>console.log(`Buja site ready on http://localhost:${process.env.PORT||4173}`));
