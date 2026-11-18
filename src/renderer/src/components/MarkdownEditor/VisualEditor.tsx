import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import HardBreak from '@tiptap/extension-hard-break';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { NoteContextMenu } from './NoteContextMenu';
import { LinkModal } from './LinkModal';
import { LinkPreviewCard } from './LinkPreviewCard';
import { extractLinkUrls } from './urlExtractor';

export const SearchHighlightKey = new PluginKey('searchHighlight');

export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addOptions() {
    return {
      searchTerm: '',
      activeIndex: 0,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: SearchHighlightKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet, oldState, newState) {
            const meta = tr.getMeta(SearchHighlightKey);
            const rawTerm = meta?.searchTerm !== undefined ? meta.searchTerm : extension.options.searchTerm;
            const term = rawTerm ? rawTerm.trim().toLowerCase() : '';
            const targetActive = meta?.activeIndex !== undefined ? meta.activeIndex : extension.options.activeIndex;

            if (!term) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];
            let matchIdx = 0;

            newState.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const text = node.text.toLowerCase();
                let index = text.indexOf(term);

                while (index !== -1) {
                  const from = pos + index;
                  const to = from + term.length;
                  const isActive = matchIdx === targetActive;

                  decorations.push(
                    Decoration.inline(from, to, {
                      class: isActive ? 'search-match search-match-active' : 'search-match',
                    })
                  );

                  matchIdx++;
                  index = text.indexOf(term, index + term.length);
                }
              }
            });

            return DecorationSet.create(newState.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

// Кастомный перенос строки без обратного слэша "\" при сохранении в Markdown
export const CustomHardBreak = HardBreak.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any, parent: any, index: number) {
          for (let i = index + 1; i < parent.childCount; i++) {
            if (parent.child(i).type !== node.type) {
              state.write(state.inTable ? '<br>' : '\n');
              return;
            }
          }
        },
        parse: {
          // Обрабатывается markdown-it с опцией breaks: true
        },
      },
    };
  },
});

export const TextColor = Mark.create({
  name: 'textColor',
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color || element.getAttribute('data-color'),
        renderHTML: (attributes) => {
          if (!attributes.color || attributes.color === 'inherit') {
            return {};
          }
          return {
            style: `color: ${attributes.color} !important;`,
            'data-color': attributes.color,
          };
        },
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'span[style*=color]' },
      { tag: 'span[data-color]' },
      { tag: 'font[color]', getAttrs: (value) => ({ color: value }) },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addStorage() {
    return {
      markdown: {
        serialize: {
          open(_state: any, mark: any) {
            return `<span style="color: ${mark.attrs.color}">`;
          },
          close: '</span>',
        },
        parse: {},
      },
    };
  },
});

