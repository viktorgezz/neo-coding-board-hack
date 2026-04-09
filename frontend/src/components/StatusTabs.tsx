/**
 * StatusTabs — segmented control for filtering interview sessions by status.
 *
 * Always shows all three options (Все / Активные / Завершённые).
 * Active tab uses data-active="true" attribute targeted by CSS — no conditional
 * class name needed, avoids string concatenation in the JSX.
 *
 * React.memo: re-renders only when active or onChange changes.
 */

import { memo } from 'react';
import styles from './StatusTabs.module.css';

export type StatusFilter = 'ALL' | 'ACTIVE' | 'FINISHED';

export const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'ALL',      label: 'Все'         },
  { value: 'ACTIVE',   label: 'Активные'    },
  { value: 'FINISHED', label: 'Завершённые' },
];

export interface StatusTabsProps {
  active:   StatusFilter;
  onChange: (tab: StatusFilter) => void;
}

const StatusTabs = memo(function StatusTabs({ active, onChange }: StatusTabsProps) {
  return (
    <div className={styles.statusTabs} role="tablist" aria-label="Фильтр по статусу">
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          className={styles.tabBtn}
          data-active={active === tab.value}
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});

export default StatusTabs;
