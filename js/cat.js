// =====================================================================
//  "Mochi" — linh vật mèo Anh lông ngắn màu xám (British Shorthair)
//  SVG tự vẽ, hoạt ảnh bằng CSS (xem mục .cat trong styles.css)
//
//  const cat = createCat({ size: 180, mood: "idle", say: "Xin chào!" });
//  cat.setMood("happy", 1500);   // idle | happy | sad | think | sleep | wow
//  cat.say("Giỏi lắm!", 2000);
// =====================================================================
import { el } from "./ui.js";
import { L } from "./i18n.js";

const FUR = "#8f9aa6";
const FUR_DARK = "#76828f";
const FUR_LIGHT = "#b3bcc6";
const LINE = "#3b4550";
const COPPER = "#e8962b";
const PINK = "#eea2ab";

const SVG = `
<svg class="cat-svg" viewBox="0 0 220 220" aria-hidden="true">
  <!-- bóng dưới chân -->
  <ellipse class="cat-shadow" cx="110" cy="208" rx="62" ry="8" fill="rgba(40,52,64,.14)"/>

  <!-- đuôi -->
  <g class="cat-tail">
    <path d="M150 188 C196 190 206 150 188 128 C180 118 170 124 176 134 C186 150 176 170 146 172 Z"
          fill="${FUR_DARK}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
  </g>

  <!-- thân -->
  <g class="cat-body">
    <path d="M58 196 C50 150 70 118 110 118 C150 118 170 150 162 196 Z"
          fill="${FUR}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M86 196 C84 164 94 146 110 146 C126 146 136 164 134 196 Z" fill="${FUR_LIGHT}" opacity=".75"/>
    <!-- chân trước -->
    <g class="cat-paw cat-paw-l">
      <path d="M78 150 C74 170 76 190 80 200 L100 200 C102 186 100 166 96 152 Z" fill="${FUR}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M85 196 v4 M92 196 v4" stroke="${LINE}" stroke-width="2" stroke-linecap="round"/>
    </g>
    <g class="cat-paw cat-paw-r">
      <path d="M142 150 C146 170 144 190 140 200 L120 200 C118 186 120 166 124 152 Z" fill="${FUR}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M128 196 v4 M135 196 v4" stroke="${LINE}" stroke-width="2" stroke-linecap="round"/>
    </g>
  </g>

  <!-- đầu: tròn, má bầu — nét đặc trưng của mèo Anh -->
  <g class="cat-head">
    <g class="cat-ear cat-ear-l">
      <path d="M50 78 C44 50 50 34 58 30 C68 34 82 46 90 58 Z" fill="${FUR}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M58 64 C56 50 58 42 61 40 C67 44 74 50 79 57 Z" fill="${PINK}" opacity=".8"/>
    </g>
    <g class="cat-ear cat-ear-r">
      <path d="M170 78 C176 50 170 34 162 30 C152 34 138 46 130 58 Z" fill="${FUR}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M162 64 C164 50 162 42 159 40 C153 44 146 50 141 57 Z" fill="${PINK}" opacity=".8"/>
    </g>

    <path d="M110 44 C160 44 182 72 182 100 C182 132 152 150 110 150 C68 150 38 132 38 100 C38 72 60 44 110 44 Z"
          fill="${FUR}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
    <!-- mõm sáng màu -->
    <ellipse cx="110" cy="122" rx="30" ry="20" fill="${FUR_LIGHT}"/>
    <!-- vệt lông mờ trên trán -->
    <path d="M100 56 q2 8 0 14 M110 54 q2 9 0 16 M120 56 q2 8 0 14" stroke="${FUR_DARK}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".55"/>

    <!-- má hồng -->
    <g class="cat-blush">
      <ellipse cx="62" cy="120" rx="11" ry="6" fill="${PINK}" opacity=".55"/>
      <ellipse cx="158" cy="120" rx="11" ry="6" fill="${PINK}" opacity=".55"/>
    </g>

    <!-- mắt tròn màu đồng -->
    <g class="cat-eyes">
      <g class="cat-eye">
        <circle cx="80" cy="98" r="15" fill="${COPPER}" stroke="${LINE}" stroke-width="3"/>
        <circle cx="80" cy="98" r="10" fill="#f5b24e" opacity=".55"/>
        <g class="cat-pupil"><ellipse cx="80" cy="98" rx="5.5" ry="9.5" fill="#1c2127"/></g>
        <circle cx="75" cy="92" r="3.4" fill="#fff"/>
        <rect class="cat-lid" x="63" y="81" width="34" height="34" rx="17" fill="${FUR}"/>
      </g>
      <g class="cat-eye">
        <circle cx="140" cy="98" r="15" fill="${COPPER}" stroke="${LINE}" stroke-width="3"/>
        <circle cx="140" cy="98" r="10" fill="#f5b24e" opacity=".55"/>
        <g class="cat-pupil"><ellipse cx="140" cy="98" rx="5.5" ry="9.5" fill="#1c2127"/></g>
        <circle cx="135" cy="92" r="3.4" fill="#fff"/>
        <rect class="cat-lid" x="123" y="81" width="34" height="34" rx="17" fill="${FUR}"/>
      </g>
    </g>
    <!-- mắt cười ^^ -->
    <g class="cat-eyes-happy" fill="none" stroke="${LINE}" stroke-width="4" stroke-linecap="round">
      <path d="M67 102 Q80 86 93 102"/>
      <path d="M127 102 Q140 86 153 102"/>
    </g>
    <!-- mắt ngủ -->
    <g class="cat-eyes-sleep" fill="none" stroke="${LINE}" stroke-width="4" stroke-linecap="round">
      <path d="M67 98 Q80 108 93 98"/>
      <path d="M127 98 Q140 108 153 98"/>
    </g>

    <!-- mũi + miệng -->
    <path d="M103 113 L117 113 L110 121 Z" fill="${PINK}" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>
    <path class="cat-mouth" d="M110 121 v4 M98 124 Q104 132 110 125 Q116 132 122 124" fill="none" stroke="${LINE}" stroke-width="2.6" stroke-linecap="round"/>
    <path class="cat-mouth-open" d="M100 126 Q110 142 120 126 Z" fill="#c9606d" stroke="${LINE}" stroke-width="2.6" stroke-linejoin="round"/>
    <path class="cat-mouth-sad" d="M100 131 Q110 123 120 131" fill="none" stroke="${LINE}" stroke-width="2.6" stroke-linecap="round"/>

    <!-- ria -->
    <g stroke="${LINE}" stroke-width="2" stroke-linecap="round" opacity=".55">
      <path d="M78 122 L44 116 M78 128 L44 132"/>
      <path d="M142 122 L176 116 M142 128 L176 132"/>
    </g>

    <!-- giọt nước mắt -->
    <path class="cat-tear" d="M92 108 C88 116 88 120 92 122 C96 120 96 116 92 108 Z" fill="#8fd0f2" stroke="${LINE}" stroke-width="1.5"/>
  </g>

  <!-- dấu hỏi / zzz / lấp lánh -->
  <text class="cat-q" x="176" y="44" font-size="34" font-weight="800" fill="${COPPER}" stroke="${LINE}" stroke-width="1.5" font-family="Baloo 2, sans-serif">?</text>
  <g class="cat-zzz" font-family="Baloo 2, sans-serif" font-weight="800" fill="${FUR_DARK}">
    <text x="168" y="54" font-size="20">z</text>
    <text x="182" y="36" font-size="15">z</text>
    <text x="194" y="22" font-size="11">z</text>
  </g>
  <g class="cat-spark" fill="${COPPER}">
    <path d="M30 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z"/>
    <path d="M190 70 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z"/>
  </g>
</svg>`;

