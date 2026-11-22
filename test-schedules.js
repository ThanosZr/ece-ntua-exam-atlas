const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const CORE=require('./scripts/exam-core');
const {rows:EXAM_ROWS,meta:EXAM_META,sources}=require('./scripts/load-data')();
const DATA=CORE.prepareData(EXAM_ROWS,EXAM_META,sources);
const current=EXAM_ROWS.filter(r=>r.source_year===2027);

test('2027 imports the full regular schedule, with valid dates and metadata',()=>{
  assert.equal(current.length,90);
  assert.equal(new Set(current.map(r=>r.course)).size,89);
  assert.equal(new Set(current.map(r=>r.date)).size,20);
  for(const row of current){
    assert.equal(row.exam_type,'Κανονική');
    assert.ok(EXAM_META[row.course]?.semester,row.course);
    const [d,m,y]=row.date.split('/').map(Number),date=new Date(Date.UTC(y,m-1,d));
    assert.equal(date.getUTCDate(),d);
    assert.equal(date.getUTCMonth(),m-1);
    assert.equal(y,2027);
    assert.ok(['08:30','12:00','15:00','18:00'].includes(row.time));
  }
  assert.equal(new Set(current.map(r=>[r.date,r.time,r.course].join('|'))).size,90);
});

test('the PDF page continuation and both surname groups are retained',()=>{
  const languages=current.find(r=>r.course==='Γλώσσες Προγραμματισμού ΙΙ');
  assert.equal(languages.date,'29/01/2027');
  assert.equal(languages.time,'18:00');
  const fields=current.filter(r=>r.course==='Δυναμικά Ηλεκτρομαγνητικά Πεδία');
  assert.deepEqual(fields.map(r=>r.time),['08:30','12:00']);
  assert.ok(fields.every(r=>r.date==='21/01/2027'&&r.note.includes('Α–Λ')));
  assert.notEqual(fields[0].source_title,fields[1].source_title);
  assert.ok(current.find(r=>r.course==='Φιλοσοφία').note.includes('ΣΕΜΦΕ'));
  assert.ok(current.find(r=>r.course==='Διάδοση σε Ιονισμένα Μέσα').note.includes('διδάσκοντα'));
});

test('only three common courses move relative to the period start',()=>{
  const date=s=>{const [d,m,y]=s.split('/').map(Number);return Date.UTC(y,m-1,d)/86400000;};
  const groups=year=>{
    const rows=EXAM_ROWS.filter(r=>r.source_year===year&&CORE.inferPeriod(r)==='winter');
    const start=Math.min(...rows.map(r=>date(r.date))),result=new Map();
    for(const r of rows){
      if(!result.has(r.course))result.set(r.course,[]);
      result.get(r.course).push(`${date(r.date)-start}|${r.time}`);
    }
    for(const [key,value]of result)result.set(key,value.sort().join(';'));
    return result;
  };
  const before=groups(2026),after=groups(2027);
  const common=[...before.keys()].filter(k=>after.has(k));
  assert.equal(common.length,83);
  assert.deepEqual(common.filter(k=>before.get(k)!==after.get(k)).sort(),[
    'Ηλεκτρονική ΙΙΙ','Πολιτική Οικονομία','Υλικά και Διατάξεις Προηγμένης Τεχνολογίας'
  ].sort());
  const electronics=current.find(r=>r.course==='Ηλεκτρονική ΙΙΙ');
  assert.equal(electronics.date,'11/02/2027');
  assert.equal(electronics.time,'18:00');
});

test('different published titles stay separate and missing schedules are not invented',()=>{
  assert.ok(!current.some(r=>r.course==='Αγγλική Γλώσσα'));
  assert.ok(!current.some(r=>r.exam_type==='Επί πτυχίω'));
  assert.ok(!current.some(r=>r.course==='Ηλεκτρομαγνητικά Πεδία Β'));
  assert.ok(!current.some(r=>r.course==='Νευροασαφής Έλεγχος και Εφαρμογές'));
  assert.ok(!current.some(r=>r.course==='Ανάλυση & Σχεδιασμός Πληροφοριακών Συστημάτων'));
});


