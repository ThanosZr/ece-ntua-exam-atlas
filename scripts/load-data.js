const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=function loadData(){
  const root=path.resolve(__dirname,'..'),context=vm.createContext({window:{}});
  const files=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)]
    .map(m=>m[1]).filter(f=>f==='metadata.js'||f.startsWith('data/'));
  for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  return JSON.parse(JSON.stringify({rows:context.window.EXAM_ROWS,meta:context.window.EXAM_META,sources:context.window.EXAM_SOURCES}));
};
