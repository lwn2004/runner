import { memo, useEffect, useState } from 'react';
import type { Activity, SportFilter } from '../types';
import { useLocale } from '../hooks/useLocale';
import {
  formatDistance,
  parseMovingTime,
  extractProvince,
} from '../hooks/useActivities';
import { AVATAR, GOALS, DEFAULT_GOAL } from '../config';

interface ScheduledWorkout {
  date: string;
  name: string;
  sport_type?: string;
  distance_km?: number;
  estimated_time?: string;
}

interface NextTrainingData {
  workouts?: ScheduledWorkout[];
}

interface ProfileCardProps {
  activities: Activity[];
  filter?: SportFilter;
}

export const ProfileCard = memo(function ProfileCard({
  activities,
  filter = 'all',
}: ProfileCardProps) {
  const { t, locale } = useLocale();
  const [nextTraining, setNextTraining] = useState<NextTrainingData | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    fetch(`${import.meta.env.BASE_URL}data/summary/next-training.json`)
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load next training');
        return response.json() as Promise<NextTrainingData>;
      })
      .then((data) => {
        if (!cancelled) setNextTraining(data);
      })
      .catch(() => {
        if (!cancelled) setNextTraining(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const shanghaiToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const nextWorkout =
    nextTraining?.workouts
      ?.filter((workout) => workout.date >= shanghaiToday)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  // Filter activities by sport type for distance/count/time
  const filteredActivities =
    filter === 'all' ? activities : activities.filter((a) => a.type === filter);

  const totalDistance = filteredActivities.reduce((s, a) => s + a.distance, 0);
  const totalCount = filteredActivities.length;
  const totalSeconds = filteredActivities.reduce(
    (s, a) => s + parseMovingTime(a.moving_time),
    0
  );

  const goal = GOALS[filter] ?? DEFAULT_GOAL;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const yearActivities = filteredActivities.filter((a) => {
    const d = new Date(a.start_date_local);
    return d.getFullYear() === currentYear;
  });
  const monthActivities = filteredActivities.filter((a) => {
    const d = new Date(a.start_date_local);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const yearDistance = yearActivities.reduce((s, a) => s + a.distance, 0);
  const monthDistance = monthActivities.reduce((s, a) => s + a.distance, 0);
  const yearSeconds = yearActivities.reduce(
    (s, a) => s + parseMovingTime(a.moving_time),
    0
  );
  const monthSeconds = monthActivities.reduce(
    (s, a) => s + parseMovingTime(a.moving_time),
    0
  );

  const allDates = activities.map((a) =>
    new Date(a.start_date_local).getFullYear()
  );
  const yearsActive =
    allDates.length > 0 ? Math.max(...allDates) - Math.min(...allDates) + 1 : 0;

  // Countries and provinces — use shared extractProvince for consistency with ChinaMap
  const countries = new Set<string>();
  const provinces = new Set<string>();
  for (const a of activities) {
    const loc = a.location_country;
    if (!loc || loc === 'None') continue;
    // Detect country
    if (loc.startsWith('{')) {
      try {
        const d = JSON.parse(loc.replace(/'/g, '"').replace(/None/g, 'null'));
        if (d.country) countries.add(d.country);
      } catch {
        /* ignore */
      }
    } else if (loc.includes('泰国')) {
      countries.add('泰国');
    } else if (loc.includes('日本')) {
      countries.add('日本');
    } else {
      countries.add('中国');
    }
    // Province — use shared logic (China-only)
    const p = extractProvince(loc);
    if (p) provinces.add(p);
  }

  const formatScheduledDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (locale === 'zh') {
      const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
      return `${month}月${day}日（周${weekdayNames[weekday]}）`;
    }
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${weekdayNames[weekday]}, ${month}/${day}`;
  };

  const formatHours = (secs: number) => `${(secs / 3600).toFixed(1)}h`;

  const latest =
    activities.length > 0
      ? [...activities].sort(
          (a, b) =>
            new Date(b.start_date_local).getTime() -
            new Date(a.start_date_local).getTime()
        )[0]
      : null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (locale === 'zh') {
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 hover:shadow-[var(--color-accent)]/5 hover:shadow-lg">
      {/* Avatar top-left + Distance */}
      <div className="hidden items-center gap-4 lg:flex">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[var(--color-border)]">
          {AVATAR ? (
            <img
              src={AVATAR}
              alt="avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--color-accent)]/20">
              <svg
                className="h-7 w-7 text-[var(--color-accent)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 text-center">
          <p className="font-mono text-3xl font-bold">
            {formatDistance(totalDistance)}
            <span className="ml-1 text-base font-normal text-[var(--color-muted)]">
              km
            </span>
          </p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-sm text-[var(--color-muted)]">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {countries.size} {t('countries')} ·
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {provinces.size} {t('provinces')}
          </p>
        </div>
      </div>

      {/* Compact three-column stats for mobile */}
      <div className="grid grid-cols-3 gap-2 text-center lg:hidden">
        <div className="min-w-0 text-left">
          <p className="text-xs text-[var(--color-muted)]">
            {locale === 'zh' ? '总跑量' : 'Total Distance'}
          </p>
          <p className="font-mono text-xl font-bold whitespace-nowrap">
            {formatDistance(totalDistance)}
            <span className="ml-0.5 text-xs font-normal text-[var(--color-muted)]">
              km
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[10px] leading-snug text-[var(--color-muted)]">
            <span>
              {countries.size} {t('countries')}
            </span>
            <span>·</span>
            <span>
              {provinces.size} {t('provinces')}
            </span>
          </p>
        </div>
        <div className="min-w-0 border-x border-[var(--color-border)] px-1">
          <p className="text-xs text-[var(--color-muted)]">
            {locale === 'zh' ? '年跑量' : 'Year'}
          </p>
          <p className="font-mono text-lg font-bold whitespace-nowrap">
            {goal.unit === 'time'
              ? formatHours(yearSeconds)
              : formatDistance(yearDistance)}
          </p>
          <p className="mt-1 text-[10px] leading-snug whitespace-nowrap text-[var(--color-muted)]">
            {locale === 'zh' ? '目标' : 'Goal'}{' '}
            {goal.unit === 'time'
              ? `${Math.round(goal.yearly / 60)}h`
              : `${goal.yearly} km`}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-muted)]">
            {locale === 'zh' ? '月跑量' : 'Month'}
          </p>
          <p className="font-mono text-lg font-bold whitespace-nowrap">
            {goal.unit === 'time'
              ? formatHours(monthSeconds)
              : formatDistance(monthDistance)}
          </p>
          <p className="mt-1 text-[10px] leading-snug whitespace-nowrap text-[var(--color-muted)]">
            {locale === 'zh' ? '目标' : 'Goal'}{' '}
            {goal.unit === 'time'
              ? `${Math.round(goal.monthly / 60)}h`
              : `${goal.monthly} km`}
          </p>
        </div>
      </div>

      {/* Stats row - Strava style */}
      <div className="mt-4 hidden grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-4 text-center lg:grid">
        <div>
          <p className="flex items-center justify-center gap-1 text-xs text-[var(--color-muted)]">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            {t('activities')}
          </p>
          <p className="text-lg font-bold">{totalCount.toLocaleString()}</p>
        </div>
        <div className="border-x border-[var(--color-border)]">
          <p className="flex items-center justify-center gap-1 text-xs text-[var(--color-muted)]">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {t('years')}
          </p>
          <p className="text-lg font-bold">{yearsActive}</p>
        </div>
        <div>
          <p className="flex items-center justify-center gap-1 text-xs text-[var(--color-muted)]">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {locale === 'zh' ? '时间' : 'Time'}
          </p>
          <p className="text-lg font-bold">{formatHours(totalSeconds)}</p>
        </div>
      </div>

      {/* Latest Activity */}
      {latest && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4 lg:block">
          <p className="shrink-0 text-xs text-[var(--color-muted)] lg:mb-1">
            {locale === 'zh' ? '最近活动' : 'Latest Activity'}
          </p>
          <p className="min-w-0 flex-1 truncate text-right text-sm font-medium lg:text-left">
            {latest.type === 'Run' ? '🏃 ' : '🚴 '}
            {latest.name || (latest.type === 'Run' ? 'Run' : 'Ride')}
            <span className="font-normal text-[var(--color-muted)]">
              {' '}
              · {formatDistance(latest.distance)} km ·{' '}
              {formatDate(latest.start_date_local)}
            </span>
          </p>
        </div>
      )}

      {/* Next Scheduled Workout */}
      {nextWorkout && (
        <div className="mt-2 flex items-center justify-between gap-3 lg:block">
          <p className="shrink-0 text-xs text-[var(--color-muted)] lg:mb-1">
            {locale === 'zh' ? '下次安排' : 'Next Workout'}
          </p>
          <p className="min-w-0 flex-1 truncate text-right text-sm font-medium lg:text-left">
            {nextWorkout.sport_type === 'cycling' ? '🚴 ' : '🏃 '}
            {formatScheduledDate(nextWorkout.date)}
            <span className="font-normal text-[var(--color-muted)]">
              {' · '}
              {nextWorkout.name}
              {nextWorkout.distance_km != null
                ? ` · ${nextWorkout.distance_km} km`
                : ''}
              {nextWorkout.estimated_time
                ? ` · ${nextWorkout.estimated_time}`
                : ''}
            </span>
          </p>
        </div>
      )}
    </div>
  );
});
