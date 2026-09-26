// =====================================================================
//  "i-melts" — linh vật mèo Anh lông ngắn màu xám (British Shorthair), dáng bánh mochi:
//  đầu tròn bóng như vỏ mochi, thân "tan chảy" loang thành vũng tròn dưới chân.
//  SVG tự vẽ, hoạt ảnh bằng CSS (xem mục .cat trong styles.css) — giữ nguyên tên class
//  (cat-head, cat-tail, cat-lid, cat-pupil…) vì CSS dựa vào chúng để tạo 6 biểu cảm.
//
//  const cat = createCat({ size: 180, mood: "idle", say: "Xin chào!" });
//  cat.setMood("happy", 1500);   // idle | happy | sad | think | sleep | wow
//  cat.say("Giỏi lắm!", 2000);
// =====================================================================
import { el } from "./ui.js";
import { L } from "./i18n.js";

export const MASCOT = "i-melts";

const FUR = "#9aa6b6";
const FUR_DARK = "#7b8899";
const FUR_LIGHT = "#cfd6e0";
const LINE = "#33404f";
const COPPER = "#f09a2e";
const PINK = "#f4a7b3";

const SVG = `
<svg class="cat-svg" viewBox="0 0 220 220" aria-hidden="true">
  <!-- bóng dưới chân -->
  <ellipse class="cat-shadow" cx="110" cy="209" rx="72" ry="7" fill="rgba(30,40,60,.14)"/>

  <!-- đuôi cuộn bên phải -->
  <g class="cat-tail">
    <path d="M160 188 C202 188 210 150 193 131 C185 122 172 127 178 138 C189 154 179 173 152 173 Z"
          fill="${FUR_DARK}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M186 136 C190 142 191 150 188 158" fill="none" stroke="${FUR_LIGHT}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
  </g>

  <!-- thân mochi đang "tan chảy": đáy loang thành vũng, vài giọt nhỏ bên cạnh -->
  <g class="cat-body">
    <path d="M50 168 C50 139 78 124 110 124 C142 124 170 139 170 168 C172 182 187 186 185 196 C183 205 167 206 157 202 C146 207 128 208 110 207 C92 208 74 207 63 202 C53 206 37 205 35 196 C33 186 48 182 50 168 Z"
          fill="${FUR}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M82 200 C80 172 92 154 110 154 C128 154 140 172 138 200 Z" fill="${FUR_LIGHT}" opacity=".75"/>
    <circle cx="25" cy="203" r="3.6" fill="${FUR}" stroke="${LINE}" stroke-width="2"/>
    <circle cx="197" cy="204" r="2.8" fill="${FUR}" stroke="${LINE}" stroke-width="2"/>
    <g class="cat-paw cat-paw-l">
      <ellipse cx="90" cy="198" rx="13" ry="8" fill="${FUR}" stroke="${LINE}" stroke-width="2.6"/>
      <path d="M86 195 v5 M93 195 v5" stroke="${LINE}" stroke-width="2" stroke-linecap="round"/>
    </g>
    <g class="cat-paw cat-paw-r">
      <ellipse cx="130" cy="198" rx="13" ry="8" fill="${FUR}" stroke="${LINE}" stroke-width="2.6"/>
      <path d="M127 195 v5 M134 195 v5" stroke="${LINE}" stroke-width="2" stroke-linecap="round"/>
    </g>
  </g>

  <!-- đầu: tròn to, má bầu, bóng như vỏ bánh mochi -->
  <g class="cat-head">
    <g class="cat-ear cat-ear-l">
      <path d="M50 78 C43 51 49 34 58 31 C69 35 83 46 91 58 Z" fill="${FUR}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M58 65 C56 51 58 43 61 41 C68 45 75 51 80 57 Z" fill="${PINK}" opacity=".85"/>
    </g>
    <g class="cat-ear cat-ear-r">
      <path d="M170 78 C177 51 171 34 162 31 C151 35 137 46 129 58 Z" fill="${FUR}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M162 65 C164 51 162 43 159 41 C152 45 145 51 140 57 Z" fill="${PINK}" opacity=".85"/>
    </g>

    <path d="M110 40 C166 40 192 70 192 104 C192 138 160 156 110 156 C60 156 28 138 28 104 C28 70 54 40 110 40 Z"
          fill="${FUR}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
    <!-- ánh bóng mochi -->
    <ellipse cx="70" cy="64" rx="21" ry="8.5" transform="rotate(-30 70 64)" fill="#fff" opacity=".38"/>
    <circle cx="94" cy="50" r="3.2" fill="#fff" opacity=".45"/>
    <!-- vệt lông mờ trên trán -->
    <path d="M100 52 q2 8 0 14 M110 50 q2 9 0 16 M120 52 q2 8 0 14" stroke="${FUR_DARK}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".5"/>
    <!-- mõm sáng màu -->
    <ellipse cx="110" cy="127" rx="32" ry="20" fill="${FUR_LIGHT}"/>

    <!-- má hồng -->
    <g class="cat-blush">
      <ellipse cx="57" cy="125" rx="13" ry="7" fill="${PINK}" opacity=".6"/>
      <ellipse cx="163" cy="125" rx="13" ry="7" fill="${PINK}" opacity=".6"/>
    </g>

    <!-- mắt tròn to màu đồng -->
    <g class="cat-eyes">
      <g class="cat-eye">
        <circle cx="80" cy="102" r="17" fill="${COPPER}" stroke="${LINE}" stroke-width="3"/>
        <circle cx="80" cy="102" r="11" fill="#f9c263" opacity=".55"/>
        <g class="cat-pupil"><ellipse cx="80" cy="102" rx="6" ry="10.5" fill="#1a1f27"/></g>
        <circle cx="74" cy="95" r="4" fill="#fff"/>
        <circle cx="85.5" cy="108" r="1.8" fill="#fff" opacity=".85"/>
        <rect class="cat-lid" x="62" y="84" width="36" height="36" rx="18" fill="${FUR}"/>
      </g>
      <g class="cat-eye">
        <circle cx="140" cy="102" r="17" fill="${COPPER}" stroke="${LINE}" stroke-width="3"/>
        <circle cx="140" cy="102" r="11" fill="#f9c263" opacity=".55"/>
        <g class="cat-pupil"><ellipse cx="140" cy="102" rx="6" ry="10.5" fill="#1a1f27"/></g>
        <circle cx="134" cy="95" r="4" fill="#fff"/>
        <circle cx="145.5" cy="108" r="1.8" fill="#fff" opacity=".85"/>
        <rect class="cat-lid" x="122" y="84" width="36" height="36" rx="18" fill="${FUR}"/>
      </g>
    </g>
    <!-- mắt cười ^^ -->
    <g class="cat-eyes-happy" fill="none" stroke="${LINE}" stroke-width="4" stroke-linecap="round">
      <path d="M65 106 Q80 88 95 106"/>
      <path d="M125 106 Q140 88 155 106"/>
    </g>
    <!-- mắt ngủ -->
    <g class="cat-eyes-sleep" fill="none" stroke="${LINE}" stroke-width="4" stroke-linecap="round">
      <path d="M65 102 Q80 112 95 102"/>
      <path d="M125 102 Q140 112 155 102"/>
    </g>

    <!-- mũi + miệng -->
    <path d="M103 118 L117 118 L110 126 Z" fill="${PINK}" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>
    <path class="cat-mouth" d="M110 126 v4 M98 129 Q104 137 110 130 Q116 137 122 129" fill="none" stroke="${LINE}" stroke-width="2.6" stroke-linecap="round"/>
    <path class="cat-mouth-open" d="M100 131 Q110 148 120 131 Z" fill="#cf6473" stroke="${LINE}" stroke-width="2.6" stroke-linejoin="round"/>
    <path class="cat-mouth-sad" d="M100 136 Q110 128 120 136" fill="none" stroke="${LINE}" stroke-width="2.6" stroke-linecap="round"/>

    <!-- ria -->
    <g stroke="${LINE}" stroke-width="2" stroke-linecap="round" opacity=".5">
      <path d="M76 127 L40 121 M76 133 L40 137"/>
      <path d="M144 127 L180 121 M144 133 L180 137"/>
    </g>

    <!-- giọt nước mắt -->
    <path class="cat-tear" d="M92 113 C88 121 88 125 92 127 C96 125 96 121 92 113 Z" fill="#8fd0f2" stroke="${LINE}" stroke-width="1.5"/>
  </g>

  <!-- dấu hỏi / zzz / lấp lánh -->
  <text class="cat-q" x="178" y="42" font-size="34" font-weight="700" fill="${COPPER}" stroke="${LINE}" stroke-width="1.5" font-family="Lexend, sans-serif">?</text>
  <g class="cat-zzz" font-family="Lexend, sans-serif" font-weight="700" fill="${FUR_DARK}">
    <text x="170" y="52" font-size="20">z</text>
    <text x="184" y="34" font-size="15">z</text>
    <text x="196" y="20" font-size="11">z</text>
  </g>
  <g class="cat-spark" fill="${COPPER}">
    <path d="M28 38 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z"/>
    <path d="M192 70 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z"/>
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
    "aria-label": L(`Mèo ${MASCOT}`, `${MASCOT} the cat`),
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

/** Logo nhỏ: mặt i-melts tĩnh (dùng ở góc menu) */
export function catLogoSVG() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M11 27 C8 14 11 7 15.5 5 C21 7 27 12 30.5 17 Z" fill="${FUR}" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M53 27 C56 14 53 7 48.5 5 C43 7 37 12 33.5 17 Z" fill="${FUR}" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M32 13 C51 13 60 23 60 36 C60 50 48 57 32 57 C16 57 4 50 4 36 C4 23 13 13 32 13 Z" fill="${FUR}" stroke="${LINE}" stroke-width="2.5"/>
    <ellipse cx="18" cy="22" rx="7" ry="3" transform="rotate(-30 18 22)" fill="#fff" opacity=".45"/>
    <ellipse cx="32" cy="45" rx="11" ry="7" fill="${FUR_LIGHT}"/>
    <ellipse cx="14" cy="44" rx="4.5" ry="2.6" fill="${PINK}" opacity=".7"/>
    <ellipse cx="50" cy="44" rx="4.5" ry="2.6" fill="${PINK}" opacity=".7"/>
    <circle cx="22.5" cy="34" r="6" fill="${COPPER}" stroke="${LINE}" stroke-width="2"/>
    <circle cx="41.5" cy="34" r="6" fill="${COPPER}" stroke="${LINE}" stroke-width="2"/>
    <ellipse cx="22.5" cy="34" rx="2" ry="3.6" fill="#1a1f27"/>
    <ellipse cx="41.5" cy="34" rx="2" ry="3.6" fill="#1a1f27"/>
    <circle cx="20.5" cy="31.5" r="1.4" fill="#fff"/>
    <circle cx="39.5" cy="31.5" r="1.4" fill="#fff"/>
    <path d="M29.5 41 h5 l-2.5 3 Z" fill="${PINK}" stroke="${LINE}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M27 46 q2.5 3 5 0 q2.5 3 5 0" fill="none" stroke="${LINE}" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}