export const TextHighlight = Mark.create({
  name: 'textHighlight',
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || element.getAttribute('data-bg-color'),
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor || attributes.backgroundColor === 'transparent') {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}; border-radius: 4px; padding: 1px 4px;`,
            'data-bg-color': attributes.backgroundColor,
          };
        },
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'mark' },
      { tag: 'span[style*=background-color]' },
      { tag: 'span[data-bg-color]' },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addStorage() {
    return {
      markdown: {
        serialize: {
          open(_state: any, mark: any) {
            return `<mark style="background-color: ${mark.attrs.backgroundColor}">`;
          },
          close: '</mark>',
        },
        parse: {},
      },
    };
  },
});

export interface VisualEditorRef {
  getMarkdown: () => string;
  setMarkdown: (md: string) => void;
  focus: () => void;
  undo: () => void;
  redo: () => void;
}

interface VisualEditorProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  onSave?: () => void;
  placeholder?: string;
  searchTerm?: string;
  activeMatchIndex?: number;
  isFullscreen?: boolean;
}

export const VisualEditor = forwardRef<VisualEditorRef, VisualEditorProps>(({
  initialMarkdown,
  onChange,
  onSave,
  placeholder = 'Начните вводить текст заметки... Для форматирования нажмите правую кнопку мыши.',
  searchTerm,
  activeMatchIndex,
  isFullscreen = false,
}, ref) => {
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

  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>(() => {
    return extractLinkUrls(initialMarkdown);
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: false,
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'rounded-xl bg-zinc-900 text-zinc-100 p-4 font-mono text-xs my-3 overflow-x-auto border border-zinc-800',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-emerald-500 pl-4 py-1 italic text-zinc-600 dark:text-zinc-300 my-2',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-5 my-2 space-y-1',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-5 my-2 space-y-1',
          },
        },
        horizontalRule: {
          HTMLAttributes: {
            class: 'my-4 border-t border-zinc-200 dark:border-zinc-800',
          },
        },
      }),
      CustomHardBreak,
      Underline,
      TextColor,
      TextHighlight,
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-500 cursor-pointer font-medium transition-colors',
        },
      }),
      Markdown.configure({
        html: true,
        breaks: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      SearchHighlight,
    ],
    content: initialMarkdown,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[460px] p-5 pr-14 text-sm md:text-base leading-relaxed text-zinc-900 dark:text-zinc-100',
      },
      handleKeyDown: (view, event) => {
        // Ctrl+S / Cmd+S or Ctrl+Enter / Cmd+Enter: сохранение заметки
        if ((event.ctrlKey || event.metaKey) && (
          event.key === 's' || event.key === 'S' || event.key === 'ы' || event.key === 'Ы' ||
          event.key === 'Enter' || event.code === 'Enter' || event.code === 'NumpadEnter'
        )) {
          event.preventDefault();
          event.stopPropagation();
          onSave?.();
          return true;
        }

        // Ctrl+Shift+H: применить последний использованный цвет
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'h' || event.key === 'H' || event.key === 'р' || event.key === 'Р')) {
          event.preventDefault();
          try {
            const raw = localStorage.getItem('gtd-note-last-color');
            if (raw) {
              const lastUsed = JSON.parse(raw);
              if (lastUsed.type === 'text') {
                if (lastUsed.option.color === 'inherit') {
                  editor?.chain().focus().unsetMark('textColor').run();
                } else {
                  editor?.chain().focus().setMark('textColor', { color: lastUsed.option.color }).run();
                }
              } else {
                if (lastUsed.option.bgColor === 'transparent') {
                  editor?.chain().focus().unsetMark('textHighlight').run();
                } else {
                  editor?.chain().focus().setMark('textHighlight', { backgroundColor: lastUsed.option.bgColor }).run();
                }
              }
            }
          } catch {}
          return true;
        }

        return false;
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
          event.preventDefault();
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            isOpen: true,
          });
          return true;
        },
      },
      handleClick: (view, pos, event) => {
        // Ctrl+Click opens link in default external browser
        // Normal click can also open external link safely
        const target = event.target as HTMLElement;
        const link = target.closest('a');
        if (link) {
          event.preventDefault();
          const href = link.getAttribute('href');
          if (href) {
            if (event.ctrlKey || event.metaKey) {
              // Edit link on Ctrl+Click
              setLinkModal({
                isOpen: true,
                initialUrl: href,
                initialText: link.textContent || '',
              });
            } else {
              // Open in default browser
              if (window.gtdApi?.openExternalUrl) {
                window.gtdApi.openExternalUrl(href);
              } else {
                window.open(href, '_blank');
              }
            }
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // @ts-ignore
      const md = editor.storage.markdown?.getMarkdown() ?? '';
      onChange(md);
      const fresh = extractLinkUrls(md, editor);
      setDiscoveredUrls((prev) => (prev.length === fresh.length && prev.every((u, i) => u === fresh[i]) ? prev : fresh));
    },
  });

  // Синхронизация списка ссылок при изменении входного markdown или загрузке редактора
  useEffect(() => {
    setDiscoveredUrls((prev) => {
      const fresh = extractLinkUrls(initialMarkdown, editor);
      return prev.length === fresh.length && prev.every((u, i) => u === fresh[i]) ? prev : fresh;
    });
  }, [initialMarkdown, editor]);

  // Обновление подсветки поиска и скролл к активному совпадению
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    editor.extensionManager.extensions.forEach((ext) => {
      if (ext.name === 'searchHighlight') {
        ext.options.searchTerm = searchTerm || '';
        ext.options.activeIndex = activeMatchIndex || 0;
      }
    });

    const { tr } = editor.state;
    editor.view.dispatch(tr.setMeta(SearchHighlightKey, {
      searchTerm: searchTerm || '',
      activeIndex: activeMatchIndex || 0,
    }));

    if (searchTerm?.trim()) {
      setTimeout(() => {
        const activeEl = editor.view.dom.querySelector('.search-match-active');
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 40);
    }
  }, [searchTerm, activeMatchIndex, editor]);

  useImperativeHandle(ref, () => ({
    getMarkdown: () => {
      // @ts-ignore
      return editor?.storage.markdown?.getMarkdown() ?? '';
    },
    setMarkdown: (md: string) => {
      editor?.commands.setContent(md);
      setDiscoveredUrls(extractLinkUrls(md, editor));
    },
    focus: () => {
      editor?.commands.focus();
    },
    undo: () => {
      editor?.chain().focus().undo().run();
    },
    redo: () => {
      editor?.chain().focus().redo().run();
    },
  }));

  if (!editor) {
    return null;
  }

  // Right-click context menu handler
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isOpen: true,
    });
  };

  const handleOpenLinkModal = () => {
    const isLink = editor.isActive('link');
    const previousUrl = editor.getAttributes('link').href || '';
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    setLinkModal({
      isOpen: true,
      initialUrl: previousUrl,
      initialText: selectedText || '',
    });
  };

  const handleSaveLink = (url: string, text: string) => {
    if (editor.state.selection.empty && text) {
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const handleRemoveLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  return (
    <div className={`relative w-full ${isFullscreen ? 'h-full flex-1 flex flex-col min-h-0' : ''}`}>
      <div 
        onContextMenu={handleContextMenu}
        className={`w-full rounded-2xl bg-zinc-50 dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 transition-colors focus-within:border-zinc-400 dark:focus-within:border-zinc-600 ${
          isFullscreen ? 'flex-1 h-full min-h-0 overflow-y-auto' : ''
        }`}
      >
        <EditorContent editor={editor} className={isFullscreen ? 'min-h-full' : ''} />
      </div>

      {/* Embedded Link Previews for discovered links */}
      {discoveredUrls.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Предпросмотр ссылок ({discoveredUrls.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {discoveredUrls.map((url) => (
              <LinkPreviewCard
                key={url}
                url={url}
              />
            ))}
          </div>
        </div>
      )}

      {/* Right-click Context Menu */}
      <NoteContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        isVisualMode={true}
        hasSelection={!editor.state.selection.empty}
        isLinkSelected={editor.isActive('link')}
        activeFormats={{
          bold: editor.isActive('bold'),
          italic: editor.isActive('italic'),
          strike: editor.isActive('strike'),
          underline: editor.isActive('underline'),
          code: editor.isActive('code'),
          h1: editor.isActive('heading', { level: 1 }),
          h2: editor.isActive('heading', { level: 2 }),
          h3: editor.isActive('heading', { level: 3 }),
          paragraph: editor.isActive('paragraph'),
          blockquote: editor.isActive('blockquote'),
          codeBlock: editor.isActive('codeBlock'),
          bulletList: editor.isActive('bulletList'),
          orderedList: editor.isActive('orderedList'),
          taskList: editor.isActive('taskList'),
        }}
        onToggleBold={() => editor.chain().focus().toggleBold().run()}
        onToggleItalic={() => editor.chain().focus().toggleItalic().run()}
        onToggleStrike={() => editor.chain().focus().toggleStrike().run()}
        onToggleUnderline={() => editor.chain().focus().toggleUnderline().run()}
        onToggleCode={() => editor.chain().focus().toggleCode().run()}
        onSetHeading={(level) => editor.chain().focus().toggleHeading({ level }).run()}
        onSetParagraph={() => editor.chain().focus().setParagraph().run()}
        onToggleBlockquote={() => editor.chain().focus().toggleBlockquote().run()}
        onToggleCodeBlock={() => editor.chain().focus().toggleCodeBlock().run()}
        onToggleBulletList={() => editor.chain().focus().toggleBulletList().run()}
        onToggleOrderedList={() => editor.chain().focus().toggleOrderedList().run()}
        onToggleTaskList={() => editor.chain().focus().toggleTaskList().run()}
        onInsertHorizontalRule={() => editor.chain().focus().setHorizontalRule().run()}
        onInsertOrEditLink={handleOpenLinkModal}
        onRemoveLink={handleRemoveLink}
        onInsertFootnote={() => {
          // Footnote reference insertion
          editor.chain().focus().insertContent('[^1]').run();
        }}
        onUndo={() => editor.chain().focus().undo().run()}
        onRedo={() => editor.chain().focus().redo().run()}
        onSelectTextColor={(color) => {
          if (!editor) return;
          if (!color || color === 'inherit') {
            editor.chain().focus().unsetMark('textColor').run();
          } else {
            editor.chain().focus().setMark('textColor', { color }).run();
          }
        }}
        onSelectBgColor={(bgColor) => {
          if (!editor) return;
          if (!bgColor || bgColor === 'transparent') {
            editor.chain().focus().unsetMark('textHighlight').run();
          } else {
            editor.chain().focus().setMark('textHighlight', { backgroundColor: bgColor }).run();
          }
        }}
        activeTextColor={editor ? (editor.getAttributes('textColor')?.color || null) : null}
        activeBgColor={editor ? (editor.getAttributes('textHighlight')?.backgroundColor || null) : null}
      />

      {/* Link Modal */}
      <LinkModal
        isOpen={linkModal.isOpen}
        initialUrl={linkModal.initialUrl}
        initialText={linkModal.initialText}
        onClose={() => setLinkModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveLink}
        onRemove={editor.isActive('link') ? handleRemoveLink : undefined}
      />
    </div>
  );
});

VisualEditor.displayName = 'VisualEditor';
