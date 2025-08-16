// ===== 0) 책 이름 매핑 =====
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
    resolve: s => s ? (map.get(norm(s)) || null) : null,
    allBooks: () => [...new Set([...map.values()])]
  };
})();

// ===== 1) 파서 =====
function parseReference(raw, currentBook){
  if(!raw || !raw.trim()) throw new Error('입력이 비어 있습니다.');
  const s = raw.trim().replace(/[–—－~]/g,'~').replace(/-/g,'~');
  const re = /^(?:(?<book>[^\d:~]+?)\s+)?(?<c1>\d+):(?<v1>\d+)(?:\s*~\s*(?:(?<c2>\d+):)?(?<v2>\d+))?$/;
  const m = s.match(re);
  if(!m) throw new Error('형식을 인식하지 못했습니다. 예) "요 3:16~18", "3:16~4:2"');

  const bookInput = m.groups.book?.trim();
  let book = bookInput ? BOOK_ALIASES.resolve(bookInput) : null;
  if(!book){
    if(!currentBook) throw new Error('책 이름이 없고 현재 책도 선택되지 않았습니다.');
    book = currentBook;
  }

  const c1 = parseInt(m.groups.c1,10);
  const v1 = parseInt(m.groups.v1,10);
  const hasRange = m.groups.v2 != null;
  const c2 = hasRange && m.groups.c2 ? parseInt(m.groups.c2,10) : c1;
  const v2 = hasRange ? parseInt(m.groups.v2,10) : null;

  return { book, start:{c:c1,v:v1}, end: (v2!=null)?{c:c2,v:v2}:null };
}

// ===== 2) 로더 & 접근자 =====
const cache = new Map();
async function loadBookText(bookName){
  if(cache.has(bookName)) return cache.get(bookName);
  const url = `./bible/${encodeURIComponent(bookName)}.txt`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`"${bookName}" 데이터를 불러오지 못했습니다.`);
  const text = await res.text();
  // "3:16\t본문" 형태를 객체로 변환
  const chapters = {};
  text.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if(!line) return;
    const m = line.match(/^(\d+):(\d+)\s+(.*)$/);
    if(!m) return;
    const ch = m[1], vs = m[2], body = m[3];
    chapters[ch] ??= {};
    chapters[ch][vs] = body;
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

// ===== run() 함수 내부에서 loadBookJson → loadBookText로 변경 =====
async function run(){
  try{
    el.output.textContent = '조회 중...';
    const parsed = parseReference(el.refInput.value, el.bookSelect.value);
    const bookData = await loadBookText(parsed.book); // 여기 변경
    const { maxVerse, getVerse } = createAccessors(bookData);
    const points = expandRange(parsed, c => maxVerse(String(c)));

    const lines = [];
    const speak = [];
    for(const p of points){
      const head = `${parsed.book} ${p.c}:${p.v}`;
      const text = getVerse(String(p.c), String(p.v));
      if(!text) lines.push(`${head}  (구절 없음)`);
      else {
        lines.push(`${head}  ${text}`);
        speak.push(`${parsed.book} ${p.c}장 ${p.v}절. ${text}`);
      }
    }
    el.output.textContent = lines.join('\n');

    const voice = VOICES.find(v => v.name === el.voiceSelect.value) || defaultKoVoice();
    speakLines(speak, {
      voice,
      rate : Number(el.rateRange.value),
      pitch: Number(el.pitchRange.value),
    });
  }catch(e){
    el.output.textContent = '오류: ' + e.message;
  }
}
el.btnSpeak.addEventListener('click', run);
el.btnStop .addEventListener('click', stopSpeaking);
el.refInput.addEventListener('keydown', e => { if(e.key==='Enter') run(); });