const live = new Set();
let tracking = false;

function ensureTracking() {
  if (tracking) return;
  tracking = true;
  const move = (x, y) => {
    for (const cat of live) {
      if (!cat.isConnected) { live.delete(cat); continue; }
      const r = cat.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.45;
      const dx = Math.max(-1, Math.min(1, (x - cx) / 400));
      const dy = Math.max(-1, Math.min(1, (y - cy) / 400));
      cat.style.setProperty("--look-x", `${(dx * 4).toFixed(2)}px`);
      cat.style.setProperty("--look-y", `${(dy * 3).toFixed(2)}px`);
    }
  };
  window.addEventListener("pointermove", (e) => move(e.clientX, e.clientY), { passive: true });
}

export function createCat({ size = 180, mood = "idle", say = "", track = true, bubbleSide = "right" } = {}) {
  const bubble = el("div", { class: `cat-bubble ${bubbleSide}` });
  const root = el("div", {
    class: `cat mood-${mood}`,
    style: `--cat-size:${size}px`,
    role: "img",
    "aria-label": L("Mèo Mochi", "Mochi the cat"),
  });
  root.innerHTML = SVG;
  root.append(bubble);

  let moodTimer = null;
  let sayTimer = null;
  let baseMood = mood;

  root.setMood = (m, ms = 0) => {
    clearTimeout(moodTimer);
    root.className = `cat mood-${m}`;
    if (ms > 0) {
      moodTimer = setTimeout(() => { root.className = `cat mood-${baseMood}`; }, ms);
    } else {
      baseMood = m;
    }
    return root;
  };

  root.say = (text, ms = 0) => {
    clearTimeout(sayTimer);
    if (!text) { bubble.classList.remove("show"); return root; }
    bubble.textContent = text;
    bubble.classList.add("show");
    if (ms > 0) sayTimer = setTimeout(() => bubble.classList.remove("show"), ms);
    return root;
  };

  root.react = (ok, text) => {
    root.setMood(ok ? "happy" : "sad", 1100);
    if (text) root.say(text, 1400);
    return root;
  };

  if (say) root.say(say);
  if (track) { live.add(root); ensureTracking(); }
  return root;
}

