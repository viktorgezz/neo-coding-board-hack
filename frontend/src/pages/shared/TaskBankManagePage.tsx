import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import styles from './TaskBankManagePage.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Category {
  id: number;
  name: string;
  description: string;
}

interface Task {
  id: number;
  title: string;
  statement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category_id: number;
}

type Difficulty = 'easy' | 'medium' | 'hard';

// ── Axios instance ─────────────────────────────────────────────────────────────

const TASKS_BANK_BASE_URL = (
  import.meta.env.VITE_TASKS_BANK_API_BASE_URL as string | undefined
  ?? '/tasks-api'
).replace(/\/$/, '');

const api = axios.create({ baseURL: TASKS_BANK_BASE_URL });

// ── API hooks ──────────────────────────────────────────────────────────────────

function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/v1/categories').then((r) => r.data),
  });
}

function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description: string }) =>
      api.post('/api/v1/categories', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; name: string; description: string }) =>
      api.patch(`/api/v1/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

function useTasks(filters: { difficulty: string; category_id: string }) {
  return useQuery<Task[]>({
    queryKey: ['tasks', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.difficulty) params.set('difficulty', filters.difficulty);
      if (filters.category_id) params.set('category_id', filters.category_id);
      const qs = params.toString();
      return api.get<Task[]>(`/api/v1/tasks${qs ? `?${qs}` : ''}`).then((r) => r.data);
    },
  });
}

function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; statement: string; difficulty: Difficulty; category_id: number }) =>
      api.post('/api/v1/tasks', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; title: string; statement: string; difficulty: Difficulty; category_id: number }) =>
      api.patch(`/api/v1/tasks/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ── Difficulty badge ───────────────────────────────────────────────────────────

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
};

function DifficultyBadge({ value }: { value: Difficulty }) {
  return <span className={`${styles.badge} ${styles[`badge_${value}`]}`}>{DIFFICULTY_LABEL[value]}</span>;
}

// ── Category row ───────────────────────────────────────────────────────────────

function CategoryRow({ cat, categories }: { cat: Category; categories: Category[] }) {
  const update = useUpdateCategory();
  const remove = useDeleteCategory();

  const [editing, setEditing]     = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName]           = useState(cat.name);
  const [desc, setDesc]           = useState(cat.description);

  function handleSave() {
    if (!name.trim()) return;
    update.mutate({ id: cat.id, name: name.trim(), description: desc.trim() }, {
      onSuccess: () => setEditing(false),
    });
  }

  function handleDelete() {
    remove.mutate(cat.id, { onSuccess: () => setConfirming(false) });
  }

  if (editing) {
    return (
      <div className={styles.listItem}>
        <div className={styles.listItemBody}>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название"
          />
          <input
            className={`${styles.input} ${styles.inputSm}`}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Описание"
            style={{ marginTop: 6 }}
          />
          <div className={styles.inlineActions}>
            <button className={styles.btnSave} onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? '...' : 'Сохранить'}
            </button>
            <button className={styles.btnCancel} onClick={() => { setEditing(false); setName(cat.name); setDesc(cat.description); }}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className={styles.listItem}>
        <div className={styles.listItemBody}>
          <span className={styles.itemName}>{cat.name}</span>
          <div className={styles.inlineActions}>
            <span className={styles.confirmText}>Удалить?</span>
            <button className={styles.btnDanger} onClick={handleDelete} disabled={remove.isPending}>
              {remove.isPending ? '...' : 'Да'}
            </button>
            <button className={styles.btnCancel} onClick={() => setConfirming(false)}>Нет</button>
          </div>
        </div>
      </div>
    );
  }

  // prevent unused variable warning
  void categories;

  return (
    <div className={styles.listItem}>
      <div className={styles.listItemBody}>
        <span className={styles.itemName}>{cat.name}</span>
        {cat.description && <span className={styles.itemDesc}>{cat.description}</span>}
      </div>
      <div className={styles.listItemActions}>
        <button className={styles.iconBtn} onClick={() => setEditing(true)} title="Редактировать">✎</button>
        <button className={styles.iconBtn} onClick={() => setConfirming(true)} title="Удалить">✕</button>
      </div>
    </div>
  );
}

// ── Task row ───────────────────────────────────────────────────────────────────

