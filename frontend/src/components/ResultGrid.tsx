import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StatementResult } from '../types';
import { exportResultFile } from '../lib/api';

interface ResultGridProps {
  result: StatementResult;
}

const ROW_HEIGHT = 28;
const OVERSCAN = 10;

export const ResultGrid: React.FC<ResultGridProps> = ({ result }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(300);

  // Cell selection state: { r1, c1, r2, c2 }
  const [selection, setSelection] = useState<{
    startR: number;
    startC: number;
    endR: number;
    endC: number;
  } | null>(null);

  // Cell inspector popup
  const [inspectedCell, setInspectedCell] = useState<{
    row: number;
    col: string;
    value: string;
    isNull: boolean;
  } | null>(null);

  const [copiedNotice, setCopiedNotice] = useState(false);

  const hasColumns = result.columns && result.columns.length > 0;
  const rows = result.rows || [];
  const totalRows = rows.length;

  // Track container height via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(el);
    setContainerHeight(el.clientHeight);

    return () => observer.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Virtual slice calculations
  const { startIndex, endIndex, topSpacerHeight, bottomSpacerHeight } = useMemo(() => {
    if (totalRows === 0) {
      return { startIndex: 0, endIndex: 0, topSpacerHeight: 0, bottomSpacerHeight: 0 };
    }
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);
    return {
      startIndex: start,
      endIndex: end,
      topSpacerHeight: start * ROW_HEIGHT,
      bottomSpacerHeight: (totalRows - end) * ROW_HEIGHT,
    };
  }, [scrollTop, containerHeight, totalRows]);

  const visibleRows = useMemo(() => {
    return rows.slice(startIndex, endIndex);
  }, [rows, startIndex, endIndex]);

  // Copy selected cells as TSV (Tab-Separated Values for Excel)
  const copySelectionToClipboard = useCallback(() => {
    if (!selection) return;

    const rMin = Math.min(selection.startR, selection.endR);
    const rMax = Math.max(selection.startR, selection.endR);
    const cMin = Math.min(selection.startC, selection.endC);
    const cMax = Math.max(selection.startC, selection.endC);

    const lines: string[] = [];
    for (let r = rMin; r <= rMax; r++) {
      const row = rows[r];
      if (!row) continue;
      const cells: string[] = [];
      for (let c = cMin; c <= cMax; c++) {
        const cell = row[c];
        if (!cell) {
          cells.push('');
        } else if (cell.isNull) {
          cells.push('NULL');
        } else {
          cells.push(cell.value);
        }
      }
      lines.push(cells.join('\t'));
    }

    const tsv = lines.join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 1500);
    });
  }, [selection, rows]);

  // Global keydown listener for copy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (selection) {
          copySelectionToClipboard();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, copySelectionToClipboard]);

  // Export to CSV
  const handleExportCSV = async () => {
    if (!hasColumns) return;
    const header = result.columns
      .map((c) => `"${c.replace(/"/g, '""')}"`)
      .join(',');

    const lines = [header];
    for (const row of rows) {
      const rowValues = row.map((cell) => {
        if (cell.isNull) return 'NULL';
        return `"${cell.value.replace(/"/g, '""')}"`;
      });
      lines.push(rowValues.join(','));
    }
    const csvContent = lines.join('\n');
    await exportResultFile('result.csv', csvContent);
  };

  // Export to JSON
  const handleExportJSON = async () => {
    if (!hasColumns) return;
    const jsonRows = rows.map((row) => {
      const obj: Record<string, string | null> = {};
      result.columns.forEach((col, idx) => {
        const cell = row[idx];
        obj[col] = cell && !cell.isNull ? cell.value : null;
      });
      return obj;
    });
    const jsonContent = JSON.stringify(jsonRows, null, 2);
    await exportResultFile('result.json', jsonContent);
  };

  const isCellSelected = (r: number, c: number) => {
    if (!selection) return false;
    const rMin = Math.min(selection.startR, selection.endR);
    const rMax = Math.max(selection.startR, selection.endR);
    const cMin = Math.min(selection.startC, selection.endC);
    const cMax = Math.max(selection.startC, selection.endC);
    return r >= rMin && r <= rMax && c >= cMin && c <= cMax;
  };

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden select-none"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text)',
      }}
    >
      {/* Result Status Bar */}
      <div
        className="h-8 px-3 border-b flex items-center justify-between text-xs shrink-0"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="font-mono text-[11px] px-1.5 py-0.5 rounded-[3px] border font-medium"
            style={{
              backgroundColor: 'var(--bg-app)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          >
            {result.commandTag || 'RESULT'}
          </span>
          <span className="text-[11px]">
            {result.rowCount.toLocaleString()} {result.rowCount === 1 ? 'row' : 'rows'}
          </span>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <span className="font-mono text-[11px]">
            {result.durationMs} ms
          </span>
          {copiedNotice && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px]"
              style={{
                backgroundColor: 'var(--status-success-bg)',
                color: 'var(--status-success)',
              }}
            >
              Copied to clipboard (TSV)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {result.truncated && (
            <div
              className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-[3px] border mr-2"
              style={{
                backgroundColor: 'var(--status-warning-bg)',
                borderColor: 'var(--status-warning-border)',
                color: 'var(--status-warning)',
              }}
            >
              <span>
                Showing first {result.truncatedAt.toLocaleString()} rows (
                {(result.rowCount - result.truncatedAt).toLocaleString()} cut off)
              </span>
            </div>
          )}

          {hasColumns && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-2 py-0.5 text-[11px] rounded-[3px] border transition-colors"
                style={{
                  backgroundColor: 'var(--btn-secondary-bg)',
                  borderColor: 'var(--btn-secondary-border)',
                  color: 'var(--btn-secondary-text)',
                }}
                title="Export as CSV file"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="px-2 py-0.5 text-[11px] rounded-[3px] border transition-colors"
                style={{
                  backgroundColor: 'var(--btn-secondary-bg)',
                  borderColor: 'var(--btn-secondary-border)',
                  color: 'var(--btn-secondary-text)',
                }}
                title="Export as JSON file"
              >
                JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid Table Container with Virtualization */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto relative"
      >
        {hasColumns ? (
          <table
            className="w-full border-collapse text-left"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
          >
            <thead
              className="sticky top-0 z-10 shadow-xs"
              style={{
                backgroundColor: 'var(--table-header-bg)',
              }}
            >
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th
                  className="py-1.5 px-3 text-[11px] font-normal w-12 text-right select-none border-r"
                  style={{
                    color: 'var(--text-secondary)',
                    borderColor: 'var(--border)',
                  }}
                >
                  #
                </th>
                {result.columns.map((col, idx) => {
                  const typeName = result.columnTypes && result.columnTypes[idx];
                  return (
                    <th
                      key={idx}
                      className="py-1.5 px-3 font-medium whitespace-nowrap border-r"
                      style={{
                        color: 'var(--text)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <span className="font-medium">{col}</span>
                      {typeName && (
                        <span
                          className="ml-1.5 text-[10px] font-normal"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          ({typeName})
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Virtual top spacer */}
              {topSpacerHeight > 0 && (
                <tr style={{ height: `${topSpacerHeight}px` }}>
                  <td colSpan={result.columns.length + 1} />
                </tr>
              )}

              {totalRows > 0 ? (
                visibleRows.map((row, indexOffset) => {
                  const rIdx = startIndex + indexOffset;
                  return (
                    <tr
                      key={rIdx}
                      style={{
                        height: `${ROW_HEIGHT}px`,
                        borderBottom: '1px solid var(--border)',
                      }}
                      className="transition-colors hover:bg-[var(--table-row-hover)]"
                    >
                      <td
                        className="py-1 px-3 text-[11px] text-right select-none border-r"
                        style={{
                          color: 'var(--text-secondary)',
                          borderColor: 'var(--border)',
                          backgroundColor: 'var(--table-header-bg)',
                        }}
                      >
                        {rIdx + 1}
                      </td>
                      {row.map((cell, cIdx) => {
                        const selected = isCellSelected(rIdx, cIdx);
                        return (
                          <td
                            key={cIdx}
                            onClick={() => {
                              setSelection({
                                startR: rIdx,
                                startC: cIdx,
                                endR: rIdx,
                                endC: cIdx,
                              });
                            }}
                            onDoubleClick={() => {
                              setInspectedCell({
                                row: rIdx + 1,
                                col: result.columns[cIdx] || `Col ${cIdx + 1}`,
                                value: cell.value,
                                isNull: cell.isNull,
                              });
                            }}
                            className="py-1 px-3 border-r whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px] cursor-cell"
                            style={{
                              borderColor: 'var(--border)',
                              backgroundColor: selected ? 'var(--editor-selection)' : 'transparent',
                              color: cell.isNull ? 'var(--text-secondary)' : 'var(--text)',
                              fontStyle: cell.isNull ? 'italic' : 'normal',
                            }}
                            title={cell.isNull ? 'NULL' : cell.value}
                          >
                            {cell.isNull ? 'NULL' : cell.value}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={result.columns.length + 1}
                    className="py-8 text-center text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    (0 rows returned)
                  </td>
                </tr>
              )}

              {/* Virtual bottom spacer */}
              {bottomSpacerHeight > 0 && (
                <tr style={{ height: `${bottomSpacerHeight}px` }}>
                  <td colSpan={result.columns.length + 1} />
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 gap-1.5">
            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {result.commandTag || 'Command executed'}
            </div>
            <div className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
              {result.rowCount.toLocaleString()} affected in {result.durationMs} ms
            </div>
          </div>
        )}
      </div>

      {/* Cell Value Inspector Modal */}
      {inspectedCell && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setInspectedCell(null)}
        >
          <div
            className="w-full max-w-lg rounded-[4px] border p-4 flex flex-col gap-3"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-medium">
                Cell Value: Row {inspectedCell.row}, Column "{inspectedCell.col}"
              </div>
              <button
                type="button"
                onClick={() => setInspectedCell(null)}
                className="text-xs px-2 py-0.5 rounded-[3px] border"
                style={{
                  backgroundColor: 'var(--btn-secondary-bg)',
                  borderColor: 'var(--btn-secondary-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                Close
              </button>
            </div>
            <div
              className="p-3 rounded-[4px] border font-mono text-xs max-h-60 overflow-y-auto whitespace-pre-wrap break-words"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border)',
                color: inspectedCell.isNull ? 'var(--text-secondary)' : 'var(--text)',
                fontStyle: inspectedCell.isNull ? 'italic' : 'normal',
              }}
            >
              {inspectedCell.isNull ? 'NULL' : inspectedCell.value}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={inspectedCell.isNull}
                onClick={() => {
                  navigator.clipboard.writeText(inspectedCell.value);
                  setInspectedCell(null);
                }}
                className="px-3 py-1 text-xs rounded-[4px] font-medium"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                }}
              >
                Copy Value
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
