'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_VIOLATIONS } from '@/lib/ielts';

export interface AntiCheatState {
  count: number;
  remaining: number;
  lastKind: string | null;
  isFullscreen: boolean;
}

/**
 * Giam sat "khong duoc thoat man hinh" trong luc thi.
 *
 * Ghi nhan cac hanh vi: chuyen tab, roi cua so, thoat toan man hinh,
 * copy/paste, chuot phai, phim tat devtools. Moi lan deu goi API de luu vao
 * bang violations. Qua MAX_VIOLATIONS lan thi goi onAutoSubmit().
 */
export function useAntiCheat({
  attemptId,
  active,
  onAutoSubmit,
}: {
  attemptId: string;
  active: boolean;
  onAutoSubmit: (reason: string) => void;
}) {
  const [state, setState] = useState<AntiCheatState>({
    count: 0,
    remaining: MAX_VIOLATIONS,
    lastKind: null,
    isFullscreen: false,
  });
  const [warning, setWarning] = useState<{ kind: string; count: number } | null>(null);

  const activeRef = useRef(active);
  activeRef.current = active;

  // Chong dem trung: nhieu su kien cung no ra trong tich tac (blur + visibilitychange)
  const lastReportRef = useRef(0);
  const firedRef = useRef(false);
  const countRef = useRef(0);

  const report = useCallback(
    async (kind: string, detail = '') => {
      if (!activeRef.current || firedRef.current) return;

      const now = Date.now();
      if (now - lastReportRef.current < 1200) return;
      lastReportRef.current = now;

      try {
        const res = await fetch(`/api/attempts/${attemptId}/violation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, detail }),
        });
        const json = await res.json();

        countRef.current = json.count ?? countRef.current + 1;
        setState((s) => ({
          ...s,
          count: json.count ?? s.count + 1,
          remaining: json.remaining ?? Math.max(0, MAX_VIOLATIONS - (json.count ?? s.count + 1)),
          lastKind: kind,
        }));
        setWarning({ kind, count: json.count ?? 0 });

        if (json.shouldAutoSubmit && !firedRef.current) {
          firedRef.current = true;
          onAutoSubmit(`Rời khỏi màn hình thi quá ${MAX_VIOLATIONS} lần`);
        }
      } catch {
        // Mat mang: van canh bao tai cho de HS biet
        countRef.current += 1;
        setState((s) => ({ ...s, count: s.count + 1, lastKind: kind }));
        setWarning({ kind, count: countRef.current });
      }
    },
    [attemptId, onAutoSubmit]
  );

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setState((s) => ({ ...s, isFullscreen: true }));
    } catch {
      // Trinh duyet tu choi (vd chua co thao tac nguoi dung) - bo qua
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    const onVisibility = () => {
      if (document.hidden) report('tab_hidden', 'Tab bị ẩn hoặc chuyển sang cửa sổ khác');
    };
    const onBlur = () => report('window_blur', 'Cửa sổ bài thi mất tiêu điểm');
    const onFullscreenChange = () => {
      const on = Boolean(document.fullscreenElement);
      setState((s) => ({ ...s, isFullscreen: on }));
      if (!on) report('fullscreen_exit', 'Thoát chế độ toàn màn hình');
    };

    const block = (kind: string) => (e: Event) => {
      e.preventDefault();
      report(kind);
    };
    const onCopy = block('copy');
    const onPaste = block('paste');
    const onContextMenu = block('contextmenu');

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const devtools =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
        ((e.ctrlKey || e.metaKey) && ['u', 'p', 's'].includes(k));
      if (devtools) {
        e.preventDefault();
        report('devtools_key', `Phím tắt: ${e.key}`);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active, report]);

  // Nhac nho truoc khi dong tab
  useEffect(() => {
    if (!active) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [active]);

  return { ...state, warning, dismissWarning: () => setWarning(null), enterFullscreen };
}
