(() => {
  const RAW = window.EXAM_ROWS || [];
  const META = window.EXAM_META || {};
  const SOURCES = window.EXAM_SOURCES || [];
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const weekdays = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
  const colors = {'Κορμός':'#60b8ff','Ροή':'#aa8cff','Ανθρωπιστικό':'#ffcb6b','Λοιπό':'#66d69a','Μη χαρτογραφημένο':'#ff7272'};
  const timeRank = t => t.startsWith('08') ? 0 : t.startsWith('12') ? 1 : t.startsWith('15') ? 2 : t.startsWith('18') ? 3 : 9;

  function parseDate(s){ const [d,m,y] = s.split('/').map(Number); return new Date(y,m-1,d); }
  function iso(s){ const d=parseDate(s); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function shortDate(s){ const d=parseDate(s); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; }

  const DATA = RAW.map((r,i) => {
    const m = META[r.course] || {semester:null,flow:'—',category:'Μη χαρτογραφημένο'};
    const d = parseDate(r.date);
    return {
      ...r, id:i, semester:m.semester, flow:m.flow, category:m.category,
      study_year:m.semester ? Math.ceil(m.semester/2) : null,
      iso_date:iso(r.date), date_short:shortDate(r.date), weekday:weekdays[d.getDay()]
    };
  });

  for(const program of ['Κανονική','Επί πτυχίω']){
    for(const year of [2024,2025,2026]){
      const rr=DATA.filter(r=>r.exam_type===program&&r.source_year===year);
      const days=[...new Set(rr.map(r=>r.iso_date))].sort();
      const rank=new Map(days.map((d,i)=>[d,i+1]));
      rr.forEach(r=>r.exam_day=rank.get(r.iso_date));
    }
  }

  const state={
    exam:'Κανονική', years:new Set([2024,2025,2026]), studyYears:new Set(), semesters:new Set(),
    cats:new Set(), flows:new Set(), times:new Set(), q:'', highlight:'', isolate:false, view:'alluvial'
  };

  function baseFiltered(){
    const q=state.q.trim().toLocaleLowerCase('el');
    return DATA.filter(r =>
      (state.exam==='Συνδυασμός'||r.exam_type===state.exam) &&
      state.years.has(r.source_year) &&
      (!state.studyYears.size||state.studyYears.has(r.study_year)) &&
      (!state.semesters.size||state.semesters.has(r.semester)) &&
      (!state.cats.size||state.cats.has(r.category)) &&
      (!state.flows.size||state.flows.has(r.flow)) &&
      (!state.times.size||[...state.times].some(t=>r.time.startsWith(t))) &&
      (!q||r.course.toLocaleLowerCase('el').includes(q)||r.source_title.toLocaleLowerCase('el').includes(q))
    );
  }
  function filtered(){
    let rows=baseFiltered();
    if(state.isolate&&state.highlight) rows=rows.filter(r=>r.course===state.highlight);
    return rows;
  }
  const courseSet = rows => [...new Set(rows.map(r=>r.course))].sort((a,b)=>a.localeCompare(b,'el'));

  function toggleSet(el,set,cast=x=>x){ const v=cast(el.dataset.v); if(set.has(v)){set.delete(v);el.classList.remove('on')} else {set.add(v);el.classList.add('on')} render(); }
  $$('.yr').forEach(b=>b.onclick=()=>toggleSet(b,state.years,Number));
  $$('.sy').forEach(b=>b.onclick=()=>toggleSet(b,state.studyYears,Number));
  $$('.sem').forEach(b=>b.onclick=()=>toggleSet(b,state.semesters,Number));
  $$('.cat').forEach(b=>b.onclick=()=>toggleSet(b,state.cats));
  $$('.flow').forEach(b=>b.onclick=()=>toggleSet(b,state.flows));
  $$('.tm').forEach(b=>b.onclick=()=>toggleSet(b,state.times));
  $$('.exam').forEach(b=>b.onclick=()=>{state.exam=b.dataset.v;state.isolate=false;$$('.exam').forEach(x=>x.classList.toggle('on',x===b));render();});
  $('#search').oninput=e=>{state.q=e.target.value;render();};
  $('#highlightSelect').onchange=e=>{state.highlight=e.target.value;state.isolate=false;$('#onlyHighlighted').classList.remove('on');render();if(state.highlight)setTimeout(scrollHighlight,30);};
  $('#onlyHighlighted').onclick=()=>{if(!state.highlight)return;state.isolate=!state.isolate;$('#onlyHighlighted').classList.toggle('on',state.isolate);render();};
  $('#clearHighlight').onclick=()=>{state.highlight='';state.isolate=false;$('#onlyHighlighted').classList.remove('on');render();};
  $('#reset').onclick=()=>{
    state.exam='Κανονική';state.years=new Set([2024,2025,2026]);state.studyYears.clear();state.semesters.clear();state.cats.clear();state.flows.clear();state.times.clear();state.q='';state.highlight='';state.isolate=false;
    $('#search').value='';$$('.pill').forEach(x=>x.classList.remove('on'));$$('.yr').forEach(x=>x.classList.add('on'));$$('.exam').forEach(x=>x.classList.toggle('on',x.dataset.v==='Κανονική'));render();
  };
  $$('.tab').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;$$('.tab').forEach(x=>x.classList.toggle('on',x===b));$$('.view').forEach(v=>v.classList.remove('active'));$('#view-'+state.view).classList.add('active');render();});

  function updateHighlightOptions(){
    const available=courseSet(baseFiltered());
    const cur=state.highlight;
    $('#highlightSelect').innerHTML='<option value="">— επίλεξε μάθημα —</option>'+available.map(c=>`<option value="${esc(c)}" ${c===cur?'selected':''}>${esc(c)}</option>`).join('');
    if(cur&&!available.includes(cur)){state.highlight='';state.isolate=false;$('#onlyHighlighted').classList.remove('on');}
  }

  function renderKpis(rows){
    const uniq=courseSet(rows).length;
    const mapped=rows.filter(r=>r.semester).length;
    const programs={Κανονική:rows.filter(r=>r.exam_type==='Κανονική').length,'Επί πτυχίω':rows.filter(r=>r.exam_type==='Επί πτυχίω').length};
    const years=[...state.years].sort();
    const m=new Map();rows.forEach(r=>{if(!m.has(r.course))m.set(r.course,new Set());m.get(r.course).add(r.source_year)});
    const allYears=[...m.values()].filter(s=>years.length&&years.every(y=>s.has(y))).length;
    $('#kpis').innerHTML=[
      ['Εγγραφές',rows.length],['Μοναδικά μαθήματα',uniq],['Κανονική / πτυχιακή',`${programs['Κανονική']} / ${programs['Επί πτυχίω']}`],['Metadata εξαμήνου',`${mapped}/${rows.length}`],['Παρόντα σε όλα τα έτη',allYears]
    ].map(([l,v])=>`<div class="card kpi"><div class="label">${l}</div><div class="value">${v}</div></div>`).join('');
    $('#resultCount').textContent=`${rows.length} εγγραφές · ${uniq} μαθήματα${state.isolate?' · απομόνωση ενεργή':''}`;
  }

  function aggregateNodes(rows, years){
    const keyOf=r=>state.exam==='Συνδυασμός'?`${r.exam_type}|${r.course}`:r.course;
    const map=new Map();
    for(const r of rows){
      const k=`${keyOf(r)}|${r.source_year}`;
      if(!map.has(k)) map.set(k,{series:keyOf(r),course:r.course,program:r.exam_type,year:r.source_year,entries:[],semester:r.semester,study_year:r.study_year,category:r.category,flow:r.flow});
      map.get(k).entries.push(r);
    }
    for(const n of map.values()){
      n.entries.sort((a,b)=>a.iso_date.localeCompare(b.iso_date)||timeRank(a.time)-timeRank(b.time)||a.course.localeCompare(b.course,'el'));
      n.first=n.entries[0];
      n.date=n.first.date; n.date_short=n.first.date_short; n.iso_date=n.first.iso_date;
      n.times=[...new Set(n.entries.map(x=>x.time))];
      n.time_label=n.times.join(' + ');
      n.notes=[...new Set(n.entries.map(x=>x.note).filter(Boolean))];
      n.exam_day=n.first.exam_day;
    }
    const by={};
    for(const y of years){
      by[y]=[...map.values()].filter(n=>n.year===y).sort((a,b)=>a.iso_date.localeCompare(b.iso_date)||timeRank(a.times[0])-timeRank(b.times[0])||a.program.localeCompare(b.program,'el')||a.course.localeCompare(b.course,'el'));
      by[y].forEach((n,i)=>{n._idx=i;n._count=by[y].length;});
    }
    return {map,by,keyOf};
  }

  function svgEl(tag,attrs={},text=''){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;}
  function nodeY(n,top,usable){return n._count<=1?top+usable/2:top+(n._idx/(n._count-1))*usable;}
  function wrapText(g,text,x,y,anchor,max=43){
    const words=text.split(/\s+/),lines=[];let line='';for(const w of words){const t=(line+' '+w).trim();if(t.length>max&&line){lines.push(line);line=w}else line=t}if(line)lines.push(line);
    const el=svgEl('text',{x,y,'text-anchor':anchor,fill:'#dbe6ef','font-size':11.2,'font-weight':650});lines.slice(0,2).forEach((ln,i)=>el.appendChild(svgEl('tspan',{x,dy:i?13:0},ln)));g.appendChild(el);
  }
  function showTip(ev,n){
    const t=$('#tooltip');const entry=n.first||n;
    t.innerHTML=`<div class="title">${esc(n.course||entry.course)}</div><div class="body">${esc(n.program||entry.exam_type)} · ${n.year||entry.source_year}<br><b>${esc(entry.weekday)} ${esc(n.date||entry.date)} · ${esc(n.time_label||entry.time)}</b><br>${entry.study_year?`${entry.study_year}ο έτος · ${entry.semester}ο εξάμηνο · `:''}${esc(entry.category)}${entry.flow!=='—'?` · Ροή ${esc(entry.flow)}`:''}${n.notes?.length?`<br>⚑ ${esc(n.notes.join(' · '))}`:entry.note?`<br>⚑ ${esc(entry.note)}`:''}</div>`;
    t.style.display='block';moveTip(ev);
  }
  function moveTip(ev){const t=$('#tooltip'),p=16;let x=ev.clientX+14,y=ev.clientY+14;if(x+t.offsetWidth>innerWidth-p)x=ev.clientX-t.offsetWidth-14;if(y+t.offsetHeight>innerHeight-p)y=ev.clientY-t.offsetHeight-14;t.style.left=x+'px';t.style.top=y+'px';}
  function hideTip(){$('#tooltip').style.display='none';}
  function selectCourse(c){state.highlight=state.highlight===c?'':c;state.isolate=false;$('#onlyHighlighted').classList.remove('on');render();if(state.highlight)setTimeout(scrollHighlight,30);}
  function scrollHighlight(){if(!state.highlight)return;const el=document.querySelector(`[data-course="${CSS.escape(state.highlight)}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'center'});}

  function renderAlluvial(rows){
    const svg=$('#alluvialSvg');svg.innerHTML='';
    const years=[...state.years].sort();
    if(!rows.length||!years.length){svg.setAttribute('height',300);svg.setAttribute('width',1600);svg.appendChild(svgEl('text',{x:800,y:150,fill:'#8da1b4','text-anchor':'middle'},'Δεν υπάρχουν δεδομένα με αυτά τα φίλτρα.'));$('#inspector').classList.remove('show');return;}
    const {map,by}=aggregateNodes(rows,years);
    const maxN=Math.max(...years.map(y=>by[y].length),1),gap=31,top=82,bottom=58,H=Math.max(840,top+bottom+(maxN-1)*gap),W=1740,usable=H-top-bottom;
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('width',W);svg.setAttribute('height',H);
    const xs=years.length===1?[870]:years.length===2?[630,1110]:[580,870,1160];
    years.forEach((y,i)=>{const x=xs[i];svg.appendChild(svgEl('line',{x1:x,y1:top-18,x2:x,y2:H-bottom+18,stroke:'#2a3b4b','stroke-width':2}));svg.appendChild(svgEl('text',{x,y:32,fill:'#eaf2f9','font-size':21,'font-weight':850,'text-anchor':'middle'},String(y)));svg.appendChild(svgEl('text',{x,y:55,fill:'#7890a4','font-size':11,'text-anchor':'middle'},state.exam));});

    const series=[...new Set([...map.values()].map(n=>n.series))];
    for(const s of series){
      const pts=years.map((y,i)=>map.get(`${s}|${y}`)?{x:xs[i],n:map.get(`${s}|${y}`)}:null).filter(Boolean).map(p=>({...p,y:nodeY(p.n,top,usable)}));
      if(pts.length<2)continue;
      const course=pts[0].n.course, selected=!state.highlight||state.highlight===course;
      for(let i=0;i<pts.length-1;i++){
        const a=pts[i],b=pts[i+1],mx=(a.x+b.x)/2;
        const path=svgEl('path',{d:`M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`,fill:'none',stroke:colors[a.n.category]||'#6d8295','stroke-width':state.highlight===course?5.2:2.15,opacity:selected?(state.highlight?.98:.40):.035,'stroke-linecap':'round','data-course':course});
        path.style.cursor='pointer';path.onmouseenter=e=>showTip(e,a.n);path.onmousemove=moveTip;path.onmouseleave=hideTip;path.onclick=()=>selectCourse(course);svg.appendChild(path);
      }
    }

    years.forEach((y,yi)=>{const x=xs[yi];for(const n of by[y]){
      const yy=nodeY(n,top,usable),selected=!state.highlight||state.highlight===n.course,g=svgEl('g',{'data-course':n.course,opacity:selected?1:.08});g.style.cursor='pointer';
      const col=colors[n.category]||'#ff7272';g.appendChild(svgEl('circle',{cx:x,cy:yy,r:state.highlight===n.course?6.4:4.3,fill:col,stroke:'#071018','stroke-width':1.4}));
      const side=yi===0?1:(yi===years.length-1?-1:(n._idx%2?1:-1));
      g.appendChild(svgEl('text',{x:x+side*11,y:yy+3.4,fill:state.highlight===n.course?'#fff':'#9eb2c3','font-size':9.4,'text-anchor':side>0?'start':'end'},`${n.date_short} · ${n.time_label}${state.exam==='Συνδυασμός'?(n.program==='Κανονική'?' · Κ':' · Π'):''}`));
      g.onmouseenter=e=>showTip(e,n);g.onmousemove=moveTip;g.onmouseleave=hideTip;g.onclick=()=>selectCourse(n.course);svg.appendChild(g);
    }});

    const drawSide=(year,left)=>{const xAxis=xs[years.indexOf(year)],xLab=left?24:W-24,anchor=left?'start':'end';for(const n of by[year]){
      const yy=nodeY(n,top,usable),selected=!state.highlight||state.highlight===n.course,g=svgEl('g',{'data-course':n.course,opacity:selected?1:.09});g.style.cursor='pointer';
      wrapText(g,n.course,xLab,yy-4,anchor,45);
      const meta=[n.date,n.time_label,state.exam==='Συνδυασμός'?n.program:null,n.study_year?`${n.study_year}ο έτος / ${n.semester}ο εξ.`:null,n.flow!=='—'?`Ροή ${n.flow}`:n.category].filter(Boolean).join(' · ');
      g.appendChild(svgEl('text',{x:xLab,y:yy+14,fill:'#7890a4','font-size':9.4,'text-anchor':anchor},meta));
      g.appendChild(svgEl('line',{x1:left?420:1320,y1:yy,x2:left?xAxis-9:xAxis+9,y2:yy,stroke:'#263747','stroke-width':1}));
      g.onmouseenter=e=>showTip(e,n);g.onmousemove=moveTip;g.onmouseleave=hideTip;g.onclick=()=>selectCourse(n.course);svg.appendChild(g);
    }};
    drawSide(years[0],true);if(years.length>1)drawSide(years[years.length-1],false);
    $('#alluvialHint').textContent=`${courseSet(rows).length} μαθήματα · ${maxN} σειρές στο πυκνότερο έτος`;
    renderInspector(rows);
  }

  function renderInspector(rows){
    const box=$('#inspector');if(!state.highlight){box.classList.remove('show');box.innerHTML='';return;}
    const rr=rows.filter(r=>r.course===state.highlight).sort((a,b)=>a.source_year-b.source_year||a.iso_date.localeCompare(b.iso_date)||timeRank(a.time)-timeRank(b.time));
    if(!rr.length){box.classList.remove('show');return;}
    const sample=rr[0],years=[...state.years].sort();
    box.innerHTML=`<div class="inspector-grid"><div class="ibox"><h3>Επιλεγμένο μάθημα</h3><div class="big">${esc(state.highlight)}</div><div class="sub">${sample.study_year?`${sample.study_year}ο έτος · ${sample.semester}ο εξάμηνο · `:''}${esc(sample.category)}${sample.flow!=='—'?` · Ροή ${esc(sample.flow)}`:''}</div></div>${years.map(y=>{const yr=rr.filter(r=>r.source_year===y);return `<div class="ibox"><h3>${y}</h3>${yr.length?yr.map(r=>`<div class="big">${esc(r.date_short)} · ${esc(r.time)}</div><div class="sub">${esc(r.exam_type)} · exam-day #${r.exam_day}${r.note?`<br>⚑ ${esc(r.note)}`:''}</div>`).join('<hr style="border:0;border-top:1px solid #263646">'):'<div class="sub">Δεν εμφανίζεται στα τρέχοντα φίλτρα.</div>'}</div>`}).join('')}</div>`;
    box.classList.add('show');
  }

  function renderCalendar(rows){
    const years=[...state.years].sort(),cal=$('#calendar');cal.style.gridTemplateColumns=`repeat(${Math.min(3,Math.max(1,years.length))},1fr)`;
    cal.innerHTML=years.map(y=>{const rr=rows.filter(r=>r.source_year===y).sort((a,b)=>a.iso_date.localeCompare(b.iso_date)||timeRank(a.time)-timeRank(b.time)||a.exam_type.localeCompare(b.exam_type,'el')||a.course.localeCompare(b.course,'el'));const days=[...new Set(rr.map(r=>r.date))];return `<div class="year-col"><h3>${y} <span class="muted">· ${rr.length} εγγραφές</span></h3>${days.map(d=>{const ev=rr.filter(r=>r.date===d);return `<div class="day-card"><div class="day-title"><span>${esc(ev[0].weekday)} ${esc(d)}</span><span class="muted">${ev.length} μαθήματα</span></div>${ev.map(r=>`<div class="event"><span class="time">${esc(r.time)}</span><span class="course" data-pick="${esc(r.course)}">${esc(r.course)}${r.note?`<div class="muted">⚑ ${esc(r.note)}</div>`:''}</span><span><i class="tag">${r.exam_type==='Κανονική'?'Κ':'Π'}</i><i class="tag">${r.semester?`${r.semester}ο εξ.`:'?'}</i>${r.flow!=='—'?`<i class="tag">${esc(r.flow)}</i>`:''}</span></div>`).join('')}</div>`}).join('')}</div>`}).join('')||'<div class="empty">Δεν υπάρχουν δεδομένα.</div>';
    $$('#calendar [data-pick]').forEach(x=>x.onclick=()=>selectCourse(x.dataset.pick));
  }

  function renderTable(rows){
    const sorted=[...rows].sort((a,b)=>a.source_year-b.source_year||a.iso_date.localeCompare(b.iso_date)||timeRank(a.time)-timeRank(b.time)||a.exam_type.localeCompare(b.exam_type,'el')||a.course.localeCompare(b.course,'el'));
    $('#tbody').innerHTML=sorted.map(r=>`<tr><td>${esc(r.exam_type)}</td><td>${r.source_year}</td><td>${esc(r.date)}</td><td>${esc(r.time)}</td><td class="course-cell" data-pick="${esc(r.course)}">${esc(r.course)}</td><td>${r.study_year?`${r.study_year}ο`:'—'}</td><td>${r.semester?`${r.semester}ο`:'—'}</td><td>${esc(r.category)}</td><td>${esc(r.flow)}</td><td>${esc(r.note)}</td></tr>`).join('');
    $$('#tbody [data-pick]').forEach(x=>x.onclick=()=>selectCourse(x.dataset.pick));
  }

  function renderPatterns(rows){
    const years=[...state.years].sort();
    const keyOf=r=>state.exam==='Συνδυασμός'?`${r.exam_type}|${r.course}`:r.course;
    const groups=new Map();
    for(const r of rows){const k=keyOf(r);if(!groups.has(k))groups.set(k,new Map());const ym=groups.get(k);if(!ym.has(r.source_year)||r.exam_day<ym.get(r.source_year).exam_day)ym.set(r.source_year,r);}
    const cmp=[];
    for(const [k,ym] of groups){const ys=years.filter(y=>ym.has(y));if(ys.length<2)continue;const vals=ys.map(y=>ym.get(y).exam_day),span=Math.max(...vals)-Math.min(...vals),sample=ym.get(ys[0]);cmp.push({label:state.exam==='Συνδυασμός'?`${sample.course} · ${sample.exam_type}`:sample.course,span,detail:ys.map(y=>`${y}: #${ym.get(y).exam_day} (${ym.get(y).date_short})`).join(' · ')})}
    cmp.sort((a,b)=>b.span-a.span||a.label.localeCompare(b.label,'el'));const max=Math.max(1,...cmp.map(x=>x.span)),stable=cmp.filter(x=>x.span===0).length;
    const timeConsistency=[];
    for(const [k,ym] of groups){const ys=years.filter(y=>ym.has(y));if(ys.length<2)continue;const times=ys.map(y=>ym.get(y).time);const sample=ym.get(ys[0]);timeConsistency.push({label:state.exam==='Συνδυασμός'?`${sample.course} · ${sample.exam_type}`:sample.course,same:new Set(times).size===1,times:ys.map(y=>`${y}: ${ym.get(y).time}`).join(' · ')})}
    const sameTime=timeConsistency.filter(x=>x.same).length;
    const flows={};rows.forEach(r=>flows[r.flow]=(flows[r.flow]||0)+1);const fs=Object.entries(flows).sort((a,b)=>b[1]-a[1]),fm=Math.max(1,...fs.map(x=>x[1]));
    $('#patterns').innerHTML=`
      <div class="pattern-card"><h3>Μεγαλύτερες μετακινήσεις στη normalized exam-day θέση</h3><div class="muted" style="margin-bottom:10px">Η θέση μετριέται ως ημέρα # μέσα στο εκάστοτε πρόγραμμα, ώστε να μη μας ξεγελά διαφορετική ημερομηνία έναρξης.</div>${cmp.slice(0,24).map(x=>`<div class="bar-row"><span title="${esc(x.detail)}">${esc(x.label)}</span><span class="bar-track"><i class="bar-fill" style="width:${Math.max(3,100*x.span/max)}%"></i></span><b>${x.span}</b></div>`).join('')||'<div class="muted">Χρειάζονται τουλάχιστον δύο έτη για σύγκριση.</div>'}</div>
      <div><div class="pattern-card"><h3>Σταθερότητα</h3><div class="kpi"><div class="label">Συγκρίσιμες σειρές</div><div class="value">${cmp.length}</div></div><div class="muted">${stable} κρατούν ακριβώς την ίδια exam-day θέση. ${sameTime}/${timeConsistency.length||0} κρατούν και την ίδια ώρα.</div></div><div class="pattern-card" style="margin-top:14px"><h3>Κατανομή ανά ροή</h3>${fs.map(([f,n])=>`<div class="bar-row"><span>${f==='—'?'Χωρίς ροή':'Ροή '+esc(f)}</span><span class="bar-track"><i class="bar-fill" style="width:${100*n/fm}%"></i></span><b>${n}</b></div>`).join('')}</div></div>`;
  }

  function validation(){
    const exact=new Map(), courseYearDates=new Map();
    for(const r of DATA){
      const k=[r.exam_type,r.source_year,r.date,r.time,r.course].join('|');exact.set(k,(exact.get(k)||0)+1);
      const c=[r.exam_type,r.source_year,r.course].join('|');if(!courseYearDates.has(c))courseYearDates.set(c,new Set());courseYearDates.get(c).add(r.date);
    }
    const exactDup=[...exact].filter(([,n])=>n>1);
    const multiDate=[...courseYearDates].filter(([,ds])=>ds.size>1);
    const unmapped=[...new Set(DATA.filter(r=>!r.semester).map(r=>r.course))].sort((a,b)=>a.localeCompare(b,'el'));
    const counts={};for(const p of ['Κανονική','Επί πτυχίω'])for(const y of [2024,2025,2026])counts[`${p} ${y}`]=DATA.filter(r=>r.exam_type===p&&r.source_year===y).length;
    return {exactDup,multiDate,unmapped,counts};
  }
  function renderSources(){
    const v=validation();
    $('#sources').innerHTML=`<div class="source-card"><h3>Επίσημες πηγές</h3>${SOURCES.map(s=>`<div style="margin:7px 0">• <a href="${s.url}" target="_blank" rel="noopener">${esc(s.program)} ${s.year} — ${esc(s.label)}</a></div>`).join('')}</div><div class="source-card"><h3>Validation</h3><div class="validation-list"><b>Σύνολο εγγραφών:</b> ${DATA.length}<br>${Object.entries(v.counts).map(([k,n])=>`<b>${esc(k)}:</b> ${n}`).join('<br>')}<br><b>Exact duplicate rows:</b> ${v.exactDup.length}<br><b>Ίδιο μάθημα / ίδιο πρόγραμμα / ίδιο έτος σε >1 ημερομηνία:</b> ${v.multiDate.length}${v.multiDate.length?`<br><span class="muted">${v.multiDate.map(([k,ds])=>`${esc(k)} → ${[...ds].map(esc).join(', ')}`).join('<br>')}</span>`:''}<br><b>Χωρίς metadata εξαμήνου:</b> ${v.unmapped.length}${v.unmapped.length?`<br><span class="muted">${v.unmapped.map(esc).join(' · ')}</span>`:''}<br><br><span class="muted">Σημείωση: όταν το ίδιο μάθημα εμφανίζεται σε δύο διαφορετικές ημερομηνίες στο ίδιο επίσημο πρόγραμμα, το Atlas δεν το "διορθώνει" αυθαίρετα· το κρατά όπως δημοσιεύτηκε και το επισημαίνει εδώ.</span></div></div>`;
  }

  function downloadCSV(){
    const rows=filtered();const cols=['exam_type','source_year','date','time','course','study_year','semester','category','flow','note'];
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv='\ufeff'+[cols.join(','),...rows.map(r=>cols.map(c=>q(r[c])).join(','))].join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='ece-exam-atlas-filtered.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  const exportBtn=document.createElement('button');exportBtn.className='pill';exportBtn.textContent='Εξαγωγή CSV';exportBtn.onclick=downloadCSV;$('#reset').insertAdjacentElement('afterend',exportBtn);

  function render(){
    updateHighlightOptions();const rows=filtered();renderKpis(rows);
    if(state.view==='alluvial')renderAlluvial(rows);
    else if(state.view==='calendar')renderCalendar(rows);
    else if(state.view==='table')renderTable(rows);
    else if(state.view==='patterns')renderPatterns(rows);
    else if(state.view==='sources')renderSources();
  }

  renderSources();render();
})();
