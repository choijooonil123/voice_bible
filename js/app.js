/********************
 *  책 이름 매핑
 ********************/
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
  return { resolve: s => s ? (map.get(norm(s)) || null) : null };
})();

/********************
 *  입력 파서
 ********************/
let lastBook = null;
function parseReference(raw){
  if(!raw || !raw.trim()) throw new Error('입력이 비어 있습니다.');
  const s = raw.trim().replace(/[–—－~]/g,'~').replace(/-/g,'~');
  const re = /^(?:(?<book>[^\d:~]+?)\s+)?(?<c1>\d+):(?<v1>\d+)(?:\s*~\s*(?:(?<c2>\d+):)?(?<v2>\d+))?$/;
  const m = s.match(re);
  if(!m) throw new Error('형식을 인식하지 못했습니다. 예) "요 3:16~18", "요 3:16~4:2"');

  const bookInput = m.groups.book?.trim();
  let book = bookInput ? BOOK_ALIASES.resolve(bookInput) : (lastBook || null);
  if(!book) throw new Error('책 이름이 없습니다. 처음 한 번은 "요한복음 3:16"처럼 책을 포함해 주세요.');
  lastBook = book;

  const c1 = parseInt(m.groups.c1,10);
  const v1 = parseInt(m.groups.v1,10);
  const hasRange = m.groups.v2 != null;
  const c2 = hasRange && m.groups.c2 ? parseInt(m.groups.c2,10) : c1;
  const v2 = hasRange ? parseInt(m.groups.v2,10) : null;

  return { book, start:{c:c1,v:v1}, end: (v2!=null)?{c:c2,v:v2}:null };
}

/********************
 *  /bible/{책}.txt 로더 (장:절\t본문)
 ********************/
const cache = new Map();
async function loadBookText(bookName){
  if(cache.has(bookName)) return cache.get(bookName);
  const url = `./bible/${encodeURIComponent(bookName)}.txt`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`"${bookName}" 데이터를 불러오지 못했습니다.`);
  const text = await res.text();

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

/********************
 *  말하기 + 화면 동기화
 ********************/
const synth = window.speechSynthesis;
let VOICES = [];
if ('onvoiceschanged' in speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => { VOICES = synth.getVoices(); };
} else {
  setTimeout(() => { VOICES = synth.getVoices(); }, 200);
}
function awaitVoicesReady(timeoutMs = 2000){
  return new Promise(resolve => {
    const start = Date.now();
    const timer = setInterval(() => {
      VOICES = synth.getVoices();
      if (VOICES.length || Date.now() - start > timeoutMs) {
        clearInterval(timer); resolve();
      }
    }, 100);
  });
}
function pickDefaultKoVoice(){
  return VOICES.find(v => /ko/i.test(v.lang)) ||
         VOICES.find(v => /Korean|Korea/i.test(v.name)) ||
         VOICES[0] || null;
}

/* 화면용: 한 줄(=한 구절) DOM을 토큰(span)으로 구성 */
function renderLine(container, text){
  const div = document.createElement('div');
  div.className = 'line';
  const tokens = tokenize(text);               // [{text, isWord}]
  const spans = [];
  tokens.forEach(t => {
    const span = document.createElement('span');
    span.className = t.isWord ? 'tok' : 'tok sep';
    span.textContent = t.text;
    div.appendChild(span);
    spans.push(span);
  });
  container.appendChild(div);
  return { root: div, tokens, spans };
}
/* 공백/구두점 유지 토크나이즈: 단어와 그 외를 분리 */
function tokenize(s){
  // 단어(문자/숫자/한글) vs 기타(공백/구두점) 보존
  const re = /([\p{L}\p{N}]+)|([^\p{L}\p{N}]+)/gu;
  const out = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m[1]) out.push({ text: m[1], isWord: true });
    else out.push({ text: m[2], isWord: false });
  }
  return out;
}
/* boundary charIndex → 토큰 인덱스 매핑(동일 문자열 기준) */
function buildCharOffsets(tokens){
  const lens = tokens.map(t => t.text.length);
  const cum = [];
  let acc = 0;
  for (let i=0;i<lens.length;i++){ cum.push(acc); acc += lens[i]; }
  return { cum, total: acc };
}
function charIndexToTokenIndex(charIndex, offsets){
  // charIndex가 포함되는 토큰 위치 이분 탐색
  const { cum, total } = offsets;
  if (charIndex >= total) return cum.length - 1;
  let lo=0, hi=cum.length-1;
  while (lo<=hi){
    const mid = (lo+hi)>>1;
    const start = cum[mid];
    const end = start + (mid+1<cum.length ? (cum[mid+1]-start) : (total-start));
    if (charIndex < start) hi = mid-1;
    else if (charIndex >= end) lo = mid+1;
    else return mid;
  }
  return 0;
}
/* 토큰 하이라이트/공개 */
function applyProgress(spans, idx){
  // 이전 상태 초기화
  spans.forEach(s => s.classList.remove('cur'));
  // idx까지 공개
  for (let i=0;i<spans.length;i++){
    if (i <= idx) spans[i].classList.add('on');
  }
  // 현재 토큰 표시(단어에만)
  for (let j=idx; j>=0; j--){
    if (!spans[j].classList.contains('sep')) { spans[j].classList.add('cur'); break; }
  }
}

