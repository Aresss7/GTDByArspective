import type { Editor } from '@tiptap/core';

/**
 * Извлекает все уникальные валидные веб-ссылки (http/https) из документа TipTap или markdown-текста
 */
export function extractLinkUrls(content?: string, editor?: Editor | null): string[] {
  const urls = new Set<string>();

  // 1. Извлечение ссылок из AST-дерева редактора TipTap (активные ссылки и текст)
  if (editor && !editor.isDestroyed && editor.state?.doc) {
    editor.state.doc.descendants((node) => {
      // Извлекаем из меток ссылок (link marks)
      if (node.marks && node.marks.length > 0) {
        for (const mark of node.marks) {
          if (mark.type.name === 'link' && mark.attrs?.href) {
            urls.add(mark.attrs.href);
          }
        }
      }
      // Извлекаем из текстовых узлов (на случай если ссылка еще не размечена маркой)
      if (node.isText && node.text) {
        const textMatches = node.text.match(/https?:\/\/[^\s<>"'`)]+/gi);
        if (textMatches) {
          for (const u of textMatches) {
            urls.add(u);
          }
        }
      }
    });
  }

  // 2. Извлечение из markdown/текстового контента
  if (content && typeof content === 'string') {
    // Автоссылки <https://...>
    const autoRegex = /<(https?:\/\/[^\s>]+)>/gi;
    let m: RegExpExecArray | null;
    while ((m = autoRegex.exec(content)) !== null) {
      urls.add(m[1]);
    }

    // Ссылки формата Markdown [текст](https://...)
    const mdRegex = /\[([^\]]*)\]\(((?:https?:\/\/)[^\s)]+)\)/gi;
    while ((m = mdRegex.exec(content)) !== null) {
      urls.add(m[2]);
    }

    // Обычные текстовые URL
    const rawRegex = /https?:\/\/[^\s<>"'`)]+/gi;
    while ((m = rawRegex.exec(content)) !== null) {
      urls.add(m[0]);
    }
  }

  // 3. Нормализация, очистка от экранирования markdown и валидация
  const result: string[] = [];
  for (const raw of urls) {
    if (!raw || typeof raw !== 'string') continue;

    // Убираем экранирование markdown символов (например GYcFS\_7\_JPM -> GYcFS_7_JPM)
    let clean = raw.replace(/\\([_\\*~`[\]()#+\-.!])/g, '$1');

    // Убираем замыкающую пунктуацию, не относящуюся к URL
    clean = clean.replace(/[.,;:!?\\"']+$/, '').replace(/\\+$/, '');

    try {
      const parsed = new URL(clean);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        result.push(parsed.href);
      }
    } catch {
      // Игнорируем некорректные URL
    }
  }

  return Array.from(new Set(result));
}
