# Tìm các khoảng lặng dài trong file WAV (để dò chỗ chuyển Section khi transcript không có mốc giờ)
import sys, wave, array, math


def silences(path, win=0.25, min_len=6.0):
    w = wave.open(path, 'rb')
    ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    assert sw == 2, sw
    step = int(sr * win)
    levels = []
    while True:
        buf = w.readframes(step)
        if not buf: break
        a = array.array('h', buf)
        if ch > 1: a = a[::ch]
        levels.append(math.sqrt(sum(x * x for x in a) / max(1, len(a))))
    w.close()
    loud = sorted(levels)[int(len(levels) * 0.7)]          # mức "đang nói" điển hình
    thr = max(loud * 0.06, 30)
    out, start = [], None
    for i, v in enumerate(levels + [thr * 10]):
        if v < thr and start is None: start = i
        elif v >= thr and start is not None:
            if (i - start) * win >= min_len: out.append((start * win, i * win))
            start = None
    return out, len(levels) * win


if __name__ == '__main__':
    sil, dur = silences(sys.argv[1])
    print(f'duration {dur/60:.1f} min')
    for a, b in sil: print(f'{int(a//60)}:{a%60:04.1f} - {int(b//60)}:{b%60:04.1f}  ({b-a:.0f}s)')
