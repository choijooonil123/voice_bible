// ===== 책 이름 매핑(표준책이름 ← 다양한 별칭) =====
const BOOK_ALIASES = (() => {
  const map = new Map();
  const norm = s => s.toLowerCase().replace(/\s+/g,'');
  const add = (canon, aliases=[]) => {
    map.set(norm(canon), canon);
    aliases.forEach(a => map.set(norm(a), canon));
  };
  // 구약
  add('창세기',['창','창세','gen','genesis']);
  add('출애굽기',['출','출애굽','exo','exodus']);
  add('레위기',['레','lev','leviticus']);
  add('민수기',['민','num','numbers']);
  add('신명기',['신','deut','deuteronomy']);
  add('여호수아',['수','jos','joshua']);
  add('사사기',['삿','judg','judges']);
  add('룻기',['룻','rut','ruth']);
  add('사무엘상',['삼상','1sam','1sa']);
  add('사무엘하',['삼하','2sam','2sa']);
  add('열왕기상',['왕상','1ki','1kgs']);
  add('열왕기하',['왕하','2ki','2kgs']);
  add('역대상',['대상','1ch','1chr']);
  add('역대하',['대하','2ch','2chr']);
  add('에스라',['스','ezr','ezra']);
  add('느헤미야',['느','neh','nehemiah']);
  add('에스더',['에','est','esther']);
  add('욥기',['욥','job']);
  add('시편',['시','ps','psalm','psalms']);
  add('잠언',['잠','pr','prov','proverbs']);
  add('전도서',['전','eccl','ecclesiastes','qohelet']);
  add('아가',['아','song','songofsolomon','songs']);
  add('이사야',['사','isa','isaiah']);
  add('예레미야',['렘','jer','jeremiah']);
  add('예레미야애가',['애','lam','lamentations']);
  add('에스겔',['겔','ezk','ezekiel']);
  add('다니엘',['단','dan','daniel']);
  add('호세아',['호','hos','hosea']);
  add('요엘',['욜','joel','jl']);
  add('아모스',['암','amos','am']);
  add('오바댜',['옵','obadiah','ob']);
  add('요나',['욘','jonah','jon']);
  add('미가',['미','micah','mic']);
  add('나훔',['나','nahum','nah']);
  add('하박국',['합','habakkuk','hab']);
  add('스바냐',['습','zephaniah','zep']);
  add('학개',['학','haggai','hag']);
  add('스가랴',['슥','zechariah','zec']);
  add('말라기',['말','malachi','mal']);
  // 신약
  add('마태복음',['마','마태','matt','mt','matthew']);
  add('마가복음',['막','마가','mk','mrk','mark']);
  add('누가복음',['눅','누가','lk','luke']);
  add('요한복음',['요','요한','jn','john']);
  add('사도행전',['행','acts','ac']);
  add('로마서',['롬','rom','romans']);
  add('고린도전서',['고전','1co','1cor']);
  add('고린도후서',['고후','2co','2cor']);
  add('갈라디아서',['갈','gal','galatians']);
  add('에베소서',['엡','eph','ephesians']);
  add('빌립보서',['빌','php','philippians']);
  add('골로새서',['골','col','colossians']);
  add('데살로니가전서',['살전','1th','1thess']);
  add('데살로니가후서',['살후','2th','2thess']);
  add('디모데전서',['딤전','1ti','1tim']);
  add('디모데후서',['딤후','2ti','2tim']);
  add('디도서',['딛','tit','titus']);
  add('빌레몬서',['몬','phm','philemon']);
  add('히브리서',['히','heb','hebrews']);
  add('야고보서',['약','jas','james']);
  add('베드로전서',['벧전','1pe','1pet']);
  add('베드로후서',['벧후','2pe','2pet']);
  add('요한일서',['요일','1jn','1john']);
  add('요한이서',['요이','2jn','2john']);
  add('요한삼서',['요삼','3jn','3john']);
  add('유다서',['유','jud','jude']);
  add('요한계시록',['계','계시록','rev','revelation']);

  return {
    resolve: s => s ? (map.get(norm(s)) || null) : null
  };
})();

// ===== 입력 파서 =====
// 허용: "요 3:16", "요 3:16~18", "요 3:16~4:2", 그리고 (이전 책 기억 후) "3:16" 등
let lastBook = null; // 사용자 편의를 위한 "마지막 사용 책" 기억
function parseReference(raw){
  if(!raw || !raw.trim()) throw new Error('입력이 비어 있습니다.');
  const s = raw.trim().replace(/[–—－~]/g,'~').replace(/-/g,'~');
  const re = /^(?:(?<book>[^\d:~]+?)\s+)?(?<c1>\d+):(?<v1>\d+)(?:\s*~\s*(?:(?<c2>\d+):)?(?<v2>\d+))?$/;
  const m = s.match(re);
  if(!m) throw new Error('형식을 인식하지 못했습니다. 예) "요 3:16~18", "요 3:16~4:2"');

  const bookInput = m.groups.book?.trim();
  let book = bookInput ? BOOK_ALIASES.resolve(bookInput) : (lastBook || null);
  if(!book){
    throw new Error('책 이름이 없습니다. 처음 한 번은 "요한복음 3:16"처럼 책을 포함해 주세요.');
  }
  // 성공적으로 책을 얻었으면 기억
  lastBook = book;

  const c1 = parseInt(m.groups.c1,10);
  const v1 = parseInt(m.groups.v1,10);
  const hasRange = m.groups.v2 != null;
  const c2 = hasRange && m.groups.c2 ? parseInt(m.groups.c2,10) : c1;
  const v2 = hasRange ? parseInt(m.groups.v2,10) : null;

  return { book, start:{c:c1,v:v1}, end: (v2!=null)?{c:c2,v:v2}:null };
}

