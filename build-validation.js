const fs=require('fs'), path=require('path');
global.window=global;
const root=__dirname;
for(const f of ['metadata.js','data/regular-2024.js','data/regular-2025.js','data/regular-2026.js','data/degree-2024.js','data/degree-2025.js','data/degree-2026.js']) require(path.join(root,f));
const weekdays=['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
const parseDate=s=>{const [d,m,y]=s.split('/').map(Number);return new Date(y,m-1,d)};
const rows=EXAM_ROWS.map((r,i)=>{const m=EXAM_META[r.course]||{semester:null,flow:'—',category:'Μη χαρτογραφημένο'};const d=parseDate(r.date);return {...r,id:i,semester:m.semester,study_year:m.semester?Math.ceil(m.semester/2):null,flow:m.flow,category:m.category,weekday:weekdays[d.getDay()]}});
for(const p of ['Κανονική','Επί πτυχίω'])for(const y of [2024,2025,2026]){const rr=rows.filter(r=>r.exam_type===p&&r.source_year===y);const days=[...new Set(rr.map(r=>r.date))].sort((a,b)=>parseDate(a)-parseDate(b));const rank=new Map(days.map((d,i)=>[d,i+1]));rr.forEach(r=>r.exam_day=rank.get(r.date));}
const exact=new Map(), cyd=new Map();
for(const r of rows){const k=[r.exam_type,r.source_year,r.date,r.time,r.course].join('|');exact.set(k,(exact.get(k)||0)+1);const q=[r.exam_type,r.source_year,r.course].join('|');if(!cyd.has(q))cyd.set(q,new Set());cyd.get(q).add(r.date)}
const validation={generated_at:new Date().toISOString(),records:rows.length,unique_courses:new Set(rows.map(r=>r.course)).size,counts:{},exact_duplicate_rows:[...exact].filter(([,n])=>n>1).map(([k,n])=>({key:k,count:n})),multi_date_same_course_program_year:[...cyd].filter(([,s])=>s.size>1).map(([k,s])=>({key:k,dates:[...s]})),unmapped_courses:[...new Set(rows.filter(r=>!r.semester).map(r=>r.course))].sort()};
for(const p of ['Κανονική','Επί πτυχίω'])for(const y of [2024,2025,2026])validation.counts[`${p} ${y}`]=rows.filter(r=>r.exam_type===p&&r.source_year===y).length;
fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(validation,null,2),'utf8');
const cols=['exam_type','source_year','date','weekday','time','course','source_title','study_year','semester','category','flow','exam_day','note'];
const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
const csv='\ufeff'+[cols.join(','),...rows.map(r=>cols.map(c=>q(r[c])).join(','))].join('\r\n');
fs.writeFileSync(path.join(root,'data.csv'),csv,'utf8');
console.log(JSON.stringify(validation,null,2));
