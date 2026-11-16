import { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Activity } from '../types';

const DAY = 24 * 60 * 60 * 1000;
const panel = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6';

function movingSeconds(value: string) {
  const parts = value.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function dateAtNoon(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`);
}

function tandaTime(weeklyKm: number, paceSeconds: number) {
  if (weeklyKm <= 0 || paceSeconds <= 0) return 0;
  const paceMarathon = 17.1 + 140 * Math.exp(-0.0053 * weeklyKm) + 0.55 * paceSeconds;
  return 42.195 * paceMarathon;
}

function formatTime(seconds: number) {
  if (!seconds || !Number.isFinite(seconds)) return '—';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatPace(seconds: number) {
  if (!seconds || !Number.isFinite(seconds)) return '—';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}'${String(total % 60).padStart(2, '0')}"`;
}

interface DailyRun { date: string; distance: number; duration: number; }

export function PredictionPage({ activities }: { activities: Activity[] }) {
  const result = useMemo(() => {
    const daily = new Map<string, DailyRun>();
    activities.forEach((activity) => {
      if (activity.type !== 'Run' || !activity.start_date_local) return;
      const distance = (activity.distance || 0) / 1000;
      const duration = movingSeconds(activity.moving_time || '');
      if (distance <= 0 || duration <= 0) return;
      const date = activity.start_date_local.slice(0, 10);
      const current = daily.get(date) || { date, distance: 0, duration: 0 };
      current.distance += distance;
      current.duration += duration;
      daily.set(date, current);
    });

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayMs = today.getTime();
    const dailyRows = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date));
    let currentDistance = 0;
    let currentDuration = 0;
    dailyRows.forEach((row) => {
      const age = todayMs - dateAtNoon(row.date).getTime();
      if (age >= 0 && age <= 56 * DAY) {
        currentDistance += row.distance;
        currentDuration += row.duration;
      }
    });
    const weeklyKm = currentDistance / 8;
    const paceSeconds = currentDistance > 0 ? currentDuration / currentDistance : 0;
    const predicted = tandaTime(weeklyKm, paceSeconds);

    const trend: { date: string; rolling: number; daily: number | null }[] = [];
    for (let offset = 180; offset >= 0; offset--) {
      const target = new Date(todayMs - offset * DAY);
      const date = target.toISOString().slice(0, 10);
      let distance = 0;
      let duration = 0;
      for (let age = 0; age < 56; age++) {
        const day = new Date(target.getTime() - age * DAY).toISOString().slice(0, 10);
        const row = daily.get(day);
        if (row) { distance += row.distance; duration += row.duration; }
      }
      const sameDay = daily.get(date);
      trend.push({
        date: date.slice(5),
        rolling: distance > 0 ? tandaTime((distance / 56) * 7, duration / distance) : 0,
        daily: sameDay ? tandaTime(sameDay.distance * 7, sameDay.duration / sameDay.distance) : null,
      });
    }

    const recentPoints = dailyRows.filter((row) => {
      const age = todayMs - dateAtNoon(row.date).getTime();
      return age >= 0 && age <= 56 * DAY;
    }).map((row) => ({
      pace: row.duration / row.distance / 60,
      dailyKm: row.distance / 8,
      date: row.date,
    }));

    const targets = [
      { label: '2:45', seconds: 9900 }, { label: '3:00', seconds: 10800 },
      { label: '3:15', seconds: 11700 }, { label: '3:30', seconds: 12600 },
      { label: '3:45', seconds: 13500 }, { label: '4:00', seconds: 14400 },
      { label: '4:15', seconds: 15300 }, { label: '4:30', seconds: 16200 },
      { label: '4:45', seconds: 17100 },
    ];
    const contours = targets.map((target) => ({
      ...target,
      data: Array.from({ length: 81 }, (_, index) => {
        const pace = 3.5 + index * 0.05;
        const value = (target.seconds / 42.195 - 17.1 - 0.55 * pace * 60) / 140;
        const dailyKm = value > 0 && value < 1 ? -Math.log(value) / (0.0053 * 7) : null;
        return { pace, dailyKm };
      }).filter((point) => point.dailyKm !== null && point.dailyKm > 0 && point.dailyKm <= 40),
    }));
    return { weeklyKm, paceSeconds, predicted, trend, recentPoints, contours };
  }, [activities]);

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">马拉松成绩预测</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Tanda 模型 · 使用最近 8 周的训练跑量和平均配速估算全马表现</p>
      </div>

      <section className={panel}>
        <h2 className="mb-2 text-lg font-semibold">当前预测（Tanda 模型）</h2>
        <p className="text-sm leading-7 text-[var(--color-muted)]">
          基于 <a className="text-[var(--color-accent)] underline" href="https://scholar.google.co.uk/citations?view_op=view_citation&hl=en&user=C__krSUAAAAJ&cstart=20&pagesize=80&citation_for_view=C__krSUAAAAJ:j3f4tGmQtD8C" target="_blank" rel="noopener noreferrer">Giovanni Tanda (2011)</a> 的实证研究算法。以最近 56 天的总跑量除以 8 计算周均跑量，并以总运动时间除以总距离计算平均配速。
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Metric label="近 8 周均跑量" value={result.weeklyKm.toFixed(1)} unit="km/周" />
          <Metric label="近 8 周均配速" value={formatPace(result.paceSeconds)} unit="/km" />
          <Metric label="预测全马完赛时间" value={result.predicted ? formatTime(result.predicted) : '数据不足'} highlight />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={panel}>
          <h2 className="mb-1 text-base font-semibold">马拉松预测成绩趋势（近 180 天）</h2>
          <p className="mb-4 text-xs text-[var(--color-muted)]">灰点：假设单日训练状态持续 8 周；实线：真实近 8 周滚动平均</p>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.trend} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} minTickGap={28} />
                <YAxis reversed tickFormatter={formatTime} tick={{ fill: 'var(--color-muted)', fontSize: 10 }} width={64} />
                <Tooltip labelStyle={{ color: 'var(--color-text)' }} contentStyle={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }} formatter={(value) => formatTime(Number(value))} />
                <Line dataKey="daily" name="单日推演" stroke="var(--color-muted)" strokeWidth={1} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
                <Line dataKey="rolling" name="近 8 周滚动推演" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={panel}>
          <h2 className="mb-1 text-base font-semibold">训练配速与跑量关系</h2>
          <p className="mb-4 text-xs text-[var(--color-muted)]">点表示最近 8 周的单日训练；虚线为不同目标完赛时间对应的模型等高线</p>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 12, right: 16, bottom: 20, left: 4 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="pace" domain={[3.5, 7.5]} tickFormatter={(v) => formatPace(Number(v) * 60).replace('"', '')} name="配速" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} />
                <YAxis type="number" dataKey="dailyKm" domain={[0, 'auto']} name="日均跑量" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} />
                <Tooltip labelStyle={{ color: 'var(--color-text)' }} contentStyle={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }} />
                {result.contours.map((contour) => (
                  <Line key={contour.label} data={contour.data} dataKey="dailyKm" name={`${contour.label} 等高线`} stroke={contour.label === '3:30' ? 'var(--color-accent)' : 'var(--color-muted)'} strokeDasharray="5 4" strokeWidth={contour.label === '3:30' ? 2 : 1} dot={false} isAnimationActive={false} />
                ))}
                <Scatter data={result.recentPoints} dataKey="dailyKm" name="最近 8 周训练" fill="var(--color-accent)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <p className="mt-5 text-xs leading-6 text-[var(--color-muted)]">
        注：该模型是基于训练数据的统计估算，不是比赛成绩保证。模型不考虑赛道、天气、补给、伤病及比赛执行等因素；请结合近期专项训练和实际体感解读。
      </p>
    </main>
  );
}

function Metric({ label, value, unit, highlight = false }: { label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-[var(--color-accent)] bg-[var(--color-bg)]' : 'border-[var(--color-border)] bg-[var(--color-bg)]'}`}>
      <p className="text-xs font-semibold tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${highlight ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
        {value} {unit && <span className="text-sm font-normal text-[var(--color-muted)]">{unit}</span>}
      </p>
    </div>
  );
}