// ===== /bible/{책}.txt 로더 (장:절\t본문) =====
const cache = new Map();
async function loadBookText(bookName){
  if(cache.has(bookName)) return cache.get(bookName);
  const url = `./bible/${encodeURIComponent(bookName)}.txt`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`"${bookName}" 데이터를 불러오지 못했습니다.`);
  const text = await res.text();

  // 파싱
  const chapters = {};
  text.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if(!trimmed) return;
    const m = trimmed.match(/^(\d+):(\d+)\s+(.*)$/);
    if(!m) return;
    const ch = m[1], vs = m[2], body = m[3];
    (chapters[ch] ||= {})[vs] = body;
  });
  cache.set(bookName, chapters);
  return chapters;
}
function createAccessors(bookData){
  const chapters = bookData;
  const maxVerse = ch => {
    const vs = chapters[ch];
    if(!vs) return 0;
    return Math.max(...Object.keys(vs).map(Number));
  };
  const getVerse = (ch,v) => chapters?.[ch]?.[v] ?? null;
  return { maxVerse, getVerse };
}

// ===== 범위 확장 =====
function expandRange(range, getMaxVerse){
  const out = [];
  const { start, end } = range;
  if(!end){ out.push({c:start.c, v:start.v}); return out; }
  if(end.c < start.c || (end.c===start.c && end.v < start.v))
    throw new Error('끝절이 시작절보다 앞설 수 없습니다.');
  for(let c = start.c; c <= end.c; c++){
    const vStart = (c===start.c)? start.v : 1;
    const vEnd   = (c===end.c)? end.v : getMaxVerse(String(c));
    for(let v=vStart; v<=vEnd; v++) out.push({c,v});
  }
  return out;
}

// ===== TTS: 음성 자동 선택(목록 UI 없음) =====
const synth = window.speechSynthesis;
let VOICES = [];

function loadVoicesOnce(){
  VOICES = synth.getVoices();
}
if ('onvoiceschanged' in speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => { VOICES = synth.getVoices(); };
} else {
  // 일부 브라우저 즉시 로드
  setTimeout(() => { VOICES = synth.getVoices(); }, 200);
}

// 음성 목록이 비어있을 수 있어, 준비될 때까지 대기(최대 2초)
function awaitVoicesReady(timeoutMs = 2000){
  return new Promise(resolve => {
    const start = Date.now();
    const timer = setInterval(() => {
      VOICES = synth.getVoices();
      if (VOICES.length || Date.now() - start > timeoutMs) {
        clearInterval(timer);
        resolve();
      }
    }, 100);
  });
}

function pickDefaultKoVoice(){
  return VOICES.find(v => /ko/i.test(v.lang)) ||
         VOICES.find(v => /Korean|Korea/i.test(v.name)) ||
         VOICES[0] || null;
}

function speakLines(lines, { rate=1.0, pitch=1.0, voice=null } = {}){
  if(!lines.length) return;
  lines.forEach(text => {
    const u = new SpeechSynthesisUtterance(text);
    if(voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    synth.speak(u);
  });
}

function stopSpeaking(){ synth.cancel(); }

// ===== UI 바인딩 =====
const el = {
  form      : document.getElementById('lookupForm'),
  refInput  : document.getElementById('refInput'),
  output    : document.getElementById('output'),
  btnStop   : document.getElementById('btnStop'),
  rateRange : document.getElementById('rateRange'),
  rateVal   : document.getElementById('rateVal'),
  pitchRange: document.getElementById('pitchRange'),
  pitchVal  : document.getElementById('pitchVal'),
};

// 값 라벨 업데이트
el.rateRange.addEventListener('input', ()=> el.rateVal.textContent  = Number(el.rateRange.value).toFixed(2));
el.pitchRange.addEventListener('input',()=> el.pitchVal.textContent = Number(el.pitchRange.value).toFixed(2));

// Enter 실행: form submit 사용 (모바일/데스크탑 모두 안정적)
el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await run(); // 버튼 클릭 없이 Enter만으로도 실행
});

// 정지 버튼
el.btnStop.addEventListener('click', stopSpeaking);

// 핵심 실행
async function run(){
  try{
    el.output.textContent = '조회 중...';
    const parsed = parseReference(el.refInput.value);
    const bookData = await loadBookText(parsed.book);
    const { maxVerse, getVerse } = createAccessors(bookData);
    const points = expandRange(parsed, c => maxVerse(String(c)));

    const lines = [];
    const speak = [];
    for(const p of points){
      const head = `${parsed.book} ${p.c}:${p.v}`;
      const body = getVerse(String(p.c), String(p.v));
      if(!body) lines.push(`${head}  (구절 없음)`);
      else {
        lines.push(`${head}  ${body}`);
        speak.push(`${parsed.book} ${p.c}장 ${p.v}절. ${body}`);
      }
    }
    el.output.textContent = lines.join('\n');

    // 음성 준비 대기 후 자동 선택
    await awaitVoicesReady(2000);
    const voice = pickDefaultKoVoice();
    speakLines(speak, {
      voice,
      rate : Number(el.rateRange.value),
      pitch: Number(el.pitchRange.value),
    });
  }catch(err){
    el.output.textContent = '오류: ' + err.message;
  }
}
