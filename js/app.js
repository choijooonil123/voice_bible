// js/app.js

// === 전역 변수 ===
let bibleData = {};  // { "창세기": { "1": { "1": "태초에 하나님이..." } } }
let currentVerses = []; // [{ref:"창세기 1장 1절", body:"..."}, ...]
let utterance = null;
let synth = window.speechSynthesis;

// === 성경 로드 ===
async function loadBible(bookName) {
    const path = `bible/${bookName}.txt`;
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${bookName} 로드 실패`);
    const text = await res.text();
    return parseBibleText(text);
}

function parseBibleText(text) {
    const data = {};
    const lines = text.split(/\r?\n/);
    lines.forEach(line => {
        const m = line.match(/^(\d+):(\d+)\s+(.*)$/);
        if (m) {
            const ch = m[1], vs = m[2], body = m[3];
            if (!data[ch]) data[ch] = {};
            data[ch][vs] = body;
        }
    });
    return data;
}

// === 구절 추출 ===
function getVerses(book, ch1, v1, ch2, v2) {
    const result = [];
    const data = bibleData[book];
    if (!data) return result;
    let ch = parseInt(ch1), vs = parseInt(v1);
    while (true) {
        if (!data[ch]) break;
        while (vs <= Object.keys(data[ch]).length) {
            if ( (ch < ch2) || (ch === ch2 && vs <= v2) ) {
                result.push({
                    ref: `${book} ${ch}장 ${vs}절`,
                    body: data[ch][vs]
                });
                if (ch === ch2 && vs === v2) return result;
                vs++;
            } else {
                return result;
            }
        }
        ch++;
        vs = 1;
    }
    return result;
}

// === 입력 파서 ===
async function handleInput(input) {
    const m = input.trim().match(/^(.+?)\s+(\d+):(\d+)(?:~(?:(\d+):)?(\d+))?$/);
    if (!m) {
        alert("형식: 성경이름 시작장:시작절~끝장:끝절 또는 시작장:시작절~끝절 또는 시작장:시작절");
        return;
    }
    const book = m[1], ch1 = parseInt(m[2]), v1 = parseInt(m[3]);
    const ch2 = m[4] ? parseInt(m[4]) : ch1;
    const v2 = m[5] ? parseInt(m[5]) : v1;

    if (!bibleData[book]) {
        bibleData[book] = await loadBible(book);
    }

    currentVerses = getVerses(book, ch1, v1, ch2, v2);
    if (currentVerses.length === 0) {
        alert("구절을 찾을 수 없습니다.");
        return;
    }

    displayVerses(currentVerses);
    speakVerses(currentVerses);
}

// === 구절 화면 표시 ===
function displayVerses(verses) {
    const out = document.getElementById("output");
    out.innerHTML = "";
    verses.forEach(v => {
        const p = document.createElement("p");
        p.innerHTML = `<strong>${v.ref}</strong> ${v.body}`;
        out.appendChild(p);
    });
}

// === 음성 동기화 ===
function speakVerses(verses) {
    if (synth.speaking) synth.cancel();
    let idx = 0;

    function speakNext() {
        if (idx >= verses.length) return;
        const v = verses[idx];
        highlightVerse(idx);
        utterance = new SpeechSynthesisUtterance(`${v.ref} ${v.body}`);
        utterance.lang = "ko-KR";
        utterance.rate = 1;
        utterance.onend = () => {
            idx++;
            speakNext();
        };
        synth.speak(utterance);
    }
    speakNext();
}

function highlightVerse(index) {
    const out = document.getElementById("output").children;
    for (let i = 0; i < out.length; i++) {
        out[i].style.background = (i === index) ? "#ffeb99" : "";
    }
    out[index]?.scrollIntoView({behavior:"smooth", block:"center"});
}

// === 예쁜 PPTX 내보내기 ===
function exportVersesToPptx(items) {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';

    const THEME = {
        bg: 'F7F9FC',
        cardFill: 'FFFFFF',
        cardShadow: true,
        accent: '3B82F6',
        accentMuted: 'E5EFFD',
        text: '111111',
        titleSize: 40,
        verseMax: 46,
        verseMid: 40,
        verseMin: 34,
        safeMargin: 0.6,
        fontFace: 'Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, Arial'
    };

    function splitChunk(t) {
        t = t.trim();
        if (t.length <= 360) return [t];
        const words = t.split(/\s+/);
        let cur = "", arr = [];
        words.forEach(w => {
            if ((cur + " " + w).trim().length > 360) {
                arr.push(cur);
                cur = w;
            } else {
                cur = cur ? cur + " " + w : w;
            }
        });
        if (cur) arr.push(cur);
        return arr;
    }

    function fontSize(t) {
        const len = t.length;
        if (len <= 120) return THEME.verseMax;
        if (len <= 220) return THEME.verseMid;
        return THEME.verseMin;
    }

    items.forEach(({ref, body}) => {
        const chunks = splitChunk(body);
        chunks.forEach((chunk, idx) => {
            const slide = pptx.addSlide();
            slide.background = { color: THEME.bg };

            const m = THEME.safeMargin;
            slide.addShape(pptx.ShapeType.roundRect, {
                x: m, y: 0.5, w: 10 - m*2, h: 0.65,
                fill: THEME.accentMuted, line: { color: THEME.accentMuted }
            });
            slide.addText(ref + (idx>0 ? " (계속)" : ""), {
                x: m, y: 0.5, w: 10 - m*2, h: 0.65,
                fontSize: THEME.titleSize, bold: true,
                color: THEME.accent, fontFace: THEME.fontFace, align: 'center',
            });

            slide.addShape(pptx.ShapeType.roundRect, {
                x: m, y: 1.2, w: 10 - m*2, h: 4.8,
                fill: THEME.cardFill, line: { color: 'FFFFFF' }
            });

            slide.addText(chunk, {
                x: m + 0.4, y: 1.5, w: 10 - m*2 - 0.8, h: 4.2,
                fontSize: fontSize(chunk), color: THEME.text,
                fontFace: THEME.fontFace, align: 'center', valign: 'middle'
            });
        });
    });

    pptx.writeFile({ fileName: `성경구절.pptx` });
}

// === 이벤트 ===
document.getElementById("input").addEventListener("keydown", e => {
    if (e.key === "Enter") {
        handleInput(e.target.value);
    }
});

document.getElementById("export").addEventListener("click", () => {
    if (currentVerses.length) exportVersesToPptx(currentVerses);
});
