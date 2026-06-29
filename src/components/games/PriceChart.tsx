import { useState, useRef } from 'react';
import type { PricePoint } from '../../types';
import { useLang } from '../../contexts/LangContext';
import { t } from '../../lib/i18n';

interface Props {
  history:      PricePoint[];
  regularPrice: number;
  currentPrice: number;
  onSale:       boolean;
}

function formatAUD(n: number) { return `A$${n.toFixed(2)}`; }
function formatDate(iso: string, short = false): string {
  const d = new Date(iso);
  if (short) return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
}

const W = 600, H = 180;
const PAD = { top: 20, right: 16, bottom: 32, left: 56 };
const chartW = W - PAD.left - PAD.right;
const chartH = H - PAD.top - PAD.bottom;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export function PriceChart({ history, regularPrice, currentPrice, onSale }: Props) {
  const { lang } = useLang();
  const svgRef = useRef<SVGSVGElement>(null);

  const [hover, setHover] = useState<{
    svgX: number; svgY: number; price: number; date: string; onSale: boolean;
  } | null>(null);

  if (history.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-secondary border border-edge-subtle p-5">
        <h3 className="text-sm font-semibold text-ink-primary mb-3">{t('game_detail_price_chart', lang)}</h3>
        <p className="text-sm text-ink-muted">{t('game_detail_no_history', lang)}</p>
      </div>
    );
  }

  // Show a friendly note while history is still too sparse to be meaningful
  // (fewer than 3 distinct observations — typically a brand-new user).
  const isEarlyHistory = history.length < 3;

  // Extend to today
  const today  = new Date().toISOString().split('T')[0];
  const points: PricePoint[] = [...history];
  if (points[points.length - 1].date !== today) {
    points.push({ date: today, price: currentPrice, onSale });
  }

  // Scale
  const prices   = points.map(p => p.price);
  const minP     = Math.min(...prices) * 0.88;
  const maxP     = Math.max(regularPrice, ...prices) * 1.08;
  const minDate  = new Date(points[0].date).getTime();
  const maxDate  = new Date(today).getTime() + 86400000;
  const dateRange = maxDate - minDate || 1;

  const xOf = (iso: string) => PAD.left + ((new Date(iso).getTime() - minDate) / dateRange) * chartW;
  const yOf = (price: number) => PAD.top + chartH - ((price - minP) / (maxP - minP)) * chartH;

  // Step path
  let pathD = '';
  if (points.length === 1) {
    pathD = `M ${PAD.left} ${yOf(points[0].price)} H ${PAD.left + chartW}`;
  } else {
    pathD = `M ${xOf(points[0].date)} ${yOf(points[0].price)}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` H ${xOf(points[i].date)} V ${yOf(points[i].price)}`;
    }
    pathD += ` H ${PAD.left + chartW}`;
  }

  // Sale fill areas
  const saleFills: Array<{ x: number; w: number; y: number; h: number }> = [];
  for (let i = 0; i < points.length; i++) {
    if (!points[i].onSale) continue;
    const x1 = xOf(points[i].date);
    const x2 = i + 1 < points.length ? xOf(points[i + 1].date) : PAD.left + chartW;
    const y  = yOf(points[i].price);
    const bh = (PAD.top + chartH) - y;
    saleFills.push({ x: x1, w: x2 - x1, y, h: bh });
  }

  // Historical low
  const histLowPrice = Math.min(...prices);
  const histLowPt    = points.find(p => p.price === histLowPrice);

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = (maxP - minP) / 4;
  for (let i = 0; i <= 4; i++) yTicks.push(minP + step * i);

  // X-axis ticks (up to 5)
  const xTicks: string[] = [points[0].date];
  const interval = Math.max(1, Math.floor(points.length / 4));
  for (let i = interval; i < points.length - 1; i += interval) xTicks.push(points[i].date);
  if (!xTicks.includes(today)) xTicks.push(today);

  const firstDate = formatDate(points[0].date, true);
  const lastDate  = formatDate(today, true);
  const discount  = regularPrice > 0 && histLowPrice < regularPrice
    ? Math.round((1 - histLowPrice / regularPrice) * 100) : 0;

  // ── Mouse interaction ────────────────────────────────────
  function findSegment(relSvgX: number): PricePoint {
    for (let i = points.length - 1; i >= 0; i--) {
      if (relSvgX >= xOf(points[i].date)) return points[i];
    }
    return points[0];
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = PAD.left + ((e.clientX - rect.left) / rect.width) * (W - PAD.left - PAD.right);
    if (svgX < PAD.left || svgX > PAD.left + chartW) { setHover(null); return; }
    const pt = findSegment(svgX);
    setHover({ svgX: clamp(svgX, PAD.left, PAD.left + chartW), svgY: yOf(pt.price), price: pt.price, date: pt.date, onSale: pt.onSale });
  };

  // Tooltip box positioning (keep inside SVG bounds)
  const tooltipW = 96, tooltipH = 52;
  const tooltipX = hover ? clamp(hover.svgX - tooltipW / 2, 2, W - tooltipW - 2) : 0;
  const tooltipY = hover ? clamp(hover.svgY - tooltipH - 10, 2, H - tooltipH - 2) : 0;
  const hoverDiscount = hover && hover.onSale && regularPrice > hover.price
    ? Math.round((1 - hover.price / regularPrice) * 100) : 0;

  return (
    <div className="rounded-2xl bg-surface-secondary border border-edge-subtle p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-primary">{t('game_detail_price_chart', lang)}</h3>
        <span className="text-[11px] text-ink-muted">
          {t('game_detail_chart_start', lang)} {firstDate}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-5 mb-5">
        <div>
          <p className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold mb-0.5">{t('regular_price', lang)}</p>
          <p className="text-sm font-bold text-ink-primary">{formatAUD(regularPrice)}</p>
        </div>
        <div>
          <p className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold mb-0.5">{t('historical_low', lang)}</p>
          <p className="text-sm font-bold text-jade-500">
            {formatAUD(histLowPrice)}
            {discount > 0 && <span className="ml-1.5 text-[10px] font-semibold text-jade-400">-{discount}%</span>}
          </p>
        </div>
        {onSale && (
          <div>
            <p className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold mb-0.5">{t('current_sale', lang)}</p>
            <p className="text-sm font-bold text-ember-500">{formatAUD(currentPrice)}</p>
          </div>
        )}
        <div className="ml-auto text-right">
          <p className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold mb-0.5">
            {lang === 'pt' ? 'Período' : 'Range'}
          </p>
          <p className="text-[11px] text-ink-secondary">{firstDate} – {lastDate}</p>
        </div>
      </div>

      {/* Early-history notice */}
      {isEarlyHistory && (
        <p className="text-[11px] text-ink-muted italic mb-4 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-ember-300 shrink-0" />
          {lang === 'pt'
            ? 'Histórico em construção — novos pontos são registrados a cada visita.'
            : 'History is building — new data points are recorded on each visit.'}
        </p>
      )}

      {/* SVG chart */}
      <div className="overflow-visible rounded-xl bg-white border border-edge-subtle select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          style={{ height: 180 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Background */}
          <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="#FAFAF9" />

          {/* Grid lines */}
          {yTicks.map((price, i) => (
            <line key={i}
              x1={PAD.left} x2={PAD.left + chartW}
              y1={yOf(price)} y2={yOf(price)}
              stroke="#EAE5DF" strokeWidth="1" />
          ))}

          {/* Sale fill areas */}
          {saleFills.map((f, i) => (
            <rect key={i} x={f.x} y={f.y} width={f.w} height={f.h}
              fill="#E07A45" fillOpacity="0.10" />
          ))}

          {/* Regular price dashed line */}
          <line
            x1={PAD.left} x2={PAD.left + chartW}
            y1={yOf(regularPrice)} y2={yOf(regularPrice)}
            stroke="#C0B8B0" strokeWidth="1.5" strokeDasharray="5 4" />

          {/* Price step path — filled area under curve */}
          <path
            d={`${pathD} V ${PAD.top + chartH} H ${PAD.left} Z`}
            fill="#E07A45" fillOpacity="0.06"
          />

          {/* Price step path — line */}
          <path d={pathD} fill="none" stroke="#E07A45" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {/* Current price endpoint dot */}
          <circle
            cx={PAD.left + chartW}
            cy={yOf(currentPrice)}
            r="4.5" fill={onSale ? '#E07A45' : '#44403C'} stroke="white" strokeWidth="2"
          />

          {/* Historical low marker */}
          {histLowPt && (
            <circle cx={xOf(histLowPt.date)} cy={yOf(histLowPrice)}
              r="5" fill="#10B981" stroke="white" strokeWidth="2" />
          )}

          {/* Y-axis labels */}
          {yTicks.map((price, i) => (
            <text key={i} x={PAD.left - 8} y={yOf(price) + 4}
              textAnchor="end" fontSize="10" fill="#A8A29E" fontFamily="system-ui">
              {`$${price.toFixed(0)}`}
            </text>
          ))}

          {/* X-axis labels */}
          {xTicks.slice(0, 5).map((date, i) => (
            <text key={i} x={xOf(date)} y={H - 8}
              textAnchor="middle" fontSize="9" fill="#A8A29E" fontFamily="system-ui">
              {formatDate(date, true)}
            </text>
          ))}

          {/* ── Hover indicator ── */}
          {hover && (
            <>
              {/* Vertical guide */}
              <line
                x1={hover.svgX} x2={hover.svgX}
                y1={PAD.top} y2={PAD.top + chartH}
                stroke="#D4C8C0" strokeWidth="1" strokeDasharray="3 3" />

              {/* Dot on price line */}
              <circle
                cx={hover.svgX} cy={hover.svgY}
                r="5" fill={hover.onSale ? '#E07A45' : '#44403C'} stroke="white" strokeWidth="2.5" />

              {/* Tooltip background */}
              <rect
                x={tooltipX} y={tooltipY}
                width={tooltipW} height={tooltipH}
                rx="8" fill="white"
                stroke="#E2DDD8" strokeWidth="1"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }}
              />
              {/* Tooltip — price */}
              <text
                x={tooltipX + tooltipW / 2} y={tooltipY + 16}
                textAnchor="middle" fontSize="12" fontWeight="700" fill="#1C1917" fontFamily="system-ui">
                {formatAUD(hover.price)}
              </text>
              {/* Tooltip — discount */}
              {hoverDiscount > 0 && (
                <text
                  x={tooltipX + tooltipW / 2} y={tooltipY + 30}
                  textAnchor="middle" fontSize="10" fontWeight="700" fill="#E07A45" fontFamily="system-ui">
                  -{hoverDiscount}% {lang === 'pt' ? 'desconto' : 'off'}
                </text>
              )}
              {/* Tooltip — date */}
              <text
                x={tooltipX + tooltipW / 2} y={tooltipY + (hoverDiscount > 0 ? 44 : 32)}
                textAnchor="middle" fontSize="9" fill="#A8A29E" fontFamily="system-ui">
                {formatDate(hover.date, true)}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-ember-500 rounded" />
          <span className="text-[10px] text-ink-muted">{lang === 'pt' ? 'Preço' : 'Price'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0 border-t-2 border-dashed border-[#C0B8B0]" />
          <span className="text-[10px] text-ink-muted">{t('regular_price', lang)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-jade-500" />
          <span className="text-[10px] text-ink-muted">{t('historical_low', lang)}</span>
        </div>
        {saleFills.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-ember-100 border border-ember-300" />
            <span className="text-[10px] text-ink-muted">{lang === 'pt' ? 'Promoção' : 'Sale period'}</span>
          </div>
        )}
        <span className="text-[10px] text-ink-muted ml-auto italic">
          {lang === 'pt' ? 'Passe o mouse sobre o gráfico' : 'Hover for details'}
        </span>
      </div>
    </div>
  );
}
