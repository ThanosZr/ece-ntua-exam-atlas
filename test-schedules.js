const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
global.window=global;
const scripts=[...fs.readFileSync(path.join(__dirname,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
for(const file of scripts.filter(f=>f==='metadata.js'||f.startsWith('data/')))require(path.join(__dirname,file));
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
    const rows=EXAM_ROWS.filter(r=>r.source_year===year&&r.exam_type==='Κανονική');
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