function TaskRow({ task, categories }: { task: Task; categories: Category[] }) {
  const update = useUpdateTask();
  const remove = useDeleteTask();

  const [editing, setEditing]     = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle]         = useState(task.title);
  const [statement, setStatement] = useState(task.statement);
  const [difficulty, setDifficulty] = useState<Difficulty>(task.difficulty);
  const [categoryId, setCategoryId] = useState(String(task.category_id));

  const catName = categories.find((c) => c.id === task.category_id)?.name ?? '—';

  function handleSave() {
    if (!title.trim() || !categoryId) return;
    update.mutate(
      { id: task.id, title: title.trim(), statement: statement.trim(), difficulty, category_id: Number(categoryId) },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleDelete() {
    remove.mutate(task.id, { onSuccess: () => setConfirming(false) });
  }

  if (editing) {
    return (
      <div className={styles.listItem}>
        <div className={styles.listItemBody} style={{ flex: 1 }}>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название задачи"
          />
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Условие задачи"
            style={{ marginTop: 6 }}
          />
          <div className={styles.row} style={{ marginTop: 6, gap: 8 }}>
            <select className={styles.select} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              <option value="easy">Лёгкая</option>
              <option value="medium">Средняя</option>
              <option value="hard">Сложная</option>
            </select>
            <select className={styles.select} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Категория</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.inlineActions} style={{ marginTop: 8 }}>
            <button className={styles.btnSave} onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? '...' : 'Сохранить'}
            </button>
            <button className={styles.btnCancel} onClick={() => {
              setEditing(false);
              setTitle(task.title);
              setStatement(task.statement);
              setDifficulty(task.difficulty);
              setCategoryId(String(task.category_id));
            }}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className={styles.listItem}>
        <div className={styles.listItemBody}>
          <span className={styles.itemName}>{task.title}</span>
          <div className={styles.inlineActions}>
            <span className={styles.confirmText}>Удалить?</span>
            <button className={styles.btnDanger} onClick={handleDelete} disabled={remove.isPending}>
              {remove.isPending ? '...' : 'Да'}
            </button>
            <button className={styles.btnCancel} onClick={() => setConfirming(false)}>Нет</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.listItem}>
      <div className={styles.listItemBody} style={{ flex: 1 }}>
        <div className={styles.taskHeader}>
          <span className={styles.itemName}>{task.title}</span>
          <DifficultyBadge value={task.difficulty} />
        </div>
        <p className={styles.taskStatement}>{task.statement}</p>
        <span className={styles.itemDesc}>{catName}</span>
      </div>
      <div className={styles.listItemActions}>
        <button className={styles.iconBtn} onClick={() => setEditing(true)} title="Редактировать">✎</button>
        <button className={styles.iconBtn} onClick={() => setConfirming(true)} title="Удалить">✕</button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TaskBankManagePage() {
  // ── Category form state
  const [catName, setCatName]   = useState('');
  const [catDesc, setCatDesc]   = useState('');

  // ── Task form state
  const [taskTitle, setTaskTitle]         = useState('');
  const [taskStatement, setTaskStatement] = useState('');

  // ── Filter state (also used as category/difficulty when adding a task)
  const [filterCategory,   setFilterCategory]   = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');

  // ── Data
  const categories = useCategories();
  const tasks      = useTasks({ difficulty: filterDifficulty, category_id: filterCategory });

  // ── Mutations
  const createCat  = useCreateCategory();
  const createTask = useCreateTask();

  // ── Handlers
  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    createCat.mutate(
      { name: catName.trim(), description: catDesc.trim() },
      { onSuccess: () => { setCatName(''); setCatDesc(''); } },
    );
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !filterCategory) return;
    createTask.mutate(
      {
        title: taskTitle.trim(),
        statement: taskStatement.trim(),
        difficulty: (filterDifficulty as Difficulty) || 'easy',
        category_id: Number(filterCategory),
      },
      { onSuccess: () => { setTaskTitle(''); setTaskStatement(''); } },
    );
  }

  const cats = categories.data ?? [];

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Банк задач</h1>

      <div className={styles.columns}>

        {/* ── Left: Categories ── */}
        <div className={styles.card}>
          <p className={styles.sectionLabel}>Категории</p>

          {/* Add form */}
          <form onSubmit={handleAddCategory} className={styles.addForm}>
            <input
              className={styles.input}
              placeholder="Название категории"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />
            <input
              className={`${styles.input} ${styles.inputSm}`}
              placeholder="Описание (опционально)"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <button className={styles.btnAdd} type="submit" disabled={createCat.isPending} style={{ marginTop: 8 }}>
              {createCat.isPending ? '...' : 'Добавить'}
            </button>
          </form>

          <div className={styles.divider} />

          {/* List */}
          {categories.isLoading && <p className={styles.muted}>Загрузка...</p>}
          {categories.isError   && <p className={styles.error}>Ошибка загрузки</p>}
          {cats.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} categories={cats} />
          ))}
          {!categories.isLoading && !categories.isError && cats.length === 0 && (
            <p className={styles.muted}>Нет категорий</p>
          )}
        </div>

        {/* ── Right: Tasks ── */}
        <div className={styles.card}>
          <p className={styles.sectionLabel}>Задачи</p>

          {/* Filters — also determine category/difficulty for new tasks */}
          <div className={styles.row} style={{ marginBottom: 4 }}>
            <select className={styles.select} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">Все категории</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className={styles.select} value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}>
              <option value="">Любая сложность</option>
              <option value="easy">Лёгкая</option>
              <option value="medium">Средняя</option>
              <option value="hard">Сложная</option>
            </select>
          </div>
          <p className={styles.filterHint}>
            {filterCategory
              ? `Новая задача → ${cats.find((c) => String(c.id) === filterCategory)?.name ?? '…'}, ${filterDifficulty ? DIFFICULTY_LABEL[filterDifficulty as Difficulty] : 'Лёгкая'}`
              : 'Выберите категорию, чтобы добавить задачу'}
          </p>

          {/* Add task form */}
          <form onSubmit={handleAddTask} className={styles.addForm} style={{ marginBottom: 16 }}>
            <input
              className={styles.input}
              placeholder="Название задачи"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              required
              disabled={!filterCategory}
            />
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Условие задачи"
              value={taskStatement}
              onChange={(e) => setTaskStatement(e.target.value)}
              style={{ marginTop: 8 }}
              disabled={!filterCategory}
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <button className={styles.btnAdd} type="submit" disabled={createTask.isPending || !filterCategory}>
                {createTask.isPending ? '...' : 'Добавить'}
              </button>
            </div>
          </form>

          <div className={styles.divider} />

          {/* List */}
          {tasks.isLoading && <p className={styles.muted}>Загрузка...</p>}
          {tasks.isError   && <p className={styles.error}>Ошибка загрузки</p>}
          {(tasks.data ?? []).map((task) => (
            <TaskRow key={task.id} task={task} categories={cats} />
          ))}
          {!tasks.isLoading && !tasks.isError && (tasks.data ?? []).length === 0 && (
            <p className={styles.muted}>Нет задач</p>
          )}
        </div>

      </div>
    </div>
  );
}
