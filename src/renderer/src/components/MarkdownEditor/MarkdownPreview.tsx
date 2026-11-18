import React from 'react';

interface MarkdownPreviewProps {
  content: string;
  maxLines?: number;
  className?: string;
}

// Извлекает color и background-color из style/data-color/data-bg-color/color атрибутов
const extractStyles = (attrsStr: string): { color?: string; backgroundColor?: string } => {
  const styles: { color?: string; backgroundColor?: string } = {};

  const styleMatch = attrsStr.match(/style=["']([^"']*)["']/i);
  if (styleMatch) {
    const styleContent = styleMatch[1];
    const colorMatch = styleContent.match(/(?:^|;)\s*color:\s*([^;!]+)/i);
    if (colorMatch) {
      const c = colorMatch[1].trim();
      if (c && c !== 'inherit') styles.color = c;
    }
    const bgMatch = styleContent.match(/(?:^|;)\s*background(?:-color)?:\s*([^;!]+)/i);
    if (bgMatch) {
      const bg = bgMatch[1].trim();
      if (bg && bg !== 'transparent') styles.backgroundColor = bg;
    }
  }

  const dataColorMatch = attrsStr.match(/data-color=["']([^"']*)["']/i);
  if (dataColorMatch && !styles.color) {
    const c = dataColorMatch[1].trim();
    if (c && c !== 'inherit') styles.color = c;
  }

  const dataBgMatch = attrsStr.match(/data-bg-color=["']([^"']*)["']/i);
  if (dataBgMatch && !styles.backgroundColor) {
    const bg = dataBgMatch[1].trim();
    if (bg && bg !== 'transparent') styles.backgroundColor = bg;
  }

  const colorAttrMatch = attrsStr.match(/\bcolor=["']([^"']*)["']/i);
  if (colorAttrMatch && !styles.color) {
    const c = colorAttrMatch[1].trim();
    if (c && c !== 'inherit') styles.color = c;
  }

  return styles;
};

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  maxLines = 4,
  className = '',
}) => {
  if (!content || !content.trim()) return null;

  // Парсим инлайновые маркдаун-элементы и HTML теги форматирования цветов
  const parseInline = (text: string, depth = 0): React.ReactNode[] => {
    if (!text) return [];
    if (depth > 10) return [text];

    const cleaned = text.replace(/\\$/g, '').trim();
    if (!cleaned) return [];

    // Токены: mark, span, font, u, bold, italic, code, del, link
    const TOKEN_REGEX = /(<mark\b[^>]*>[\s\S]*?<\/mark>|<span\b[^>]*>[\s\S]*?<\/span>|<font\b[^>]*>[\s\S]*?<\/font>|<u\b[^>]*>[\s\S]*?<\/u>|\*\*.*?\*\*|\*.*?\*|`.*?`|~~.*?~~|\[.*?\]\(.*?\))/gi;

    const tokens = cleaned.split(TOKEN_REGEX);

    return tokens.map((token, i) => {
      if (!token) return null;

      // 1. Выделение фоном <mark...>...</mark>
      const markMatch = token.match(/^<mark\b([^>]*)>([\s\S]*?)<\/mark>$/i);
      if (markMatch) {
        const attrsStr = markMatch[1];
        const inner = markMatch[2];
        const styles = extractStyles(attrsStr);
        return (
          <mark
            key={`m-${depth}-${i}`}
            style={{
              backgroundColor: styles.backgroundColor || 'rgba(250, 204, 21, 0.35)',
              color: styles.color || 'inherit',
              borderRadius: '3px',
              padding: '0.5px 3px',
            }}
            className="rounded"
          >
            {parseInline(inner, depth + 1)}
          </mark>
        );
      }

      // 2. Цвет текста / стиль <span...>...</span>
      const spanMatch = token.match(/^<span\b([^>]*)>([\s\S]*?)<\/span>$/i);
      if (spanMatch) {
        const attrsStr = spanMatch[1];
        const inner = spanMatch[2];
        const styles = extractStyles(attrsStr);
        if (styles.color || styles.backgroundColor) {
          return (
            <span
              key={`s-${depth}-${i}`}
              style={{
                color: styles.color,
                backgroundColor: styles.backgroundColor,
                borderRadius: styles.backgroundColor ? '3px' : undefined,
                padding: styles.backgroundColor ? '0.5px 3px' : undefined,
              }}
            >
              {parseInline(inner, depth + 1)}
            </span>
          );
        }
        return <React.Fragment key={`s-${depth}-${i}`}>{parseInline(inner, depth + 1)}</React.Fragment>;
      }

      // 3. Тег <font color="...">...</font>
      const fontMatch = token.match(/^<font\b([^>]*)>([\s\S]*?)<\/font>$/i);
      if (fontMatch) {
        const styles = extractStyles(fontMatch[1]);
        return (
          <span
            key={`f-${depth}-${i}`}
            style={{
              color: styles.color,
              backgroundColor: styles.backgroundColor,
            }}
          >
            {parseInline(fontMatch[2], depth + 1)}
          </span>
        );
      }

      // 4. Подчёркнутый <u>...</u>
      const uMatch = token.match(/^<u\b([^>]*)>([\s\S]*?)<\/u>$/i);
      if (uMatch) {
        return (
          <span key={`u-${depth}-${i}`} className="underline underline-offset-2">
            {parseInline(uMatch[2], depth + 1)}
          </span>
        );
      }

      // 5. Жирный **text**
      if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
        return (
          <strong key={`b-${depth}-${i}`} className="font-bold">
            {parseInline(token.slice(2, -2), depth + 1)}
          </strong>
        );
      }

      // 6. Курсив *text*
      if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
        return (
          <em key={`em-${depth}-${i}`} className="italic">
            {parseInline(token.slice(1, -1), depth + 1)}
          </em>
        );
      }

      // 7. Инлайн-код `code`
      if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
        return (
          <code
            key={`c-${depth}-${i}`}
            className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-800 dark:text-zinc-200"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      // 8. Зачёркнутый ~~text~~
      if (token.startsWith('~~') && token.endsWith('~~') && token.length >= 4) {
        return (
          <del key={`del-${depth}-${i}`} className="line-through opacity-70">
            {parseInline(token.slice(2, -2), depth + 1)}
          </del>
        );
      }

      // 9. Ссылка [text](url)
      const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <span key={`l-${depth}-${i}`} className="underline underline-offset-2">
            {linkMatch[1] || linkMatch[2]}
          </span>
        );
      }

      // Обычный текст с удалением случайных незакрытых html-тегов форматирования
      const cleanToken = token.replace(/<\/?(?:span|mark|font|u)[^>]*>/gi, '');
      return <span key={`t-${depth}-${i}`}>{cleanToken}</span>;
    });
  };

  // Разбиваем на строки и берём первые maxLines непустых строк
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .slice(0, maxLines);

  return (
    <div className={`space-y-1 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed overflow-hidden ${className}`}>
      {lines.map((line, idx) => {
        const lineCleaned = line
          .replace(/^<p\b[^>]*>/i, '')
          .replace(/<\/p>$/i, '')
          .replace(/<br\s*\/?>/gi, ' ')
          .trim();

        if (!lineCleaned) return null;

        // Чекбоксы: - [ ] или - [x]
        const checkedBoxMatch = lineCleaned.match(/^-\s*\[([ xX])\]\s*(.*)$/);
        if (checkedBoxMatch) {
          const isChecked = checkedBoxMatch[1].toLowerCase() === 'x';
          const taskText = checkedBoxMatch[2];
          return (
            <div key={idx} className="flex items-start space-x-1.5 text-[11px] leading-tight min-w-0">
              <span
                className={`w-3.5 h-3.5 mt-0.5 rounded-full flex items-center justify-center shrink-0 border ${
                  isChecked
                    ? 'bg-[#191919] dark:bg-white border-[#191919] dark:border-white text-white dark:text-[#191919] text-[9px] font-black'
                    : 'border-zinc-300 dark:border-zinc-600 bg-white/50 dark:bg-zinc-800/50'
                }`}
              >
                {isChecked ? '✓' : ''}
              </span>
              <span className={`min-w-0 ${maxLines === 1 ? 'truncate' : 'break-words'} ${isChecked ? 'text-zinc-400 dark:text-zinc-500 line-through' : ''}`}>
                {parseInline(taskText)}
              </span>
            </div>
          );
        }

        // Заголовки: # H1, ## H2, ### H3
        const headerMatch = lineCleaned.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const headerText = headerMatch[2];
          return (
            <div
              key={idx}
              className={`font-bold text-zinc-800 dark:text-zinc-100 ${
                maxLines === 1 ? 'truncate' : 'break-words'
              } ${level === 1 ? 'text-xs' : 'text-[11px]'}`}
            >
              {parseInline(headerText)}
            </div>
          );
        }

        // Маркированные списки: - item или * item
        const bulletMatch = lineCleaned.match(/^[-*]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start space-x-1.5 text-[11px] min-w-0">
              <span className="text-zinc-400 dark:text-zinc-500 font-bold shrink-0">•</span>
              <span className={`min-w-0 ${maxLines === 1 ? 'truncate' : 'break-words'}`}>{parseInline(bulletMatch[1])}</span>
            </div>
          );
        }

        // Нумерованные списки: 1. item
        const numberedMatch = lineCleaned.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start space-x-1.5 text-[11px] min-w-0">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium shrink-0 font-mono text-[10px]">
                {numberedMatch[1]}.
              </span>
              <span className={`min-w-0 ${maxLines === 1 ? 'truncate' : 'break-words'}`}>{parseInline(numberedMatch[2])}</span>
            </div>
          );
        }

        // Цитата: > text
        const quoteMatch = lineCleaned.match(/^>\s*(.*)$/);
        if (quoteMatch) {
          return (
            <div key={idx} className={`pl-2 border-l-2 border-zinc-300 dark:border-zinc-700 italic text-[11px] text-zinc-500 dark:text-zinc-400 ${maxLines === 1 ? 'truncate' : 'break-words'}`}>
              {parseInline(quoteMatch[1])}
            </div>
          );
        }

        // Обычный абзац
        return (
          <p key={idx} className={`leading-relaxed ${maxLines === 1 ? 'truncate' : 'break-words'}`}>
            {parseInline(lineCleaned)}
          </p>
        );
      })}
    </div>
  );
};
