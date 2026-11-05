import React from 'react';

interface MarkdownPreviewProps {
  content: string;
  maxLines?: number;
  className?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  maxLines = 4,
  className = '',
}) => {
  if (!content || !content.trim()) return null;

  // Парсим инлайновые маркдаун-элементы (жирный, курсив, код, зачёркнутый, ссылки)
  const parseInline = (text: string): React.ReactNode[] => {
    // Убираем экранированные слэши переносов строк
    const cleaned = text.replace(/\\$/g, '').trim();

    // Разбиваем строку на токены с помощью регулярного выражения
    // 1: Bold (**bold**), 2: Italic (*italic*), 3: Code (`code`), 4: Strikethrough (~~del~~), 5: Link ([text](url))
    const tokens = cleaned.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|~~.*?~~|\[.*?\]\(.*?\))/g);

    return tokens.map((token, i) => {
      if (!token) return null;

      // Жирный **text**
      if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
        return <strong key={i} className="font-bold text-zinc-900 dark:text-zinc-100">{token.slice(2, -2)}</strong>;
      }

      // Курсив *text*
      if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
        return <em key={i} className="italic text-zinc-700 dark:text-zinc-300">{token.slice(1, -1)}</em>;
      }

      // Инлайн-код `code`
      if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
        return (
          <code
            key={i}
            className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-800 dark:text-zinc-200"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      // Зачёркнутый ~~text~~
      if (token.startsWith('~~') && token.endsWith('~~') && token.length >= 4) {
        return <del key={i} className="line-through text-zinc-400 dark:text-zinc-500">{token.slice(2, -2)}</del>;
      }

      // Ссылка [text](url)
      const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <span key={i} className="text-zinc-700 dark:text-zinc-300 underline underline-offset-2">
            {linkMatch[1] || linkMatch[2]}
          </span>
        );
      }

      return <span key={i}>{token}</span>;
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
        const trimmed = line.trim();

        // Чекбоксы: - [ ] или - [x]
        const checkedBoxMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.*)$/);
        if (checkedBoxMatch) {
          const isChecked = checkedBoxMatch[1].toLowerCase() === 'x';
          const taskText = checkedBoxMatch[2];
          return (
            <div key={idx} className="flex items-start space-x-1.5 text-[11px] leading-tight">
              <span
                className={`w-3.5 h-3.5 mt-0.5 rounded-full flex items-center justify-center shrink-0 border ${
                  isChecked
                    ? 'bg-[#191919] dark:bg-white border-[#191919] dark:border-white text-white dark:text-[#191919] text-[9px] font-black'
                    : 'border-zinc-300 dark:border-zinc-600 bg-white/50 dark:bg-zinc-800/50'
                }`}
              >
                {isChecked ? '✓' : ''}
              </span>
              <span className={`break-words ${isChecked ? 'text-zinc-400 dark:text-zinc-500' : ''}`}>
                {parseInline(taskText)}
              </span>
            </div>
          );
        }

        // Заголовки: # H1, ## H2, ### H3
        const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const headerText = headerMatch[2];
          return (
            <div
              key={idx}
              className={`font-bold text-zinc-800 dark:text-zinc-100 ${
                level === 1 ? 'text-xs' : 'text-[11px]'
              }`}
            >
              {parseInline(headerText)}
            </div>
          );
        }

        // Маркированные списки: - item или * item
        const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start space-x-1.5 text-[11px]">
              <span className="text-zinc-400 dark:text-zinc-500 font-bold shrink-0">•</span>
              <span className="break-words">{parseInline(bulletMatch[1])}</span>
            </div>
          );
        }

        // Нумерованные списки: 1. item
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start space-x-1.5 text-[11px]">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium shrink-0 font-mono text-[10px]">
                {numberedMatch[1]}.
              </span>
              <span className="break-words">{parseInline(numberedMatch[2])}</span>
            </div>
          );
        }

        // Цитата: > text
        const quoteMatch = trimmed.match(/^>\s*(.*)$/);
        if (quoteMatch) {
          return (
            <div key={idx} className="pl-2 border-l-2 border-zinc-300 dark:border-zinc-700 italic text-[11px] text-zinc-500 dark:text-zinc-400">
              {parseInline(quoteMatch[1])}
            </div>
          );
        }

        // Обычный абзац
        return (
          <p key={idx} className="break-words leading-relaxed">
            {parseInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};
