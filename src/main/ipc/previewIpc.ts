import { ipcMain, shell } from 'electron';
import { getDatabase } from '../../storage/database';

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

export function registerPreviewIpc(): void {
  // Безопасное открытие внешней ссылки в браузере по умолчанию
  ipcMain.handle('system:openExternalUrl', async (_, rawUrl: string) => {
    try {
      if (!rawUrl || typeof rawUrl !== 'string') return false;
      const parsed = new URL(rawUrl.trim());
      // Разрешены строго безопасные веб-протоколы (никаких javascript:, data:, file:)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        console.warn('[Security] Blocked attempt to open non-http URL:', rawUrl);
        return false;
      }
      await shell.openExternal(parsed.href);
      return true;
    } catch (e) {
      console.error('Failed to open external url:', e);
      return false;
    }
  });

  // Получение метаданных ссылки для карточки предпросмотра (с кэшированием в SQLite)
  ipcMain.handle('system:fetchLinkPreview', async (_, targetUrl: string): Promise<LinkPreviewData> => {
    if (!targetUrl || typeof targetUrl !== 'string') {
      return { url: targetUrl, title: null, description: null, imageUrl: null };
    }

    let validUrl: URL;
    try {
      validUrl = new URL(targetUrl.trim());
      if (validUrl.protocol !== 'http:' && validUrl.protocol !== 'https:') {
        return { url: targetUrl, title: null, description: null, imageUrl: null };
      }
    } catch {
      return { url: targetUrl, title: null, description: null, imageUrl: null };
    }

    const cleanUrl = validUrl.href;
    const db = getDatabase();

    // 1. Проверяем локальный кэш в SQLite
    try {
      const cached = db.prepare(`
        SELECT url, title, description, image_url as imageUrl, fetched_at 
        FROM link_preview_cache 
        WHERE url = ?
      `).get(cleanUrl) as LinkPreviewData & { fetched_at: string } | undefined;

      if (cached) {
        return {
          url: cleanUrl,
          title: cached.title,
          description: cached.description,
          imageUrl: cached.imageUrl,
        };
      }
    } catch (e) {
      // Игнорируем ошибки чтения кэша
    }

    // 2. Запрашиваем метаданные Open Graph с сайта через безопасный fetch
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(cleanUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      // Извлекаем OpenGraph теги и базовые HTML теги
      const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                         html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i) ||
                         html.match(/<title[^>]*>(.*?)<\/title>/i);
      
      const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+name=["']twitter:description["']\s+content=["'](.*?)["']/i);

      const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                       html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);

      const cleanText = (str: string | undefined): string | null => {
        if (!str) return null;
        return str
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim()
          .slice(0, 300); // Ограничиваем длину
      };

      const title = cleanText(titleMatch?.[1]) || validUrl.hostname;
      const description = cleanText(descMatch?.[1]);
      let imageUrl = imgMatch?.[1]?.trim() || null;

      // Нормализуем относительные ссылки на картинку
      if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        try {
          imageUrl = new URL(imageUrl, cleanUrl).href;
        } catch {
          imageUrl = null;
        }
      }

      // 3. Сохраняем в кэш
      try {
        db.prepare(`
          INSERT OR REPLACE INTO link_preview_cache (url, title, description, image_url, fetched_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(cleanUrl, title, description, imageUrl, new Date().toISOString());
      } catch (err) {
        console.warn('Failed to save link preview cache:', err);
      }

      return {
        url: cleanUrl,
        title,
        description,
        imageUrl,
      };
    } catch (err) {
      // При ошибке возвращаем упрощённую карточку с доменом
      const fallbackTitle = validUrl.hostname;
      return {
        url: cleanUrl,
        title: fallbackTitle,
        description: null,
        imageUrl: null,
      };
    }
  });
}
