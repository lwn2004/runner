import { useEffect, useMemo, useState } from 'react';

interface ReportEntry {
  date: string;
  report: string;
}

const INDEX_URL = '/data/summary/index.json';
const REPORT_BASE = '/data/summary/';

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"]/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
      })[char] || char
  );
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const output: string[] = [];
  let paragraph: string[] = [];
  let listType = '';
  let tableRows: string[][] = [];

  const flushParagraph = () => {
    if (paragraph.length)
      output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (listType) output.push(`</${listType}>`);
    listType = '';
  };
  const flushTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows.filter(
      (row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
    );
    if (rows.length) {
      output.push('<div class="report-table-wrap"><table><tbody>');
      rows.forEach((row, index) => {
        output.push(
          '<tr>' +
            row
              .map(
                (cell) =>
                  `<${index === 0 ? 'th' : 'td'}>${inlineMarkdown(cell.trim())}</${index === 0 ? 'th' : 'td'}>`
              )
              .join('') +
            '</tr>'
        );
      });
      output.push('</tbody></table></div>');
    }
    tableRows = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushParagraph();
      flushList();
      tableRows.push(trimmed.slice(1, -1).split('|'));
      continue;
    }
    flushTable();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (/^---+$/.test(trimmed)) {
      flushParagraph();
      flushList();
      output.push('<hr />');
    } else if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      flushList();
      output.push(
        `<blockquote>${inlineMarkdown(trimmed.replace(/^>\s?/, ''))}</blockquote>`
      );
    } else if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
        output.push('<ul>');
      }
      output.push(
        `<li>${inlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
        output.push('<ol>');
      }
      output.push(
        `<li>${inlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</li>`
      );
    } else {
      flushList();
      paragraph.push(trimmed);
    }
  }
  flushParagraph();
  flushList();
  flushTable();
  return output.join('\n');
}

export function AIReviewPage() {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [selected, setSelected] = useState(0);
  const [markdown, setMarkdown] = useState('');
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(INDEX_URL, { signal: controller.signal, cache: 'no-cache' })
      .then((response) => {
        if (!response.ok)
          throw new Error(`索引加载失败（HTTP ${response.status}）`);
        return response.json() as Promise<ReportEntry[]>;
      })
      .then((items) => {
        const valid = items
          .filter((item) => item.date && item.report)
          .sort((a, b) => b.date.localeCompare(a.date));
        setReports(valid);
        setLoadingIndex(false);
        if (!valid.length) setError('暂时没有 AI 复盘报告。');
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(
          reason instanceof Error ? reason.message : '无法加载报告索引。'
        );
        setLoadingIndex(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!reports.length) return;
    const controller = new AbortController();
    setLoadingReport(true);
    setMarkdown('');
    fetch(`${REPORT_BASE}${reports[selected].report}`, {
      signal: controller.signal,
      cache: 'no-cache',
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(`报告加载失败（HTTP ${response.status}）`);
        return response.text();
      })
      .then(setMarkdown)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(
          reason instanceof Error ? reason.message : '无法加载报告内容。'
        );
      })
      .finally(() => setLoadingReport(false));
    return () => controller.abort();
  }, [reports, selected]);

  const html = useMemo(() => markdownToHtml(markdown), [markdown]);
  const panel =
    'rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-7';

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">每周 AI 跑步复盘</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            来自 COROS 训练数据与每周 ChatGPT 复盘报告
          </p>
        </div>
        {!loadingIndex && reports.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="report-date"
              className="text-sm text-[var(--color-muted)]"
            >
              报告日期
            </label>
            <select
              id="report-date"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
              value={selected}
              onChange={(event) => setSelected(Number(event.target.value))}
            >
              {reports.map((report, index) => (
                <option key={report.date} value={index}>
                  {report.date}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {error && (
        <div role="alert" className={`${panel} mb-4 text-sm text-rose-400`}>
          {error}
        </div>
      )}
      <article className={panel}>
        {loadingIndex || loadingReport ? (
          <p className="py-12 text-center text-sm text-[var(--color-muted)]">
            正在加载复盘报告…
          </p>
        ) : markdown ? (
          <div
            className="ai-report-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="py-12 text-center text-sm text-[var(--color-muted)]">
            暂无可显示的报告。
          </p>
        )}
      </article>
      <style>{`
        .ai-report-content { color: var(--color-text); font-size: 14px; line-height: 1.8; overflow-wrap: anywhere; }
        .ai-report-content h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 1.25rem; }
        .ai-report-content h2 { font-size: 1.2rem; font-weight: 700; margin: 2rem 0 .75rem; padding-bottom: .45rem; border-bottom: 1px solid var(--color-border); }
        .ai-report-content h3 { font-size: 1.05rem; font-weight: 650; margin: 1.5rem 0 .5rem; }
        .ai-report-content h4 { font-weight: 650; margin: 1rem 0 .4rem; }
        .ai-report-content p { margin: .65rem 0; }
        .ai-report-content ul,.ai-report-content ol { padding-left: 1.5rem; margin: .6rem 0; }
        .ai-report-content li { margin: .25rem 0; }
        .ai-report-content strong { font-weight: 700; }
        .ai-report-content code { background: var(--color-bg); padding: .1rem .3rem; border-radius: 4px; }
        .ai-report-content a { color: var(--color-accent); text-decoration: underline; }
        .ai-report-content blockquote { border-left: 3px solid var(--color-accent); padding-left: 1rem; color: var(--color-muted); }
        .ai-report-content hr { border: 0; border-top: 1px solid var(--color-border); margin: 1.5rem 0; }
        .report-table-wrap { overflow-x: auto; margin: 1rem 0 1.5rem; }
        .ai-report-content table { width: 100%; border-collapse: collapse; font-size: 12px; white-space: nowrap; }
        .ai-report-content th,.ai-report-content td { border: 1px solid var(--color-border); padding: .5rem .65rem; text-align: left; }
        .ai-report-content th { background: var(--color-bg); font-weight: 650; }
      `}</style>
    </main>
  );
}
