import React from 'react';
import { EditorTab } from '../types';

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onNewTab: () => void;
  onCloseTab: (id: string) => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onOpenFile,
  onSaveFile,
  onSaveFileAs,
}) => {
  return (
    <div
      className="h-8 border-b px-2 flex items-center justify-between text-xs shrink-0 select-none"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
      }}
    >
      {/* Tabs list */}
      <div className="flex items-center gap-1 overflow-x-auto min-w-0 pr-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border cursor-pointer transition-colors max-w-44 shrink-0"
              style={{
                backgroundColor: isActive ? 'var(--bg-app)' : 'transparent',
                borderColor: isActive ? 'var(--border)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text-secondary)',
                fontWeight: isActive ? 500 : 400,
              }}
              title={tab.filePath || tab.title}
            >
              <span className="truncate text-xs">
                {tab.title}
              </span>
              {tab.isDirty && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--text-secondary)' }}
                  title="Unsaved changes"
                />
              )}
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="ml-1 text-[11px] opacity-60 hover:opacity-100 p-0.5 rounded-[2px]"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Close tab (Ctrl+W)"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          type="button"
          onClick={onNewTab}
          className="p-1 text-xs rounded-[4px] border transition-colors hover:border-[var(--border-strong)] shrink-0"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            color: 'var(--text)',
          }}
          title="New query tab (Ctrl+T)"
        >
          +
        </button>
      </div>

      {/* File Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={onOpenFile}
          className="px-2 py-0.5 text-[11px] rounded-[3px] border transition-colors"
          style={{
            backgroundColor: 'var(--btn-secondary-bg)',
            borderColor: 'var(--btn-secondary-border)',
            color: 'var(--btn-secondary-text)',
          }}
          title="Open .sql file (Ctrl+O)"
        >
          Open
        </button>
        <button
          type="button"
          onClick={onSaveFile}
          className="px-2 py-0.5 text-[11px] rounded-[3px] border transition-colors"
          style={{
            backgroundColor: 'var(--btn-secondary-bg)',
            borderColor: 'var(--btn-secondary-border)',
            color: 'var(--btn-secondary-text)',
          }}
          title="Save .sql file (Ctrl+S)"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onSaveFileAs}
          className="px-2 py-0.5 text-[11px] rounded-[3px] border transition-colors"
          style={{
            backgroundColor: 'var(--btn-secondary-bg)',
            borderColor: 'var(--btn-secondary-border)',
            color: 'var(--btn-secondary-text)',
          }}
          title="Save as…"
        >
          Save As
        </button>
      </div>
    </div>
  );
};
