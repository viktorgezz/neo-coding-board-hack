/**
 * Pagination — prev/next controls with page indicator.
 *
 * Pages are 0-indexed in the API; display is 1-indexed for the user.
 * Memoized: re-renders only when currentPage, totalPages, or onPageChange changes.
 */

import { memo } from 'react';
import styles from './Pagination.module.css';

export interface PaginationProps {
  currentPage:  number;
  totalPages:   number;
  onPageChange: (page: number) => void;
}

const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className={styles.pageBtn}
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ← Назад
      </button>

      <span className={styles.pageIndicator}>
        Страница {currentPage + 1} из {totalPages}
      </span>

      <button
        type="button"
        className={styles.pageBtn}
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Вперёд →
      </button>
    </div>
  );
});

export default Pagination;
