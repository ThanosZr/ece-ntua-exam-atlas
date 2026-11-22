// Shared by the browser and Node validation. Dates use UTC to avoid DST shifts.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.EXAM_CORE=api;
})(typeof window==='object'?window:globalThis,function(){
  const PERIODS=[
    {id:'winter',label:'Χειμερινή',short:'Χ',description:'Κανονική εξέταση μαθημάτων χειμερινού εξαμήνου.'},
    {id:'winter-degree',label:'Πτυχιακή χειμερινού',short:'ΠΧ',description:'Επί πτυχίω εξέταση κατά τη χειμερινή εξεταστική.'},
    {id:'spring',label:'Εαρινή',short:'Ε',description:'Κανονική εξέταση μαθημάτων εαρινού εξαμήνου.'},
    {id:'spring-degree',label:'Πτυχιακή εαρινού',short:'ΠΕ',description:'Επί πτυχίω εξέταση κατά την εαρινή εξεταστική.'},
    {id:'resit',label:'Επαναληπτική',short:'Σ',description:'Επαναληπτική εξέταση μαθημάτων και των δύο εξαμήνων.'}
  ];
  const PERIOD_BY_ID=Object.fromEntries(PERIODS.map(p=>[p.id,p]));
  const weekdays=['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
  function parseDate(value){
    const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value||'');
    if(!match)return null;
    const [,ds,ms,ys]=match,d=Number(ds),m=Number(ms),y=Number(ys),date=new Date(Date.UTC(y,m-1,d));
    return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date:null;
  }
  const validTime=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value||'');
  const inferPeriod=row=>row.period_id||(row.exam_type==='Επί πτυχίω'?'winter-degree':'winter');
  function prepareData(raw,meta,sources=[]){
    const data=raw.map((r,id)=>{
      const period_id=inferPeriod(r),period=PERIOD_BY_ID[period_id];
      if(!period)throw new Error('Unknown examination period: '+period_id);
      const m=meta[r.course]||{},date=parseDate(r.date),semester=r.semester??m.semester??null;
      return {...r,id,period_id,period_label:period.label,semester,study_year:semester?Math.ceil(semester/2):null,
        flow:r.flow??m.flow??'—',category:r.category??m.category??'Μη χαρτογραφημένο',
        date:r.date||'',time:r.time||'',note:r.note||'',source_title:r.source_title||r.course,
        iso_date:date?date.toISOString().slice(0,10):'',date_short:date?r.date.slice(0,5):'Χωρίς ημερομηνία',
        weekday:date?weekdays[date.getUTCDay()]:'',is_scheduled:Boolean(date&&validTime(r.time)),exam_day:null,period_day:null};
    });
    const groups=new Map();
    for(const r of data){const key=r.period_id+'|'+r.source_year;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
    for(const rows of groups.values()){
      const dates=[...new Set(rows.filter(r=>r.is_scheduled).map(r=>r.iso_date))].sort();
      const rank=new Map(dates.map((d,i)=>[d,i+1]));
      const sample=rows[0],source=sources.find(s=>s.id===sample.source_id);
      const declared=parseDate(source?.period_starts?.[sample.period_id]);
      const start=declared?declared.getTime():dates[0]?Date.parse(dates[0]+'T00:00:00Z'):null;
      for(const r of rows)if(r.is_scheduled){r.exam_day=rank.get(r.iso_date);r.period_day=(Date.parse(r.iso_date+'T00:00:00Z')-start)/86400000;}
    }
    return data;
  }
  function compareYears(rows,years){
    const groups=new Map();
    for(const r of rows.filter(r=>r.is_scheduled)){
      const key=r.period_id+'|'+r.course;
      if(!groups.has(key))groups.set(key,new Map());
      const ym=groups.get(key);if(!ym.has(r.source_year))ym.set(r.source_year,[]);ym.get(r.source_year).push(r);
    }
    const result=[];
    for(const ym of groups.values()){
      const ys=years.filter(y=>ym.has(y));if(ys.length<2)continue;
      const sample=ym.get(ys[0])[0],positions=ys.map(y=>Math.min(...ym.get(y).map(r=>r.period_day)));
      const signature=y=>ym.get(y).map(r=>r.period_day+'|'+r.time).sort().join(';');
      const times=y=>[...new Set(ym.get(y).map(r=>r.time))].sort().join(';');
      result.push({course:sample.course,period_id:sample.period_id,period_label:sample.period_label,
        span:Math.max(...positions)-Math.min(...positions),unchanged:new Set(ys.map(signature)).size===1,
        sameTime:new Set(ys.map(times)).size===1,entries:ys.map(year=>({year,rows:ym.get(year)}))});
    }
    return result.sort((a,b)=>b.span-a.span||a.course.localeCompare(b.course,'el'));
  }
  return {PERIODS,PERIOD_BY_ID,parseDate,validTime,inferPeriod,prepareData,compareYears};
});
