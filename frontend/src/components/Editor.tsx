import React, { useEffect, useRef } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { EditorState, Compartment, StateField, StateEffect } from '@codemirror/state';
import { keymap, Decoration, DecorationSet } from '@codemirror/view';
import { sql } from '@codemirror/lang-sql';
import { getStatementAtCursor } from '../lib/sql';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  onRun: (sqlToRun: string) => void;
  onRunAll: () => void;
  onCancel: () => void;
  onSaveFile?: () => void;
  onOpenFile?: () => void;
  isRunning: boolean;
  isConnected: boolean;
  elapsedSeconds?: number;
  errorPosition?: number | null;
}

const setErrorPosEffect = StateEffect.define<{ from: number; to: number } | null>();

const errorMark = Decoration.mark({
  class: 'cm-error-underline',
});

const errorField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const e of tr.effects) {
      if (e.is(setErrorPosEffect)) {
        if (!e.value || e.value.from >= e.value.to) {
          return Decoration.none;
        }
        try {
          return Decoration.set([errorMark.range(e.value.from, e.value.to)]);
        } catch {
          return Decoration.none;
        }
      }
    }
    try {
      return decorations.map(tr.changes);
    } catch {
      return Decoration.none;
    }
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  onRun,
  onRunAll,
  onCancel,
  onSaveFile,
  onOpenFile,
  isRunning,
  isConnected,
  elapsedSeconds = 0,
  errorPosition,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const onRunAllRef = useRef(onRunAll);
  onRunAllRef.current = onRunAll;

  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;

  const onSaveFileRef = useRef(onSaveFile);
  onSaveFileRef.current = onSaveFile;

  const onOpenFileRef = useRef(onOpenFile);
  onOpenFileRef.current = onOpenFile;

  const readOnlyCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!containerRef.current) return;

    // Neutral monochrome Editor Theme using CSS variables
    const editorTheme = EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '13px',
        backgroundColor: 'var(--editor-bg)',
        color: 'var(--editor-text)',
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'var(--font-mono)',
        lineHeight: '1.5',
      },
      '.cm-content': {
        padding: '8px 0',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--editor-gutter-bg)',
        color: 'var(--editor-gutter-text)',
        borderRight: '1px solid var(--border)',
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--editor-active-line)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--border-subtle)',
        color: 'var(--text)',
      },
      '.cm-cursor': {
        borderLeftColor: 'var(--editor-cursor)',
        borderLeftWidth: '1.5px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--editor-selection) !important',
      },
      '.cm-error-underline': {
        textDecoration: 'underline wavy var(--status-error)',
        backgroundColor: 'var(--status-error-bg)',
      },
      '.cm-matchingBracket': {
        backgroundColor: 'var(--border-strong)',
        color: 'var(--text) !important',
        outline: '1px solid var(--border)',
      },
    });

    const runKeymap = keymap.of([
      {
        key: 'Mod-Shift-Enter',
        run: () => {
          onRunAllRef.current();
          return true;
        },
      },
      {
        key: 'Mod-Enter',
        run: (view) => {
          const sel = view.state.selection.main;
          let textToRun = '';
          if (!sel.empty) {
            textToRun = view.state.sliceDoc(sel.from, sel.to).trim();
          } else {
            const fullDoc = view.state.doc.toString();
            textToRun = getStatementAtCursor(fullDoc, sel.from);
          }

          if (textToRun) {
            onRunRef.current(textToRun);
          } else {
            onRunAllRef.current();
          }
          return true;
        },
      },
      {
        key: 'Escape',
        run: () => {
          if (isRunningRef.current) {
            onCancelRef.current();
            return true;
          }
          return false;
        },
      },
      {
        key: 'Mod-s',
        run: () => {
          if (onSaveFileRef.current) {
            onSaveFileRef.current();
            return true;
          }
          return false;
        },
      },
      {
        key: 'Mod-o',
        run: () => {
          if (onOpenFileRef.current) {
            onOpenFileRef.current();
            return true;
          }
          return false;
        },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        sql(),
        editorTheme,
        errorField,
        EditorView.lineWrapping,
        runKeymap,
        readOnlyCompartment.current.of(EditorState.readOnly.of(false)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newDoc = update.state.doc.toString();
            onChange(newDoc);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update read-only state based on isRunning
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        effects: readOnlyCompartment.current.reconfigure(
          EditorState.readOnly.of(isRunning)
        ),
      });
    }
  }, [isRunning]);

  // Handle external text change
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== value) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value },
        });
      }
    }
  }, [value]);

  // Highlight and jump to error position if provided (PostgreSQL error position is 1-based character index)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    try {
      if (errorPosition && errorPosition > 0) {
        const docLength = view.state.doc.length;
        if (docLength === 0) {
          view.dispatch({
            effects: setErrorPosEffect.of(null),
          });
          return;
        }

        const rawPos = errorPosition - 1;
        let from = Math.min(Math.max(rawPos, 0), docLength);
        let to = from + 1;

        if (from >= docLength) {
          from = Math.max(0, docLength - 1);
          to = docLength;
        } else {
          const line = view.state.doc.lineAt(from);
          while (to < line.to && /\S/.test(view.state.doc.sliceString(to, to + 1))) {
            to++;
          }
          to = Math.min(to, docLength);
        }

        if (to <= from) {
          to = Math.min(from + 1, docLength);
          if (to <= from && from > 0) {
            from = to - 1;
          }
        }

        if (from < to && to <= docLength) {
          view.dispatch({
            effects: setErrorPosEffect.of({ from, to }),
            selection: { anchor: from, head: to },
            scrollIntoView: true,
          });
          view.focus();
        } else {
          const safePos = Math.min(from, docLength);
          view.dispatch({
            effects: setErrorPosEffect.of(null),
            selection: { anchor: safePos, head: safePos },
            scrollIntoView: true,
          });
          view.focus();
        }
      } else {
        view.dispatch({
          effects: setErrorPosEffect.of(null),
        });
      }
    } catch (err) {
      console.error('Failed to handle error position highlight:', err);
    }
  }, [errorPosition]);

  const handleRunCurrent = () => {
    const view = viewRef.current;
    if (!view) {
      onRun(value);
      return;
    }
    const sel = view.state.selection.main;
    let textToRun = '';
    if (!sel.empty) {
      textToRun = view.state.sliceDoc(sel.from, sel.to).trim();
    } else {
      const fullDoc = view.state.doc.toString();
      textToRun = getStatementAtCursor(fullDoc, sel.from);
    }
    if (textToRun) {
      onRun(textToRun);
    } else {
      onRunAll();
    }
  };

  return (
    <div
      className="flex-1 flex flex-col min-h-0 h-full select-none"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text)',
      }}
    >
      {/* Editor toolbar */}
      <div
        className="h-9 px-3 flex items-center justify-between text-xs border-b shrink-0"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium" style={{ color: 'var(--text)' }}>
            SQL Editor
          </span>
          {!isConnected && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-[3px] font-mono border"
              style={{
                backgroundColor: 'var(--status-warning-bg)',
                borderColor: 'var(--status-warning-border)',
                color: 'var(--status-warning)',
              }}
            >
              Not connected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isRunning ? (
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--text)' }}>
                <span
                  className="w-2.5 h-2.5 rounded-full border border-t-transparent animate-spin shrink-0"
                  style={{
                    borderColor: 'var(--text)',
                    borderTopColor: 'transparent',
                  }}
                />
                <span>Running ({elapsedSeconds.toFixed(1)}s)</span>
              </span>
              <button
                type="button"
                onClick={onCancel}
                className="px-2.5 py-1 rounded-[4px] border text-xs font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--btn-secondary-bg)',
                  borderColor: 'var(--status-error-border)',
                  color: 'var(--status-error)',
                }}
                title="Cancel running query (Esc)"
              >
                Cancel (Esc)
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono mr-1" style={{ color: 'var(--text-muted)' }}>
                Ctrl+Enter: statement · Ctrl+Shift+Enter: all
              </span>
              <button
                type="button"
                onClick={handleRunCurrent}
                disabled={!isConnected || !value.trim()}
                className="px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                }}
                title="Run selected or current statement (Ctrl+Enter)"
              >
                Run
              </button>
              <button
                type="button"
                onClick={onRunAll}
                disabled={!isConnected || !value.trim()}
                className="px-2.5 py-1 rounded-[4px] text-xs font-medium border transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--btn-secondary-bg)',
                  borderColor: 'var(--btn-secondary-border)',
                  color: 'var(--btn-secondary-text)',
                }}
                title="Run whole editor (Ctrl+Shift+Enter)"
              >
                Run All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CodeMirror container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 h-full overflow-hidden"
        style={{ backgroundColor: 'var(--editor-bg)' }}
      />
    </div>
  );
};
