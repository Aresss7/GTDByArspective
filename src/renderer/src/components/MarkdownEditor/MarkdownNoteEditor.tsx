import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Eye, Code2, Copy, Check, Save, Maximize2, Minimize2 } from 'lucide-react';
import { VisualEditor, VisualEditorRef } from './VisualEditor';
import { SourceEditor, SourceEditorRef } from './SourceEditor';
import { Language } from '../../i18n/translations';

export interface MarkdownNoteEditorRef {
  undo: () => void;
  redo: () => void;
  getMarkdown: () => string;
  focus: () => void;
}

interface MarkdownNoteEditorProps {
  value: string;
  onChange: (val: string) => void;
  onSave?: () => void;
  placeholder?: string;
  searchTerm?: string;
  activeMatchIndex?: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  language?: Language;
}

export const MarkdownNoteEditor = forwardRef<MarkdownNoteEditorRef, MarkdownNoteEditorProps>(({
  value,
  onChange,
  onSave,
  placeholder,
  searchTerm,
  activeMatchIndex,
  isFullscreen = false,
  onToggleFullscreen,
  language = 'ru',
}, ref) => {
  const isEn = language === 'en';
  // Always start in visual mode when opening a note
  const [mode, setMode] = useState<'visual' | 'source'>('visual');
  const [content, setContent] = useState(value);

  const visualEditorRef = useRef<VisualEditorRef>(null);
  const sourceEditorRef = useRef<SourceEditorRef>(null);

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (mode === 'visual') {
        visualEditorRef.current?.undo();
      } else {
        sourceEditorRef.current?.undo();
      }
    },
    redo: () => {
      if (mode === 'visual') {
        visualEditorRef.current?.redo();
      } else {
        sourceEditorRef.current?.redo();
      }
    },
    getMarkdown: () => {
      if (mode === 'visual') {
        return visualEditorRef.current?.getMarkdown() ?? content;
      }
      return sourceEditorRef.current?.getValue() ?? content;
    },
    focus: () => {
      if (mode === 'visual') {
        visualEditorRef.current?.focus();
      } else {
        sourceEditorRef.current?.focus();
      }
    },
  }));

  // Sync external value when opened
  useEffect(() => {
    setContent(value);
  }, [value]);

  const handleSwitchMode = (targetMode: 'visual' | 'source') => {
    if (targetMode === mode) return;

    if (mode === 'visual' && targetMode === 'source') {
      // Pull latest markdown from TipTap visual editor
      const currentMd = visualEditorRef.current?.getMarkdown() ?? content;
      setContent(currentMd);
      onChange(currentMd);
      setMode('source');
      setTimeout(() => sourceEditorRef.current?.focus(), 50);
    } else if (mode === 'source' && targetMode === 'visual') {
      // Pull latest text from source editor
      const currentText = sourceEditorRef.current?.getValue() ?? content;
      setContent(currentText);
      onChange(currentText);
      setMode('visual');
      setTimeout(() => visualEditorRef.current?.focus(), 50);
    }
  };

  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    onChange(newVal);
  };

  return (
    <div className={`space-y-3 ${isFullscreen ? 'h-full flex-1 flex flex-col min-h-0' : ''}`}>
      {/* Mode Switcher & Stats Header (скрывается в полноэкранном режиме) */}
      {!isFullscreen && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 p-1 bg-zinc-100 dark:bg-[#222222] rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => handleSwitchMode('visual')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'visual'
                  ? 'bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
              title={isEn ? 'Visual mode (WYSIWYG)' : 'Обычный визуальный режим (WYSIWYG)'}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isEn ? 'Visual' : 'Визуальный'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('source')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'source'
                  ? 'bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
              title={isEn ? 'Markdown mode (source code)' : 'Markdown режим (исходный код)'}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-zinc-400">
              {isEn 
                ? `${content.length} chars • ${content.split('\n').filter(Boolean).length} lines`
                : `${content.length} симв. • ${content.split('\n').filter(Boolean).length} строк`}
            </span>
          </div>
        </div>
      )}

      {/* Editor Body */}
      <div className={`relative ${isFullscreen ? 'flex-1 flex flex-col h-full min-h-0 overflow-hidden' : ''}`}>
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="absolute top-3 right-3 z-30 w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100/90 dark:bg-[#282828]/90 hover:bg-zinc-200 dark:hover:bg-[#333333] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 backdrop-blur-xs"
            title={isFullscreen 
              ? (isEn ? 'Exit fullscreen (Esc)' : 'Свернуть полноэкранный режим (Esc)') 
              : (isEn ? 'Enter fullscreen (Esc)' : 'Развернуть область содержимого (Esc)')}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
        {mode === 'visual' ? (
          <VisualEditor
            ref={visualEditorRef}
            initialMarkdown={content}
            onChange={handleContentChange}
            onSave={onSave}
            placeholder={placeholder}
            searchTerm={searchTerm}
            activeMatchIndex={activeMatchIndex}
            isFullscreen={isFullscreen}
            language={language}
          />
        ) : (
          <SourceEditor
            ref={sourceEditorRef}
            value={content}
            onChange={handleContentChange}
            onSave={onSave}
            placeholder={placeholder}
            searchTerm={searchTerm}
            activeMatchIndex={activeMatchIndex}
            isFullscreen={isFullscreen}
            language={language}
          />
        )}
      </div>
    </div>
  );
});

MarkdownNoteEditor.displayName = 'MarkdownNoteEditor';