const PRAISE = L(["Giỏi quá!", "Chuẩn luôn!", "Meo tuyệt!", "Đúng rồi nè!", "Xuất sắc!", "Nhớ lâu ghê!"],
  ["Purr-fect!", "Spot on!", "Meow-velous!", "That's right!", "Brilliant!", "Clawsome!"]);
const COMFORT = L(["Không sao, thử lại nha", "Suýt nữa thôi!", "Meo… nhớ kỹ từ này nhé", "Lần sau sẽ đúng!"],
  ["No worries, try again", "So close!", "Meow… remember this one", "You'll get it next time!"]);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const praise = () => pick(PRAISE);
export const comfort = () => pick(COMFORT);

/** Logo nhỏ: mặt mèo tĩnh (dùng trên thanh điều hướng) */
export function catLogoSVG() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M12 26 C9 14 12 7 16 5 C21 7 27 12 30 17 Z" fill="${FUR}" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M52 26 C55 14 52 7 48 5 C43 7 37 12 34 17 Z" fill="${FUR}" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M32 13 C50 13 58 23 58 35 C58 49 47 56 32 56 C17 56 6 49 6 35 C6 23 14 13 32 13 Z" fill="${FUR}" stroke="${LINE}" stroke-width="2.5"/>
    <ellipse cx="32" cy="44" rx="11" ry="7" fill="${FUR_LIGHT}"/>
    <circle cx="23" cy="33" r="5.5" fill="${COPPER}" stroke="${LINE}" stroke-width="2"/>
    <circle cx="41" cy="33" r="5.5" fill="${COPPER}" stroke="${LINE}" stroke-width="2"/>
    <ellipse cx="23" cy="33" rx="1.8" ry="3.4" fill="#1c2127"/>
    <ellipse cx="41" cy="33" rx="1.8" ry="3.4" fill="#1c2127"/>
    <path d="M29.5 40 h5 l-2.5 3 Z" fill="${PINK}" stroke="${LINE}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M27 45 q2.5 3 5 0 q2.5 3 5 0" fill="none" stroke="${LINE}" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}
