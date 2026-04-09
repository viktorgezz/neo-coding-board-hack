/**
 * Кнопка «назад» в шапке полноэкранных страниц (без layout), стилизована как текст.
 */

import { useNavigate } from 'react-router-dom';
import styles from './BackButton.module.css';

export interface BackButtonProps {
  to?:    string;
  label?: string;
}

export default function BackButton({ to, label = 'Назад' }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={styles.backBtn}
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      ← {label}
    </button>
  );
}
