import React, { useState, useRef, useEffect } from 'react';
import { Eye, Code2, Copy, Check, Save } from 'lucide-react';
import { VisualEditor, VisualEditorRef } from './VisualEditor';
import { SourceEditor, SourceEditorRef } from './SourceEditor';

interface MarkdownNoteEditorProps {
  value: string;
  onChange: (val: string) => void;
  onSave?: () => void;
  placeholder?: string;
}

export const MarkdownNoteEditor: React.FC<MarkdownNoteEditorProps> = ({
  value,
  onChange,
  onSave,
  placeholder,
}) => {
  // Always start in visual mode when opening a note
  const [mode, setMode] = useState<'visual' | 'source'>('visual');
  const [content, setContent] = useState(value);

  const visualEditorRef = useRef<VisualEditorRef>(null);
  const sourceEditorRef = useRef<SourceEditorRef>(null);

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
    <div className="space-y-3">
      {/* Mode Switcher & Stats Header */}
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
            title="Обычный визуальный режим (WYSIWYG)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Визуальный</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('source')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'source'
                ? 'bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
            title="Markdown режим (исходный код)"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>
        </div>

        <div className="text-[11px] text-zinc-400">
          <span>{content.length} симв. • {content.split('\n').filter(Boolean).length} строк</span>
        </div>
      </div>

      {/* Editor Body */}
      {mode === 'visual' ? (
        <VisualEditor
          ref={visualEditorRef}
          initialMarkdown={content}
          onChange={handleContentChange}
          placeholder={placeholder}
        />
      ) : (
        <SourceEditor
          ref={sourceEditorRef}
          value={content}
          onChange={handleContentChange}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};
