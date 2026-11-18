import { useLocale } from '../hooks/useLocale';

type Page = 'home' | 'tracks' | 'summary' | 'ai-review' | 'prediction';

interface HeaderProps {
  page: Page;
  onNavigate: (p: Page) => void;
  mobileHome?: boolean;
}

function NavigationIcon({ page }: { page: Page }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (page) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v12h14V9M9 21v-6h6v6" />
        </svg>
      );
    case 'tracks':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <circle cx="6" cy="18" r="2.25" />
          <circle cx="18" cy="6" r="2.25" />
          <path d="M8.2 17.1c2.1-1.1 1.4-4.3 3.4-5.2 1.7-.8 3.1.4 4.2-1.4" />
        </svg>
      );
    case 'summary':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <path d="M4 20V11M10 20V5M16 20v-8M22 20H2" />
        </svg>
      );
    case 'ai-review':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M7.5 3v4M16.5 3v4M3.5 10h17M8 14h3M8 17h7" />
        </svg>
      );
    case 'prediction':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
  }
}

export function Header({ page, onNavigate, mobileHome = false }: HeaderProps) {
  const { t, locale } = useLocale();
  const navItems: { label: string; mobileLabel: string; page: Page }[] = [
    {
      label: t('home'),
      mobileLabel: locale === 'zh' ? '首页' : 'Home',
      page: 'home',
    },
    {
      label: t('tracks'),
      mobileLabel: locale === 'zh' ? '轨迹' : 'Tracks',
      page: 'tracks',
    },
    {
      label: t('summary'),
      mobileLabel: t('summary'),
      page: 'summary',
    },
    {
      label: t('aiReview'),
      mobileLabel: locale === 'zh' ? '周报' : 'Weekly',
      page: 'ai-review',
    },
    {
      label: t('prediction'),
      mobileLabel: locale === 'zh' ? '预测' : 'Predict',
      page: 'prediction',
    },
  ];

  return (
    <header
      className={
        mobileHome
          ? 'mobile-home-header sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/70 backdrop-blur-md'
          : 'sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/70 backdrop-blur-md'
      }
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          aria-label="回到首页"
          title="回到首页"
          className="mobile-home-brand cursor-pointer border-0 bg-transparent p-0 text-xl font-bold text-[var(--color-text)]"
        >
          RUNNING<span className="text-[var(--color-run)]">.</span>PAGE
        </button>
        <nav
          aria-label="主导航"
          className={
            mobileHome
              ? 'mobile-home-bottom-nav flex flex-wrap items-center gap-3 sm:gap-6'
              : 'flex flex-wrap items-center gap-3 sm:gap-6'
          }
        >
          {navItems.map((item) => (
            <button
              aria-current={item.page === page ? 'page' : undefined}
              type="button"
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`${mobileHome ? 'mobile-home-nav-button' : ''}cursor-pointer border-0 bg-transparent p-0 text-sm transition-colors ${
                item.page === page
                  ? 'font-medium text-[var(--color-accent)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {mobileHome && <NavigationIcon page={item.page} />}
              <span className="mobile-home-nav-desktop-label">
                {item.label}
              </span>
              {mobileHome && (
                <span className="mobile-home-nav-mobile-label">
                  {item.mobileLabel}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
