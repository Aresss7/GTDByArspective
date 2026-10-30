import React, { useState, useEffect } from 'react';
import { ExternalLink, Globe, Trash2, Edit3, Loader2 } from 'lucide-react';
import { LinkPreviewData } from '@shared/types';

interface LinkPreviewCardProps {
  url: string;
  onRemoveCard?: () => void;
  onOpenEdit?: () => void;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({
  url,
  onRemoveCard,
  onOpenEdit,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LinkPreviewData | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!window.gtdApi?.fetchLinkPreview) {
      setLoading(false);
      return;
    }

    setLoading(true);
    window.gtdApi.fetchLinkPreview(url)
      .then((preview) => {
        if (isMounted) {
          setData(preview);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.gtdApi?.openExternalUrl) {
      window.gtdApi.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  if (loading) {
    return (
      <div className="my-3 p-3.5 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-[#1a1a1a] flex items-center space-x-3 text-xs text-zinc-400">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
        <span>Загрузка предпросмотра ссылки {domain}...</span>
      </div>
    );
  }

  const title = data?.title || domain;
  const description = data?.description;
  const image = data?.imageUrl;

  return (
    <div 
      contentEditable={false}
      onClick={handleOpen}
      className="group relative my-3 flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer select-none text-left"
    >
      {image && (
        <div className="sm:w-44 h-32 sm:h-auto shrink-0 bg-zinc-100 dark:bg-[#222222] overflow-hidden">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="flex-1 p-3.5 flex flex-col justify-between space-y-1.5 min-w-0">
        <div>
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5 truncate">
            <Globe className="w-3 h-3 shrink-0" />
            <span className="truncate">{domain}</span>
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {title}
          </h4>
          {description && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-zinc-400 group-hover:text-emerald-500 flex items-center space-x-1 transition-colors">
            <span>Открыть в браузере</span>
            <ExternalLink className="w-3 h-3" />
          </span>

          <div 
            className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {onOpenEdit && (
              <button
                type="button"
                onClick={onOpenEdit}
                title="Редактировать ссылку"
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onRemoveCard && (
              <button
                type="button"
                onClick={onRemoveCard}
                title="Удалить карточку предпросмотра"
                className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
