const fs=require('node:fs'),path=require('node:path');
const CORE=require('./scripts/exam-core'),loadData=require('./scripts/load-data');
const {rows:raw,meta,sources}=loadData(),rows=CORE.prepareData(raw,meta,sources);
const years=[...new Set(rows.map(r=>r.source_year))].sort((a,b)=>a-b);
const exact=new Map(),multi=new Map();
for(const r of rows){
  const key=[r.period_id,r.source_year,r.date,r.time,r.course].join('|');exact.set(key,(exact.get(key)||0)+1);
  const group=[r.period_id,r.source_year,r.course].join('|');if(!multi.has(group))multi.set(group,new Set());if(r.date)multi.get(group).add(r.date);
}
const validation={generated_at:new Date().toISOString(),records:rows.length,unique_courses:new Set(rows.map(r=>r.course)).size,counts:{},
  exact_duplicate_rows:[...exact].filter(([,n])=>n>1).map(([key,count])=>({key,count})),
  multi_date_same_course_program_year:[...multi].filter(([,s])=>s.size>1).map(([key,s])=>({key,dates:[...s]})),
  invalid_dates:rows.filter(r=>r.date&&!CORE.parseDate(r.date)).map(r=>r.source_cell_id||r.id),
  invalid_times:rows.filter(r=>r.time&&!CORE.validTime(r.time)).map(r=>r.source_cell_id||r.id),
  inferred_year_entries:rows.filter(r=>r.date_status==='inferred-year').map(r=>({course:r.course,date:r.date,source_date:r.source_date,source_id:r.source_id,source_page:r.source_page})),
  no_fixed_day_or_time:rows.filter(r=>!r.is_scheduled).length,
  unmapped_courses:[...new Set(rows.filter(r=>!r.semester).map(r=>r.course))].sort()};
for(const p of CORE.PERIODS)for(const year of years){
  const selected=rows.filter(r=>r.period_id===p.id&&r.source_year===year);
  validation.counts[`${p.label} ${year}`]={records:selected.length,scheduled:selected.filter(r=>r.is_scheduled).length,without_fixed_day_or_time:selected.filter(r=>!r.is_scheduled).length};
}
for(const file of ['validation.json','validation-report.txt'])fs.writeFileSync(path.join(__dirname,file),JSON.stringify(validation,null,2)+'\n');
const columns=['period_id','period_label','exam_type','source_year','date','weekday','time','course','source_title','study_year','semester','category','flow','exam_day','period_day','note','source_id','source_page','source_cell_id','source_time','source_date','date_status'];
const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
fs.writeFileSync(path.join(__dirname,'data.csv'),'\ufeff'+[columns.join(','),...rows.map(r=>columns.map(c=>quote(r[c])).join(','))].join('\r\n'));
console.log(JSON.stringify({records:validation.records,unique_courses:validation.unique_courses,counts:validation.counts,duplicates:validation.exact_duplicate_rows.length,invalid_dates:validation.invalid_dates.length,invalid_times:validation.invalid_times.length,unmapped:validation.unmapped_courses.length},null,2));
if(validation.invalid_dates.length||validation.invalid_times.length||validation.unmapped_courses.length||validation.exact_duplicate_rows.length)process.exitCode=1;
