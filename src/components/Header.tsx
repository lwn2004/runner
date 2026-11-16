import { useLocale } from '../hooks/useLocale';

type Page = 'home' | 'tracks' | 'summary' | 'ai-review' | 'prediction';

interface HeaderProps {
  page: Page;
  onNavigate: (p: Page) => void;
}

export function Header({ page, onNavigate }: HeaderProps) {
  const { t } = useLocale();
  const navItems: { label: string; page: Page }[] = [
    { label: t('home'), page: 'home' },
    { label: t('tracks'), page: 'tracks' },
    { label: t('summary'), page: 'summary' },
    { label: t('aiReview'), page: 'ai-review' },
    { label: t('prediction'), page: 'prediction' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          aria-label="回到首页"
          title="回到首页"
          className="cursor-pointer border-0 bg-transparent p-0 text-xl font-bold text-[var(--color-text)]"
        >
          RUNNING<span className="text-[var(--color-run)]">.</span>PAGE
        </button>
        <nav
          aria-label="主导航"
          className="flex flex-wrap items-center gap-3 sm:gap-6"
        >
          {navItems.map((item) => (
            <button
              aria-current={item.page === page ? 'page' : undefined}
              type="button"
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`cursor-pointer border-0 bg-transparent p-0 text-sm transition-colors ${
                item.page === page
                  ? 'font-medium text-[var(--color-accent)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
