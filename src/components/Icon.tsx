/**
 * Bộ icon SVG nội tuyến (nét vẽ theo phong cách Lucide).
 *
 * Dùng thay cho emoji: emoji hiển thị khác nhau trên từng hệ điều hành và
 * bị trình đọc màn hình đọc thành tên ký tự, nên không dùng làm icon chức năng.
 * Icon ở đây mặc định là trang trí (aria-hidden); truyền `title` khi icon
 * đứng một mình và cần được trình đọc màn hình mô tả.
 */

export type IconName =
  | 'headphones' | 'bookOpen' | 'penLine' | 'mic'
  | 'home' | 'clipboard' | 'chartBar' | 'wrench' | 'trophy'
  | 'clock' | 'shield' | 'shieldAlert' | 'alertTriangle' | 'checkCircle'
  | 'play' | 'send' | 'coffee' | 'sparkles' | 'cpu' | 'logIn'
  | 'arrowLeft' | 'arrowRight' | 'plus' | 'trash' | 'upload' | 'inbox'
  | 'user' | 'lock' | 'unlock' | 'fileText' | 'seedling' | 'chevronDown';

const PATHS: Record<IconName, React.ReactNode> = {
  headphones: <><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z" /></>,
  bookOpen: <><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></>,
  penLine: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><path d="M12 18v4" /></>,
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><path d="M9 21v-6h6v6" /></>,
  clipboard: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6M9 16h4" /></>,
  chartBar: <><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12.5" y="8" width="3" height="10" /><rect x="18" y="5" width="3" height="13" /></>,
  wrench: <path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3z" />,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3" /><path d="M12 13v4M9 21h6M10 17h4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  shield: <><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  shieldAlert: <><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" /><path d="M12 8v4M12 15.5v.5" /></>,
  alertTriangle: <><path d="M10.3 4.3 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 16.5v.5" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  play: <path d="M7 4.5v15l12-7.5z" />,
  send: <><path d="M21 3 3 10.5l7 3 3 7z" /><path d="M21 3 10 14" /></>,
  coffee: <><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" /><path d="M6 2v2M10 2v2M14 2v2" /></>,
  sparkles: <><path d="M12 3l1.7 4.8L18.5 9.5 13.7 11.2 12 16l-1.7-4.8L5.5 9.5l4.8-1.7z" /><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>,
  cpu: <><rect x="7" y="7" width="10" height="10" rx="2" /><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M10 1.5v2M14 1.5v2M10 20.5v2M14 20.5v2M1.5 10h2M1.5 14h2M20.5 10h2M20.5 14h2" /></>,
  logIn: <><path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></>,
  arrowLeft: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  arrowRight: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" /><path d="M10 11v6M14 11v6" /></>,
  upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></>,
  inbox: <><path d="M3 12h5l1.5 3h5L16 12h5" /><path d="M5.5 4h13l2.5 8v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  unlock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.5-2" /></>,
  fileText: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  seedling: <><path d="M12 21v-8" /><path d="M12 13C12 9 9 6 5 6c0 4 3 7 7 7z" /><path d="M12 13c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6z" /></>,
  chevronDown: <path d="m6 9 6 6 6-6" />,
};

export default function Icon({
  name,
  className = 'h-5 w-5',
  title,
  strokeWidth = 1.8,
}: {
  name: IconName;
  className?: string;
  title?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}

/** Icon tương ứng với từng kỹ năng IELTS. */
export const SKILL_ICON: Record<'listening' | 'reading' | 'writing' | 'speaking', IconName> = {
  listening: 'headphones',
  reading: 'bookOpen',
  writing: 'penLine',
  speaking: 'mic',
};
