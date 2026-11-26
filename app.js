(() => {
  const RAW = window.EXAM_ROWS || [];
  const CORE=window.EXAM_CORE, PERIODS=CORE.PERIODS;
  const periodLabel=id=>CORE.PERIOD_BY_ID[id]?.label||'Όλες οι περίοδοι';
  const YEARS = [...new Set(RAW.map(r=>r.source_year))].sort((a,b)=>a-b);
  const DEFAULT_YEARS = YEARS.slice(-2);
  const META = window.EXAM_META || {};
  const SOURCES = window.EXAM_SOURCES || [];
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const colors = {'Κορμός':'#60b8ff','Ροή':'#aa8cff','Ανθρωπιστικό':'#ffcb6b','Λοιπό':'#66d69a','Μη χαρτογραφημένο':'#ff7272'};
  const timeRank = t => CORE.validTime(t)?Number(t.slice(0,2))*60+Number(t.slice(3)):1441;

  const DATA = CORE.prepareData(RAW,META,SOURCES);

  const state={
    period:'winter', years:new Set(DEFAULT_YEARS), studyYears:new Set(), semesters:new Set(),
    cats:new Set(), flows:new Set(), times:new Set(), q:'', highlight:'', isolate:false, view:'alluvial'
  };

  function baseFiltered(){
    const q=state.q.trim().toLocaleLowerCase('el');
    return DATA.filter(r =>
      (state.period==='all'||r.period_id===state.period) &&
      state.years.has(r.source_year) &&
      (!state.studyYears.size||state.studyYears.has(r.study_year)) &&
      (!state.semesters.size||state.semesters.has(r.semester)) &&
      (!state.cats.size||state.cats.has(r.category)) &&
      (!state.flows.size||state.flows.has(r.flow)) &&
      (!state.times.size||[...state.times].some(t=>t==='unscheduled'?!r.is_scheduled:r.time.startsWith(t))) &&
      (!q||r.course.toLocaleLowerCase('el').includes(q)||r.source_title.toLocaleLowerCase('el').includes(q))
    );
  }
  function filtered(){
    let rows=baseFiltered();
    if(state.isolate&&state.highlight) rows=rows.filter(r=>r.course===state.highlight);
    return rows;
  }
  const courseWord=n=>n===1?'μάθημα':'μαθήματα';
  const entryWord=n=>n===1?'εγγραφή':'εγγραφές';
  const courseSet = rows => [...new Set(rows.map(r=>r.course))].sort((a,b)=>a.localeCompare(b,'el'));

  function toggleSet(el,set,cast=x=>x){ const v=cast(el.dataset.v); if(set.has(v)){set.delete(v);el.classList.remove('on')} else {set.add(v);el.classList.add('on')} render(); }
  $$('.yr').forEach(b=>b.onclick=()=>toggleSet(b,state.years,Number));
  $$('.sy').forEach(b=>b.onclick=()=>toggleSet(b,state.studyYears,Number));
  $$('.sem').forEach(b=>b.onclick=()=>toggleSet(b,state.semesters,Number));
  $$('.cat').forEach(b=>b.onclick=()=>toggleSet(b,state.cats));
  $$('.flow').forEach(b=>b.onclick=()=>toggleSet(b,state.flows));
  $$('.tm').forEach(b=>b.onclick=()=>toggleSet(b,state.times));
  const yearSelections=new Map([['winter',new Set(DEFAULT_YEARS)]]);
  $$('.exam').forEach(b=>b.onclick=()=>{
    yearSelections.set(state.period,new Set(state.years));
    state.period=b.dataset.v;state.isolate=false;
    const available=YEARS.filter(y=>DATA.some(r=>r.source_year===y&&(state.period==='all'||r.period_id===state.period)));
    state.years=new Set(yearSelections.get(state.period)||available.slice(-2));
    if(![...state.years].some(y=>available.includes(y)))state.years=new Set(available.slice(-2));
    $$('.exam').forEach(x=>x.classList.toggle('on',x===b));
    $('#onlyHighlighted').classList.remove('on');render();
  });
  $('#search').oninput=e=>{state.q=e.target.value;render();};
  $('#highlightSelect').onchange=e=>{state.highlight=e.target.value;state.isolate=false;$('#onlyHighlighted').classList.remove('on');render();if(state.highlight)setTimeout(scrollHighlight,30);};
  $('#onlyHighlighted').onclick=()=>{if(!state.highlight)return;state.isolate=!state.isolate;$('#onlyHighlighted').classList.toggle('on',state.isolate);render();};
  $('#clearHighlight').onclick=()=>{state.highlight='';state.isolate=false;$('#onlyHighlighted').classList.remove('on');render();};
  $('#reset').onclick=()=>{
    state.period='winter';state.years=new Set(DEFAULT_YEARS);state.studyYears.clear();state.semesters.clear();state.cats.clear();state.flows.clear();state.times.clear();state.q='';state.highlight='';state.isolate=false;
    yearSelections.clear();
    $('#search').value='';$$('.pill').forEach(x=>x.classList.remove('on'));$$('.exam').forEach(x=>x.classList.toggle('on',x.dataset.v==='winter'));render();
  };
  $$('.tab').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;$$('.tab').forEach(x=>x.classList.toggle('on',x===b));$$('.view').forEach(v=>v.classList.remove('active'));$('#view-'+state.view).classList.add('active');render();});

  function updateHighlightOptions(){
    const available=courseSet(baseFiltered());
    const cur=state.highlight;
    $('#highlightSelect').innerHTML='<option value="">— επίλεξε μάθημα —</option>'+available.map(c=>`<option value="${esc(c)}" ${c===cur?'selected':''}>${esc(c)}</option>`).join('');
    if(cur&&!available.includes(cur)){state.highlight='';state.isolate=false;$('#onlyHighlighted').classList.remove('on');}
  }

  function renderKpis(rows){
    const uniq=courseSet(rows).length,scheduled=rows.filter(r=>r.is_scheduled),years=[...state.years].sort();
    const m=new Map();
    rows.forEach(r=>{const k=r.period_id+'|'+r.course;if(!m.has(k))m.set(k,new Set());m.get(k).add(r.source_year)});
    const allYears=[...m.values()].filter(s=>years.length&&years.every(y=>s.has(y))).length;
    $('#kpis').innerHTML=[
      ['Εγγραφές',rows.length],['Μοναδικά μαθήματα',uniq],['Με ορισμένη ημέρα και ώρα',scheduled.length],['Χωρίς ορισμένη ημέρα ή ώρα',rows.length-scheduled.length],['Κοινά στα επιλεγμένα έτη',allYears]
    ].map(([l,v])=>`<div class="card kpi"><div class="label">${l}</div><div class="value">${v}</div></div>`).join('');
    $('#resultCount').textContent=`${rows.length} ${entryWord(rows.length)} · ${uniq} ${courseWord(uniq)}${state.isolate?' · απομόνωση ενεργή':''}`;
  }

  function sourceFor(r){
    return SOURCES.find(s=>s.id&&s.id===r.source_id)||SOURCES.find(s=>s.year===r.source_year&&s.program===(r.period_id==='winter-degree'?'Επί πτυχίω':'Κανονική'));
  }
  function sourceLink(r){
    const s=sourceFor(r);if(!s)return '';
    const url=(s.pdf_url||s.url)+(r.source_page?'#page='+r.source_page:'');
    return `<a class="source-link" href="${esc(url)}" target="_blank" rel="noopener">Πηγή${r.source_page?' · σελ. '+r.source_page:''}</a>`;
  }

  function aggregateNodes(rows, years){
    const keyOf=r=>state.period==='all'?`${r.period_id}|${r.course}`:r.course;
    const map=new Map();
    for(const r of rows){
      const k=`${keyOf(r)}|${r.source_year}`;
      if(!map.has(k)) map.set(k,{series:keyOf(r),course:r.course,program:r.period_id,year:r.source_year,entries:[],semester:r.semester,study_year:r.study_year,category:r.category,flow:r.flow});
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
    t.innerHTML=`<div class="title">${esc(n.course||entry.course)}</div><div class="body">${esc(periodLabel(n.program||entry.period_id))} · ${n.year||entry.source_year}<br><b>${esc(entry.weekday)} ${esc(n.date||entry.date)} · ${esc(n.time_label||entry.time)}</b><br>${entry.study_year?`${entry.study_year}ο έτος · ${entry.semester}ο εξάμηνο · `:''}${esc(entry.category)}${entry.flow!=='—'?` · Ροή ${esc(entry.flow)}`:''}${n.notes?.length?`<br>⚑ ${esc(n.notes.join(' · '))}`:entry.note?`<br>⚑ ${esc(entry.note)}`:''}</div>`;
    t.style.display='block';moveTip(ev);
  }
  function moveTip(ev){const t=$('#tooltip'),p=16;let x=ev.clientX+14,y=ev.clientY+14;if(x+t.offsetWidth>innerWidth-p)x=ev.clientX-t.offsetWidth-14;if(y+t.offsetHeight>innerHeight-p)y=ev.clientY-t.offsetHeight-14;t.style.left=x+'px';t.style.top=y+'px';}
  function hideTip(){$('#tooltip').style.display='none';}
  function selectCourse(c){state.highlight=state.highlight===c?'':c;state.isolate=false;$('#onlyHighlighted').classList.remove('on');render();if(state.highlight)setTimeout(scrollHighlight,30);}
  function scrollHighlight(){if(!state.highlight)return;const el=document.querySelector(`[data-course="${CSS.escape(state.highlight)}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'center'});}

  function renderAlluvial(allRows){
    const rows=allRows.filter(r=>r.is_scheduled);
    const svg=$('#alluvialSvg');svg.innerHTML='';
    const years=[...state.years].sort();
    if(!rows.length||!years.length){svg.setAttribute('viewBox','0 0 1600 300');svg.setAttribute('height',300);svg.setAttribute('width',1600);svg.appendChild(svgEl('text',{x:800,y:150,fill:'#8da1b4','text-anchor':'middle'},'Δεν υπάρχουν δεδομένα με αυτά τα φίλτρα.'));$('#alluvialHint').textContent='Οι εγγραφές χωρίς ημερομηνία ή ώρα εμφανίζονται στο ημερολόγιο και στον πίνακα.';renderInspector(allRows);return;}
    const {map,by}=aggregateNodes(rows,years);
    const maxN=Math.max(...years.map(y=>by[y].length),1),gap=31,top=82,bottom=58,H=Math.max(840,top+bottom+(maxN-1)*gap),W=1740+Math.max(0,years.length-3)*290,usable=H-top-bottom;
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('width',W);svg.setAttribute('height',H);
    const xs=years.length===1?[870]:years.length===2?[630,1110]:years.map((_,i)=>580+i*290);
    years.forEach((y,i)=>{const x=xs[i];svg.appendChild(svgEl('line',{x1:x,y1:top-18,x2:x,y2:H-bottom+18,stroke:'#2a3b4b','stroke-width':2}));svg.appendChild(svgEl('text',{x,y:32,fill:'#eaf2f9','font-size':21,'font-weight':850,'text-anchor':'middle'},String(y)));svg.appendChild(svgEl('text',{x,y:55,fill:'#7890a4','font-size':11,'text-anchor':'middle'},periodLabel(state.period)));});

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
      g.appendChild(svgEl('text',{x:x+side*11,y:yy+3.4,fill:state.highlight===n.course?'#fff':'#9eb2c3','font-size':9.4,'text-anchor':side>0?'start':'end'},`${n.date_short} · ${n.time_label}${state.period==='all'?' · '+CORE.PERIOD_BY_ID[n.program].short:''}`));
      g.onmouseenter=e=>showTip(e,n);g.onmousemove=moveTip;g.onmouseleave=hideTip;g.onclick=()=>selectCourse(n.course);svg.appendChild(g);
    }});

    const drawSide=(year,left)=>{const xAxis=xs[years.indexOf(year)],xLab=left?24:W-24,anchor=left?'start':'end';for(const n of by[year]){
      const yy=nodeY(n,top,usable),selected=!state.highlight||state.highlight===n.course,g=svgEl('g',{'data-course':n.course,opacity:selected?1:.09});g.style.cursor='pointer';
      wrapText(g,n.course,xLab,yy-4,anchor,45);
      const meta=[n.date,n.time_label,state.period==='all'?periodLabel(n.program):null,n.study_year?`${n.study_year}ο έτος / ${n.semester}ο εξ.`:null,n.flow!=='—'?`Ροή ${n.flow}`:n.category].filter(Boolean).join(' · ');
      g.appendChild(svgEl('text',{x:xLab,y:yy+14,fill:'#7890a4','font-size':9.4,'text-anchor':anchor},meta));
      g.appendChild(svgEl('line',{x1:left?420:W-420,y1:yy,x2:left?xAxis-9:xAxis+9,y2:yy,stroke:'#263747','stroke-width':1}));
      g.onmouseenter=e=>showTip(e,n);g.onmousemove=moveTip;g.onmouseleave=hideTip;g.onclick=()=>selectCourse(n.course);svg.appendChild(g);
    }};
    drawSide(years[0],true);if(years.length>1)drawSide(years[years.length-1],false);
    $('#alluvialHint').textContent=`${courseSet(rows).length} ${courseWord(courseSet(rows).length)} με ορισμένη εξέταση · ${allRows.length-rows.length} εγγραφές χωρίς ορισμένη ημέρα ή ώρα`;
    renderInspector(allRows);
  }

  function renderInspector(rows){
    const box=$('#inspector');if(!state.highlight){box.classList.remove('show');box.innerHTML='';return;}
    const rr=rows.filter(r=>r.course===state.highlight).sort((a,b)=>a.source_year-b.source_year||a.iso_date.localeCompare(b.iso_date)||timeRank(a.time)-timeRank(b.time));
    if(!rr.length){box.classList.remove('show');return;}
    const sample=rr[0],years=[...state.years].sort();
    box.innerHTML=`<div class="inspector-grid"><div class="ibox"><h3>Επιλεγμένο μάθημα</h3><div class="big">${esc(state.highlight)}</div><div class="sub">${sample.study_year&&state.period!=='all'?`${sample.study_year}ο έτος · ${sample.semester}ο εξάμηνο · `:''}${esc(sample.category)}${sample.flow!=='—'?` · Ροή ${esc(sample.flow)}`:''}</div></div>${years.map(y=>{const yr=rr.filter(r=>r.source_year===y);return `<div class="ibox"><h3>${y}</h3>${yr.length?yr.map(r=>`<div class="big">${esc(r.date_short)} · ${esc(r.time||'Απροσδιόριστη ώρα')}</div><div class="sub">${esc(r.period_label)} · ${r.semester}ο εξάμηνο${r.exam_day?' · ημέρα προγράμματος #'+r.exam_day:' · χωρίς ορισμένη ημέρα ή ώρα'} · ${sourceLink(r)}${r.note?`<br>⚑ ${esc(r.note)}`:''}</div>`).join('<hr style="border:0;border-top:1px solid #263646">'):'<div class="sub">Δεν εμφανίζεται στα τρέχοντα φίλτρα.</div>'}</div>`}).join('')}</div>`;
    box.classList.add('show');
  }

  function renderCalendar(rows){
    const years=[...state.years].sort(),cal=$('#calendar');cal.style.setProperty('--calendar-columns',Math.min(3,Math.max(1,years.length)));
    cal.innerHTML=years.map(y=>{const rr=rows.filter(r=>r.source_year===y).sort((a,b)=>a.iso_date.localeCompare(b.iso_date)||timeRank(a.time)-timeRank(b.time)||a.period_id.localeCompare(b.period_id,'el')||a.course.localeCompare(b.course,'el'));const days=[...new Set(rr.map(r=>r.date))].filter(Boolean);return `<div class="year-col"><h3>${y} <span class="muted">· ${rr.length} ${entryWord(rr.length)}</span></h3>${rr.filter(r=>!r.date).length?`<div class="day-card"><div class="day-title">Χωρίς ορισμένη ημερομηνία</div>${rr.filter(r=>!r.date).map(r=>`<div class="event"><span class="time">Συνεν.</span><span class="course" data-pick="${esc(r.course)}">${esc(r.course)}<div class="muted">${esc(r.note)}</div></span><span><i class="tag">${CORE.PERIOD_BY_ID[r.period_id].short}</i>${sourceLink(r)}</span></div>`).join('')}</div>`:''}${days.map(d=>{const ev=rr.filter(r=>r.date===d);return `<div class="day-card"><div class="day-title"><span>${esc(ev[0].weekday)} ${esc(d)}</span><span class="muted">${ev.length} ${courseWord(ev.length)}</span></div>${ev.map(r=>`<div class="event"><span class="time">${esc(r.time||'—')}</span><span class="course" data-pick="${esc(r.course)}">${esc(r.course)}${r.note?`<div class="muted">⚑ ${esc(r.note)}</div>`:''}</span><span><i class="tag">${CORE.PERIOD_BY_ID[r.period_id].short}</i><i class="tag">${r.semester?`${r.semester}ο εξ.`:'?'}</i>${r.flow!=='—'?`<i class="tag">${esc(r.flow)}</i>`:''}${sourceLink(r)}</span></div>`).join('')}</div>`}).join('')}</div>`}).join('')||'<div class="empty">Δεν υπάρχουν δεδομένα.</div>';
    $$('#calendar [data-pick]').forEach(x=>x.onclick=()=>selectCourse(x.dataset.pick));
  }

  function renderTable(rows){
    const sorted=[...rows].sort((a,b)=>a.source_year-b.source_year||a.iso_date.localeCompare(b.iso_date)||timeRank(a.time)-timeRank(b.time)||a.period_id.localeCompare(b.period_id,'el')||a.course.localeCompare(b.course,'el'));
    $('#tbody').innerHTML=sorted.map(r=>`<tr><td>${esc(r.period_label)}</td><td>${r.source_year}</td><td>${esc(r.date||'Δεν έχει οριστεί')}</td><td>${esc(r.time||'Δεν έχει οριστεί')}</td><td class="course-cell" data-pick="${esc(r.course)}">${esc(r.course)}</td><td>${r.study_year?`${r.study_year}ο`:'—'}</td><td>${r.semester?`${r.semester}ο`:'—'}</td><td>${esc(r.category)}</td><td>${esc(r.flow)}</td><td>${esc(r.note)} ${sourceLink(r)}</td></tr>`).join('');
    $$('#tbody [data-pick]').forEach(x=>x.onclick=()=>selectCourse(x.dataset.pick));
  }

  function renderPatterns(rows){
    const years=[...state.years].sort();
    const cmp=CORE.compareYears(rows,years).map(x=>({...x,
      label:state.period==='all'?`${x.course} · ${x.period_label}`:x.course,
      detail:x.entries.map(e=>`${e.year}: ${e.rows.map(r=>`${r.date_short} ${r.time}`).join(' / ')}`).join(' · ')
    }));
    const changed=cmp.filter(x=>!x.unchanged),max=Math.max(1,...cmp.map(x=>x.span));
    const stable=cmp.filter(x=>x.unchanged).length,sameTime=cmp.filter(x=>x.sameTime).length;
    const flows={};rows.forEach(r=>flows[r.flow]=(flows[r.flow]||0)+1);
    const fs=Object.entries(flows).sort((a,b)=>b[1]-a[1]),fm=Math.max(1,...fs.map(x=>x[1]));
    $('#patterns').innerHTML=`
      <div class="pattern-card"><h3>Μετακινήσεις μέσα στην εξεταστική</h3><div class="muted" style="margin-bottom:10px">Μετράμε ημερολογιακές ημέρες από την έναρξη κάθε προγράμματος, πριν από τα φίλτρα. Οι κενές ημέρες και οι αργίες διατηρούνται. Διαφορετικοί τίτλοι δεν ταυτίζονται αυτόματα. Στην επιλογή «Όλες οι περίοδοι» κάθε περίοδος συγκρίνεται χωριστά. Οι εγγραφές χωρίς ημερομηνία ή ώρα εξαιρούνται.</div>${changed.slice(0,24).map(x=>`<div class="bar-row"><span title="${esc(x.detail)}">${esc(x.label)}<br><small class="muted">${esc(x.detail)}</small></span><span class="bar-track"><i class="bar-fill" style="width:${Math.max(3,100*x.span/max)}%"></i></span><b>${x.span}</b></div>`).join('')||'<div class="muted">'+(cmp.length?'Δεν υπάρχουν αλλαγές θέσης ή ώρας στα κοινά μαθήματα.':'Χρειάζονται τουλάχιστον δύο έτη με κοινά μαθήματα για σύγκριση.')+'</div>'}</div>
      <div><div class="pattern-card"><h3>Σταθερότητα κοινών μαθημάτων</h3><div class="kpi"><div class="label">Συγκρίσιμες σειρές</div><div class="value">${cmp.length}</div></div><div class="muted">${stable} κρατούν ακριβώς την ίδια θέση και όλες τις ώρες εξέτασης. ${sameTime}/${cmp.length} κρατούν τις ίδιες ώρες.</div></div><div class="pattern-card" style="margin-top:14px"><h3>Κατανομή ανά ροή</h3>${fs.map(([f,n])=>`<div class="bar-row"><span>${f==='—'?'Χωρίς ροή':'Ροή '+esc(f)}</span><span class="bar-track"><i class="bar-fill" style="width:${100*n/fm}%"></i></span><b>${n}</b></div>`).join('')}</div></div>`;
  }

  function validation(){
    const exact=new Map(), courseYearDates=new Map();
    for(const r of DATA){
      const k=[r.period_id,r.source_year,r.date,r.time,r.course].join('|');exact.set(k,(exact.get(k)||0)+1);
      const c=[r.period_id,r.source_year,r.course].join('|');if(!courseYearDates.has(c))courseYearDates.set(c,new Set());if(r.date)courseYearDates.get(c).add(r.date);
    }
    const exactDup=[...exact].filter(([,n])=>n>1);
    const multiDate=[...courseYearDates].filter(([,ds])=>ds.size>1);
    const unmapped=[...new Set(DATA.filter(r=>!r.semester).map(r=>r.course))].sort((a,b)=>a.localeCompare(b,'el'));
    const counts={};for(const p of PERIODS)for(const y of YEARS)counts[`${p.label} ${y}`]=DATA.filter(r=>r.period_id===p.id&&r.source_year===y).length;
    return {exactDup,multiDate,unmapped,counts};
  }
  function renderSources(){
    const v=validation(),years=[...state.years];
    const selected=SOURCES.filter(s=>s.program!=='Metadata'&&years.includes(s.year)&&(state.period==='all'||s.periods?.includes(state.period)||(!s.periods&&s.program===(state.period==='winter'?'Κανονική':state.period==='winter-degree'?'Επί πτυχίω':'—'))));
    $('#sources').innerHTML=`<div class="source-card"><h3>Πηγές για την επιλεγμένη περίοδο και τα έτη</h3>${selected.map(s=>`<div class="source-entry"><a href="${esc(s.url)}" target="_blank" rel="noopener">${s.year} · ${esc(s.label)}</a>${s.pdf_url?`<br><a href="${esc(s.pdf_url)}" target="_blank" rel="noopener">Επίσημο PDF · ${s.pages} σελίδες</a>`:''}</div>`).join('')||'<p>Δεν έχει ενσωματωθεί πηγή για αυτή την επιλογή.</p>'}<p class="muted">Κάθε νέα εγγραφή παραπέμπει στη σελίδα του επίσημου PDF. Οι πρωτότυποι τίτλοι, οι ειδικές ώρες και οι σημειώσεις διατηρούνται. Πρόγραμμα που δεν έχει εισαχθεί δεν συμπληρώνεται από άλλο έτος.</p></div><div class="source-card"><h3>Έλεγχος ολόκληρου του αρχείου</h3><div class="validation-list"><b>Σύνολο εγγραφών:</b> ${DATA.length}<br>${Object.entries(v.counts).filter(([,n])=>n).map(([k,n])=>`<b>${esc(k)}:</b> ${n}`).join('<br>')}<br><b>Ακριβείς διπλοεγγραφές:</b> ${v.exactDup.length}<br><b>Μαθήματα σε περισσότερες ημερομηνίες της ίδιας περιόδου:</b> ${v.multiDate.length}<br><b>Χωρίς metadata εξαμήνου:</b> ${v.unmapped.length}<br><br><span class="muted">Οι διαφορετικές δημοσιευμένες ημερομηνίες παραμένουν χωριστές εγγραφές. Οι ερμηνείες τυπογραφικών σφαλμάτων έτους σημειώνονται στην αντίστοιχη εγγραφή.</span></div></div>`;
  }

  function downloadCSV(){
    const rows=filtered();const cols=['period_id','period_label','source_year','date','time','course','source_title','study_year','semester','category','flow','note','source_id','source_page','source_cell_id','source_time','source_date','date_status'];
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv='\ufeff'+[cols.join(','),...rows.map(r=>cols.map(c=>q(r[c])).join(','))].join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='ece-exam-atlas-filtered.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  const exportBtn=document.createElement('button');exportBtn.className='pill';exportBtn.textContent='Εξαγωγή CSV';exportBtn.onclick=downloadCSV;$('#reset').insertAdjacentElement('afterend',exportBtn);

  function render(){
    const available=new Set(DATA.filter(r=>state.period==='all'||r.period_id===state.period).map(r=>r.source_year));
    for(const y of state.years)if(!available.has(y))state.years.delete(y);
    $$('.yr').forEach(b=>{
      b.disabled=!available.has(Number(b.dataset.v));
      b.title=b.disabled?'Δεν έχει ενσωματωθεί πρόγραμμα για αυτό το έτος.':'';
      b.classList.toggle('on',state.years.has(Number(b.dataset.v)));
    });
    const p=CORE.PERIOD_BY_ID[state.period];
    $('#periodTitle').textContent=p?p.label:'Όλες οι περίοδοι';
    $('#periodDescription').textContent=p?p.description:'Κάθε περίοδος διατηρεί τη δική της σειρά και αφετηρία. Οι γραμμές συνδέουν μόνο την ίδια περίοδο σε διαφορετικά έτη.';
    $('#availabilityNote').textContent='Διαθέσιμα έτη: '+[...available].sort().join(', ')+'. Το έτος δηλώνει το έτος εξέτασης.'+((state.period==='winter-degree'||state.period==='all')&&state.years.has(2024)?' Η πτυχιακή χειμερινού 2024 πραγματοποιήθηκε τον Απρίλιο, σύμφωνα με το επίσημο πρόγραμμα.':'');
    $$('.pill[data-v]').forEach(b=>b.setAttribute('aria-pressed',String(b.classList.contains('on'))));
    updateHighlightOptions();const rows=filtered();renderKpis(rows);
    if(state.view==='alluvial')renderAlluvial(rows);
    else if(state.view==='calendar')renderCalendar(rows);
    else if(state.view==='table')renderTable(rows);
    else if(state.view==='patterns')renderPatterns(rows);
    else if(state.view==='sources')renderSources();
  }

  render();
})();