test('all five periods have separate identities and the expected source coverage',()=>{
  assert.deepEqual(CORE.PERIODS.map(p=>p.id),['winter','winter-degree','spring','spring-degree','resit']);
  assert.equal(DATA.length,1728);
  const expected={'spring|2024':90,'spring|2025':90,'spring|2026':91,'spring-degree|2024':89,'spring-degree|2025':88,'spring-degree|2026':83,'resit|2024':181,'resit|2025':182,'resit|2026':180};
  for(const [key,count]of Object.entries(expected)){
    const [period,year]=key.split('|');
    const rows=DATA.filter(r=>r.period_id===period&&r.source_year===Number(year));
    assert.equal(rows.length,count,key);
    for(const row of rows){
      const source=sources.find(s=>s.id===row.source_id);
      assert.ok(source&&source.pdf_url.startsWith('https://www.ece.ntua.gr/'),key);
      assert.ok(row.source_page>=1&&row.source_page<=source.pages);
      assert.ok(row.semester>=1&&row.semester<=9);
    }
  }
});

test('explicit English start times override the generic printed row time',()=>{
  for(const year of [2025,2026]){
    const row=DATA.find(r=>r.period_id==='spring'&&r.source_year===year&&r.course==='Αγγλική Γλώσσα');
    assert.equal(row.time,'09:00');assert.equal(row.source_time,'08:30');
  }
  const row=DATA.find(r=>r.period_id==='resit'&&r.source_year===2024&&r.course==='Αγγλική Γλώσσα'&&r.date);
  assert.equal(row.time,'09:30');
});

test('the joint 2024 PDF keeps the scheduled fourth-semester English separate from the third-semester consultation',()=>{
  const rows=DATA.filter(r=>r.source_id==='spring-combined-2024'&&r.course==='Αγγλική Γλώσσα');
  assert.equal(rows.length,2);
  assert.ok(rows.some(r=>r.period_id==='spring'&&r.semester===4&&r.date==='07/06/2024'&&r.time==='15:00'));
  assert.ok(rows.some(r=>r.period_id==='spring-degree'&&r.semester===3&&!r.date&&r.source_title.includes('3ου')));
  for(const year of [2024,2025,2026]){
    const english=DATA.filter(r=>r.period_id==='resit'&&r.source_year===year&&r.course==='Αγγλική Γλώσσα');
    assert.ok(english.some(r=>r.semester===4&&r.date));
    assert.ok(english.some(r=>r.semester===3&&!r.date&&r.source_title.includes('3ου')));
  }
});

test('undated consultations and unprinted times are never assigned a fabricated slot',()=>{
  const consultations=DATA.filter(r=>r.period_id==='spring-degree'&&r.source_year===2026&&!r.date);
  assert.equal(consultations.length,57);
  assert.ok(consultations.every(r=>!r.is_scheduled&&r.period_day===null&&r.exam_day===null&&r.iso_date===''));
  const unknown=DATA.find(r=>r.period_id==='resit'&&r.source_year===2024&&r.course==='Μη γραμμικά Συστήματα Ελέγχου και Εφαρμογές');
  assert.equal(unknown.date,'11/09/2024');assert.equal(unknown.time,'');assert.equal(unknown.is_scheduled,false);
  assert.ok(!CORE.compareYears(consultations,[2025,2026]).length);
});

test('each period uses its declared PDF start, including the empty first day',()=>{
  const spring=DATA.find(r=>r.period_id==='spring'&&r.source_year===2026&&r.date==='02/06/2026');
  assert.equal(spring.period_day,1);
  const degree=DATA.find(r=>r.period_id==='spring-degree'&&r.source_year===2026&&r.date==='21/04/2026');
  assert.equal(degree.period_day,1);
  const result=CORE.compareYears(DATA.filter(r=>r.source_year>=2025),[2025,2026]);
  const keys=result.map(r=>r.period_id+'|'+r.course);
  assert.equal(new Set(keys).size,keys.length);
  assert.ok(new Set(result.map(r=>r.period_id)).size===5);
});

test('year interpretations preserve the source error and an explicit warning',()=>{
  const inferred=DATA.filter(r=>r.date_status==='inferred-year');
  assert.equal(inferred.length,8);
  assert.ok(inferred.every(r=>r.source_date&&r.source_date!==r.date&&r.note.includes('Τυπωμένο έτος')));
});

test('every nonempty course cell from all eight new PDFs is represented, with no orphan provenance',()=>{
  const cells=JSON.parse(fs.readFileSync(path.join(__dirname,'data/source-cells.json'),'utf8'));
  const imported=DATA.filter(r=>r.source_id);
  const expected=new Set(cells.map(c=>c.id)),actual=new Set(imported.map(r=>r.source_cell_id));
  assert.equal(cells.length,1070);
  assert.deepEqual([...actual].sort(),[...expected].sort());
  assert.equal(new Set(cells.map(c=>c.source_id)).size,8);
});
