import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { NoteContextMenu } from './NoteContextMenu';
import { LinkModal } from './LinkModal';

export interface SourceEditorRef {
  getValue: () => string;
  setValue: (val: string) => void;
  focus: () => void;
  getSelection: () => { start: number; end: number };
}

interface SourceEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const SourceEditor = forwardRef<SourceEditorRef, SourceEditorProps>(({
  value,
  onChange,
  placeholder = 'Введите текст в формате Markdown...',
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({
    x: 0,
    y: 0,
    isOpen: false,
  });
  const [linkModal, setLinkModal] = useState<{ isOpen: boolean; initialUrl: string; initialText: string }>({
    isOpen: false,
    initialUrl: '',
    initialText: '',
  });

  useImperativeHandle(ref, () => ({
    getValue: () => textareaRef.current?.value || '',
    setValue: (val: string) => {
      if (textareaRef.current) {
        textareaRef.current.value = val;
      }
    },
    focus: () => textareaRef.current?.focus(),
    getSelection: () => ({
      start: textareaRef.current?.selectionStart || 0,
      end: textareaRef.current?.selectionEnd || 0,
    }),
  }));

  // Context Menu opener
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isOpen: true,
    });
  };

  // Helper to wrap selected text or insert prefix/suffix
  const wrapSelection = (before: string, after: string = before, defaultText: string = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = el.value;
    const selectedText = currentVal.substring(start, end) || defaultText;

    const nextVal = currentVal.substring(0, start) + before + selectedText + after + currentVal.substring(end);
    onChange(nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  // Helper to prefix each selected line (for lists, blockquotes, headings)
  const prefixLines = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = el.value;

    const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = currentVal.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = currentVal.length;

    const targetChunk = currentVal.substring(lineStart, lineEnd);
    const lines = targetChunk.split('\n');
    const modified = lines.map((line) => `${prefix} ${line.replace(/^(\s*([-*+]|\d+\.|#+|>)\s*)/, '')}`).join('\n');

    const nextVal = currentVal.substring(0, lineStart) + modified + currentVal.substring(lineEnd);
    onChange(nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(lineStart, lineStart + modified.length);
    }, 0);
  };

  // Key handlers (smart Enter continuation and Tab indentation)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el) return;

    // Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      const nextVal = val.substring(0, start) + '  ' + val.substring(end);
      onChange(nextVal);
      setTimeout(() => {
        el.setSelectionRange(start + 2, start + 2);
      }, 0);
      return;
    }

    // Smart Enter continuation for lists
    if (e.key === 'Enter') {
      const start = el.selectionStart;
      const val = el.value;
      const currentLineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(currentLineStart, start);

      const bulletMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
      const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);

      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const bullet = bulletMatch[2];
        const content = bulletMatch[3];

        if (content.trim() === '') {
          // Empty bullet item -> exit list
          const nextVal = val.substring(0, currentLineStart) + val.substring(start);
          onChange(nextVal);
          setTimeout(() => el.setSelectionRange(currentLineStart, currentLineStart), 0);
        } else {
          const insertText = `\n${indent}${bullet} `;
          const nextVal = val.substring(0, start) + insertText + val.substring(start);
          onChange(nextVal);
          setTimeout(() => el.setSelectionRange(start + insertText.length, start + insertText.length), 0);
        }
        return;
      }

      if (orderedMatch) {
        e.preventDefault();
        const indent = orderedMatch[1];
        const num = parseInt(orderedMatch[2], 10);
        const content = orderedMatch[3];

        if (content.trim() === '') {
          // Empty ordered item -> exit list
          const nextVal = val.substring(0, currentLineStart) + val.substring(start);
          onChange(nextVal);
          setTimeout(() => el.setSelectionRange(currentLineStart, currentLineStart), 0);
        } else {
          const insertText = `\n${indent}${num + 1}. `;
          const nextVal = val.substring(0, start) + insertText + val.substring(start);
          onChange(nextVal);
          setTimeout(() => el.setSelectionRange(start + insertText.length, start + insertText.length), 0);
        }
        return;
      }
    }

    // Ctrl+B / Ctrl+I / Ctrl+U shortcuts in Source mode
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        wrapSelection('**', '**', 'жирный текст');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        wrapSelection('*', '*', 'курсив');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        wrapSelection('<u>', '</u>', 'подчёркнутый текст');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleOpenLinkModal();
      }
    }
  };

  const handleOpenLinkModal = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end).trim();

    const isUrl = /^https?:\/\//i.test(selected);
    setLinkModal({
      isOpen: true,
      initialUrl: isUrl ? selected : '',
      initialText: isUrl ? '' : selected,
    });
  };

  const handleSaveLink = (url: string, text: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const linkMd = `[${text || url}](${url})`;
    const nextVal = val.substring(0, start) + linkMd + val.substring(end);
    onChange(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + linkMd.length, start + linkMd.length);
    }, 0);
  };

  const handleInsertFootnote = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const val = el.value;
    
    // Find highest footnote index
    const matches = Array.from(val.matchAll(/\[\^(\d+)\]/g));
    const nextNum = matches.length > 0 
      ? Math.max(...matches.map(m => parseInt(m[1], 10))) + 1 
      : 1;

    const refTag = `[^${nextNum}]`;
    const noteDefinition = `\n\n[^${nextNum}]: Описание сноски`;
    const nextVal = val.substring(0, start) + refTag + val.substring(start) + noteDefinition;
    onChange(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + refTag.length, start + refTag.length);
    }, 0);
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        placeholder={placeholder}
        className="w-full flex-1 p-5 rounded-2xl bg-zinc-50 dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 text-sm font-mono leading-relaxed text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors resize-y min-h-[460px] whitespace-pre-wrap selection:bg-emerald-500/20"
        spellCheck={false}
      />

      <NoteContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        isVisualMode={false}
        hasSelection={Boolean(textareaRef.current && textareaRef.current.selectionStart !== textareaRef.current.selectionEnd)}
        onToggleBold={() => wrapSelection('**', '**', 'жирный текст')}
        onToggleItalic={() => wrapSelection('*', '*', 'курсив')}
        onToggleStrike={() => wrapSelection('~~', '~~', 'зачёркнутый текст')}
        onToggleUnderline={() => wrapSelection('<u>', '</u>', 'подчёркнутый текст')}
        onToggleCode={() => wrapSelection('`', '`', 'код')}
        onSetHeading={(lvl) => prefixLines('#'.repeat(lvl))}
        onSetParagraph={() => prefixLines('')}
        onToggleBlockquote={() => prefixLines('>')}
        onToggleCodeBlock={() => wrapSelection('```\n', '\n```', 'код')}
        onToggleBulletList={() => prefixLines('-')}
        onToggleOrderedList={() => prefixLines('1.')}
        onInsertHorizontalRule={() => wrapSelection('\n---\n', '')}
        onInsertOrEditLink={handleOpenLinkModal}
        onInsertFootnote={handleInsertFootnote}
        onUndo={() => document.execCommand('undo')}
        onRedo={() => document.execCommand('redo')}
      />

      <LinkModal
        isOpen={linkModal.isOpen}
        initialUrl={linkModal.initialUrl}
        initialText={linkModal.initialText}
        onClose={() => setLinkModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveLink}
      />
    </div>
  );
});

SourceEditor.displayName = 'SourceEditor';
