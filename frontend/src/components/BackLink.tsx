/**
 * Компактная ссылка «назад» к родительскому разделу (список, дашборд).
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './BackLink.module.css';

export interface BackLinkProps {
  to:      string;
  children: ReactNode;
}

export default function BackLink({ to, children }: BackLinkProps) {
  return (
    <Link to={to} className={styles.backLink}>
      ← {children}
    </Link>
  );
}
