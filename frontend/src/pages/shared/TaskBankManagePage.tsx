import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './TaskBankManagePage.module.css';

type DifficultyLevel = 'easy' | 'medium' | 'hard';

interface CategoryRead {
  id: number;
  name: string;
  description?: string | null;
}

interface TaskRead {
  id: number;
  title: string;
  statement: string;
  difficulty: DifficultyLevel;
  category_id: number;
}

const TASKS_BANK_BASE_URL = (
  import.meta.env.VITE_TASKS_BANK_API_BASE_URL as string | undefined
  ?? '/tasks-bank-api'
).replace(/\/$/, '');

const EMPTY_CATEGORY_FORM = { name: '', description: '' };
const EMPTY_TASK_FORM = { title: '', statement: '', difficulty: 'medium' as DifficultyLevel, category_id: '' };

export default function TaskBankManagePage() {
  const [categories, setCategories] = useState<CategoryRead[]>([]);
  const [tasks, setTasks] = useState<TaskRead[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const fetchCategories = useCallback(async () => {
    const res = await fetch(`${TASKS_BANK_BASE_URL}/api/v1/categories`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as CategoryRead[];
    setCategories(data);
  }, []);

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedCategory !== null) params.set('category_id', String(selectedCategory));
    if (selectedDifficulty !== null) params.set('difficulty', selectedDifficulty);
    const query = params.toString();
    const url = `${TASKS_BANK_BASE_URL}/api/v1/tasks${query ? `?${query}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as TaskRead[];
    setTasks(data);
  }, [selectedCategory, selectedDifficulty]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchCategories(), fetchTasks()]);
    } catch {
      setError('Не удалось загрузить Task Bank');
    } finally {
      setLoading(false);
    }
  }, [fetchCategories, fetchTasks]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  async function saveCategory() {
    if (!categoryForm.name.trim()) return;
    const isEdit = editingCategoryId !== null;
    const url = isEdit
      ? `${TASKS_BANK_BASE_URL}/api/v1/categories/${editingCategoryId}`
      : `${TASKS_BANK_BASE_URL}/api/v1/categories`;
    const method = isEdit ? 'PATCH' : 'POST';
    const body = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim() || null,
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setEditingCategoryId(null);
    await reload();
  }

  async function saveTask() {
    if (!taskForm.title.trim() || !taskForm.statement.trim() || !taskForm.category_id) return;
    const isEdit = editingTaskId !== null;
    const url = isEdit
      ? `${TASKS_BANK_BASE_URL}/api/v1/tasks/${editingTaskId}`
      : `${TASKS_BANK_BASE_URL}/api/v1/tasks`;
    const method = isEdit ? 'PATCH' : 'POST';
    const body = {
      title: taskForm.title.trim(),
      statement: taskForm.statement.trim(),
      difficulty: taskForm.difficulty,
      category_id: Number(taskForm.category_id),
    };
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setTaskForm(EMPTY_TASK_FORM);
    setEditingTaskId(null);
    await reload();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Управление банком задач</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Категории</h2>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              placeholder="Название категории"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              className={styles.input}
              placeholder="Описание (опционально)"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
            />
            <button type="button" className={styles.primaryBtn} onClick={() => { void saveCategory(); }}>
              {editingCategoryId ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
          <div className={styles.list}>
            {categories.map((category) => (
              <div key={category.id} className={styles.listItem}>
                <div>
                  <div className={styles.itemTitle}>{category.name}</div>
                  {category.description && <div className={styles.itemSub}>{category.description}</div>}
                </div>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setEditingCategoryId(category.id);
                    setCategoryForm({
                      name: category.name,
                      description: category.description ?? '',
                    });
                  }}
                >
                  Редактировать
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Задачи</h2>
          <div className={styles.filters}>
            <select
              className={styles.select}
              value={selectedCategory ?? ''}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              className={styles.select}
              value={selectedDifficulty ?? ''}
              onChange={(e) => setSelectedDifficulty((e.target.value as DifficultyLevel | '') || null)}
            >
              <option value="">Любая сложность</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
            <button type="button" className={styles.secondaryBtn} onClick={() => { void reload(); }}>
              Обновить
            </button>
          </div>

          <div className={styles.formCol}>
            <input
              className={styles.input}
              placeholder="Название задачи"
              value={taskForm.title}
              onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
            />
            <textarea
              className={styles.textarea}
              placeholder="Условие задачи"
              value={taskForm.statement}
              onChange={(e) => setTaskForm((p) => ({ ...p, statement: e.target.value }))}
            />
            <div className={styles.formRow}>
              <select
                className={styles.select}
                value={taskForm.difficulty}
                onChange={(e) => setTaskForm((p) => ({ ...p, difficulty: e.target.value as DifficultyLevel }))}
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
              <select
                className={styles.select}
                value={taskForm.category_id}
                onChange={(e) => setTaskForm((p) => ({ ...p, category_id: e.target.value }))}
              >
                <option value="">Категория</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
              <button type="button" className={styles.primaryBtn} onClick={() => { void saveTask(); }}>
                {editingTaskId ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>

          <div className={styles.list}>
            {!loading && tasks.map((task) => (
              <div key={task.id} className={styles.listItem}>
                <div>
                  <div className={styles.itemTitle}>
                    {task.title} <span className={styles.badge}>{task.difficulty}</span>
                  </div>
                  <div className={styles.itemSub}>{categoryNameById.get(task.category_id) ?? `#${task.category_id}`}</div>
                </div>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setEditingTaskId(task.id);
                    setTaskForm({
                      title: task.title,
                      statement: task.statement,
                      difficulty: task.difficulty,
                      category_id: String(task.category_id),
                    });
                  }}
                >
                  Редактировать
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
