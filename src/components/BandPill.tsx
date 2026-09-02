export default function BandPill({
  band,
  label,
  size = 'md',
}: {
  band: number | null | undefined;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const tone =
    band == null ? 'bg-slate-200 text-slate-600'
    : band >= 7 ? 'bg-mint-100 text-mint-800'
    : band >= 5.5 ? 'bg-mango-100 text-mango-800'
    : 'bg-rose-100 text-rose-700';

  const sizes = {
    sm: 'text-sm px-2.5 py-1',
    md: 'text-lg px-3.5 py-1.5',
    lg: 'text-3xl px-5 py-2',
  }[size];

  return (
    <span className={`inline-flex flex-col items-center rounded-2xl font-display font-extrabold ${tone} ${sizes}`}>
      {band == null ? '—' : band.toFixed(1)}
      {label && <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</span>}
    </span>
  );
}