/* 발화+동기화 큐 실행 */
let currentQueue = [];
let fallbackTimer = null;
function stopSpeaking(){
  synth.cancel();
  if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null; }
  // 현재 줄 강조 제거
  currentQueue.forEach(item => item.el.root.classList.remove('reading'));
  currentQueue = [];
}
async function speakAndSync(lines, rate, pitch){
  await awaitVoicesReady(2000);
  const voice = pickDefaultKoVoice();

  // 큐 정리
  stopSpeaking();
  currentQueue = lines;

  // 각 줄을 순차 재생
  for (const item of currentQueue){
    const u = new SpeechSynthesisUtterance(item.text);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;

    // 화면 표시 준비
    const { spans, tokens } = item.el;
    const offsets = buildCharOffsets(tokens);
    let lastIdx = -1;

    // 줄 상태
    item.el.root.classList.add('reading');

    // 경계 이벤트(지원 브라우저에서 정확 동기화)
    u.onboundary = (e) => {
      // e.charIndex는 누적 문자 위치
      const ti = charIndexToTokenIndex(e.charIndex, offsets);
      if (ti !== lastIdx){
        lastIdx = ti;
        applyProgress(spans, ti);
        smoothScrollIntoView(item.el.root);
      }
    };

    // Fallback: 경계 이벤트가 거의 안 올 때, WPM 기반 추정 진행
    // 한국어 음성 속도 대략 170 WPM 가정
    const wordCount = tokens.filter(t => t.isWord).length || 1;
    const wpm = 170 * rate;
    const estMs = (wordCount / wpm) * 60000; // 전체 추정 시간
    const stepMs = Math.max(40, estMs / Math.max(8, wordCount)); // 단어 단위 근사
    let fallbackWordCursor = -1;
    let wordIndexes = tokens.map((t, i) => t.isWord ? i : -1).filter(i => i >= 0);

    // 경계가 도착하면 fallback은 자연스럽게 느려져도 무방
    fallbackTimer = setInterval(() => {
      // 경계 이벤트가 잘 오면 lastIdx는 꾸준히 증가함 → 그보다 앞서지 않도록 보수적으로
      if (wordIndexes.length === 0) return;
      const nextWordPos = Math.min(wordIndexes[Math.min(wordIndexes.length-1, fallbackWordCursor+1)], spans.length-1);
      const targetIdx = Math.max(lastIdx, nextWordPos);
      fallbackWordCursor++;
      applyProgress(spans, targetIdx);
    }, stepMs);

    u.onend = () => {
      if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null; }
      item.el.root.classList.remove('reading');
      // 마지막까지 공개 보장
      applyProgress(spans, spans.length - 1);
    };

    synth.speak(u);

    // 다음 줄로 넘어가기: 현재 발화가 끝날 때까지 대기
    await waitUntilUtteranceDone(u);
  }

  // 큐 종료
  currentQueue = [];
}
function waitUntilUtteranceDone(utt){
  return new Promise(resolve => {
    const onEnd = () => { cleanup(); resolve(); };
    const onErr = () => { cleanup(); resolve(); };
    function cleanup(){
      utt.onend = utt.onerror = utt.onboundary = null;
    }
    utt.onend = onEnd;
    utt.onerror = onErr;
  });
}
function smoothScrollIntoView(el){
  const out = document.getElementById('output');
  const top = el.offsetTop - out.clientHeight*0.3;
  out.scrollTo({ top, behavior:'smooth' });
}

/********************
 *  UI 바인딩
 ********************/
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
el.rateRange.addEventListener('input', ()=> el.rateVal.textContent  = Number(el.rateRange.value).toFixed(2));
el.pitchRange.addEventListener('input',()=> el.pitchVal.textContent = Number(el.pitchRange.value).toFixed(2));

el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await run();
});
el.btnStop.addEventListener('click', stopSpeaking);

/********************
 *  실행 흐름
 ********************/
async function run(){
  try{
    stopSpeaking(); // 이전 재생/타이머 정리
    el.output.textContent = '조회 중...';

    const parsed = parseReference(el.refInput.value);
    const bookData = await loadBookText(parsed.book);
    const { maxVerse, getVerse } = createAccessors(bookData);
    const points = expandRange(parsed, c => maxVerse(String(c)));

    // 화면 준비: 줄 렌더링과 동시에 읽을 텍스트 구성
    el.output.innerHTML = '';
    const queue = [];
    for (const p of points){
      const body = getVerse(String(p.c), String(p.v));
      const head = `${parsed.book} ${p.c}장 ${p.v}절. `;
      const lineText = body ? (head + body) : (head + '(구절 없음)');
      const elLine = renderLine(el.output, lineText);
      queue.push({ text: lineText, el: elLine });
    }

    // 말하기+동기화
    await speakAndSync(queue, Number(el.rateRange.value), Number(el.pitchRange.value));
  }catch(err){
    el.output.textContent = '오류: ' + err.message;
  }
}
