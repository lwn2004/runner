import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../hooks/useLocale';

interface ReportEntry {
  date: string;
  report: string;
}

const panel =
  'rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-7';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMarkdown(value: string) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replaceAll('**', '<strong>');
  html = html.replaceAll('*', '<em>');
  html = html.replaceAll('[', '').replaceAll('](', ' — ').replaceAll(')', '');
  return html;
}

function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      output.push('<hr />');
      i++;
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      i++;
      continue;
    }
    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) quote.push(inlineMarkdown(lines[i++].replace(/^>\s?/, '')));
      output.push(`<blockquote>${quote.map((v) => `<p>${v}</p>`).join('')}</blockquote>`);
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const cells = (value: string) => value.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
      const headers = cells(line);
      i += 2;
      const rows: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(`<tr>${cells(lines[i++]).map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`);
      }
      output.push(`<div class="report-table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(`<li>${inlineMarkdown(lines[i++].replace(/^\s*[-*]\s+/, ''))}</li>`);
      output.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(`<li>${inlineMarkdown(lines[i++].replace(/^\s*\d+\.\s+/, ''))}</li>`);
      output.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    const paragraph = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4})\s|^>|^\s*[-*]\s+|^\s*\d+\.\s+|^---+$/.test(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1]))) {
      paragraph.push(lines[i++].trim());
    }
    output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
  }
  return output.join('\n');
}

export function ReportsPage() {
  const { locale } = useLocale();
  const zh = locale === 'zh';
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [selected, setSelected] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}data/summary/index.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<ReportEntry[]>;
      })
      .then((items) => {
        if (!active) return;
        const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
        setReports(sorted);
        setSelected(sorted[0]?.date ?? '');
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const current = useMemo(
    () => reports.find((item) => item.date === selected),
    [reports, selected]
  );

  useEffect(() => {
    if (!current) {
      setContent('');
      return;
    }
    let active = true;
    fetch(`${import.meta.env.BASE_URL}data/summary/${current.report}`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((text) => {
        if (active) {
          setContent(text);
          setError('');
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      active = false;
    };
  }, [current]);

  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-accent)] uppercase">
            Weekly review
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            {zh ? '跑步周报' : 'Running Reports'}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {zh ? '来自每周 COROS 训练复盘的完整报告' : 'Full reports from the weekly COROS training review'}
          </p>
        </div>
        {reports.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            {zh ? '选择周报' : 'Select report'}
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-[var(--color-text)]"
            >
              {reports.map((item) => (
                <option key={item.date} value={item.date}>{item.date}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {loading ? (
        <div className={panel}>{zh ? '正在加载周报…' : 'Loading reports…'}</div>
      ) : error ? (
        <div className={panel}>
          <p className="font-semibold">{zh ? '周报加载失败' : 'Unable to load report'}</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{error}</p>
        </div>
      ) : !reports.length ? (
        <div className={panel}>{zh ? '还没有周报。下一次周报生成后会显示在这里。' : 'No reports yet. New weekly reviews will appear here.'}</div>
      ) : (
        <article className={`${panel} report-content`}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
            <div>
              <h2 className="text-lg font-semibold">{selected}</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {zh ? '每周跑步复盘 · 汕头马拉松 3:30' : 'Weekly running review · Shantou Marathon 3:30'}
              </p>
            </div>
            {current && (
              <a
                href={`${import.meta.env.BASE_URL}data/summary/${current.report}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--color-accent)] hover:underline"
              >
                {zh ? '打开原始 Markdown ↗' : 'Open Markdown ↗'}
              </a>
            )}
          </div>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      )}
    </main>
  );
}
