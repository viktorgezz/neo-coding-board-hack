import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';


// =============================================================================
// Mock API plugin — intercepts /api/v1/* in dev mode only.
//
// Тестовые аккаунты:
//   interviewer@test.ru  / любой пароль  → роль INTERVIEWER
//   hr@test.ru           / любой пароль  → роль HR
//   admin@test.ru        / любой пароль  → роль ADMIN
//
// Кандидат: открыть /session/room-001/join или /session/room-002/join
//
// УДАЛИ этот плагин перед деплоем — замени прокси на реальный бэкенд.
// =============================================================================

// ── Fake JWT (signature не проверяется — только для UI-тестирования) ─────────
function b64url(s: string): string {
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function makeJWT(payload: Record<string, unknown>): string {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64url(JSON.stringify(payload));
  return `${h}.${p}.mock-sig`;
}

// ── Тестовые пользователи ─────────────────────────────────────────────────────
const MOCK_STAFF: Record<string, { role: string; name: string; id: string }> = {
  'interviewer@test.ru': { role: 'interviewer', name: 'Анна Смирнова',      id: 'uid-1' },
  'hr@test.ru':          { role: 'hr',          name: 'Мария Козлова',       id: 'uid-2' },
  'admin@test.ru':       { role: 'admin',       name: 'Иван Администратор', id: 'uid-3' },
};

// ── Мок-данные ────────────────────────────────────────────────────────────────
const MOCK_ROOMS = [
  {
    idRoom:         'room-001',
    nameCandidate:  'Пётр Иванов',
    status:         'ACTIVE',
    dateStart:      '2026-04-09T10:00:00Z',
    dateEnd:        null,
    timeOffset:     '15:30',
  },
  {
    idRoom:         'room-002',
    nameCandidate:  'Алексей Сидоров',
    status:         'FINISHED',
    dateStart:      '2026-04-08T14:00:00Z',
    dateEnd:        '2026-04-08T15:30:00Z',
    timeOffset:     '01:30:00',
    codeResolution: 'PASSED',
  },
  {
    idRoom:         'room-003',
    nameCandidate:  'Екатерина Белова',
    status:         'FINISHED',
    dateStart:      '2026-04-07T11:00:00Z',
    dateEnd:        '2026-04-07T12:45:00Z',
    timeOffset:     '01:45:00',
    codeResolution: 'REJECTED',
  },
  {
    idRoom:         'room-004',
    nameCandidate:  null,
    status:         'ACTIVE',
    dateStart:      '2026-04-09T08:30:00Z',
    dateEnd:        null,
    timeOffset:     '03:15',
  },
];

let MOCK_ADMIN_USERS = [
  {
    id:        'uid-1',
    name:      'Анна Смирнова',
    email:     'interviewer@test.ru',
    role:      'INTERVIEWER',
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id:        'uid-2',
    name:      'Мария Козлова',
    email:     'hr@test.ru',
    role:      'HR',
    createdAt: '2026-01-20T11:00:00Z',
  },
  {
    id:        'uid-4',
    name:      'Сергей Попов',
    email:     'interviewer2@test.ru',
    role:      'INTERVIEWER',
    createdAt: '2026-02-03T14:00:00Z',
  },
];

// ── Читаем тело POST-запроса ──────────────────────────────────────────────────
function readBody(req: unknown): Promise<Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = req as any;
  return new Promise((resolve) => {
    let raw = '';
    r.on('data', (chunk: unknown) => { raw += String(chunk); });
    r.on('end', () => {
      try   { resolve(JSON.parse(raw) as Record<string, unknown>); }
      catch { resolve({}); }
    });
  });
}

// ── Плагин ────────────────────────────────────────────────────────────────────
function mockApiPlugin() {
  return {
    name: 'mock-api',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configureServer(server: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use(async (req: any, res: any, next: () => void) => {
        const rawUrl: string = req.url ?? '';
        if (!rawUrl.startsWith('/api/')) return next();

        const url    = new URL(rawUrl, 'http://localhost');
        const path   = url.pathname;
        const method = (req.method as string).toUpperCase();

        function json(data: unknown, status = 200) {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        }

        // ── POST /api/v1/auth/login ──────────────────────────────────────────
        if (method === 'POST' && path === '/api/v1/auth/login') {
          const body  = await readBody(req);
          const email = String(body.email ?? '').toLowerCase().trim();
          const user  = MOCK_STAFF[email];

          if (!user) {
            return json({ message: 'Неверный email или пароль' }, 401);
          }

          const now = Math.floor(Date.now() / 1000);
          return json({
            tokenAccess:  makeJWT({ sub: user.id, role: user.role, exp: now + 3600,  iat: now }),
            tokenRefresh: makeJWT({ sub: user.id, role: user.role, exp: now + 86400, iat: now }),
            name: user.name,
          });
        }

        // ── GET /api/v1/rooms — список сессий интервьюера ────────────────────
        if (method === 'GET' && path === '/api/v1/rooms') {
          return json({
            content: MOCK_ROOMS,
            page: { size: 10, number: 0, totalElements: MOCK_ROOMS.length, totalPages: 1 },
          });
        }

        // ── POST /api/v1/rooms — создать комнату ─────────────────────────────
        if (method === 'POST' && path === '/api/v1/rooms') {
          const body   = await readBody(req);
          const idRoom = `mock-room-${Date.now()}`;
          return json({
            idRoom,
            url:         `http://localhost:5173/session/${idRoom}/join`,
            titleRoom:   body.titleRoom,
            nameVacancy: body.nameVacancy,
          }, 201);
        }

        // ── GET /api/v1/rooms/all — все сессии для HR ────────────────────────
        if (method === 'GET' && path === '/api/v1/rooms/all') {
          const status   = url.searchParams.get('status');
          const filtered = status
            ? MOCK_ROOMS.filter((r) => r.status === status)
            : MOCK_ROOMS;
          return json({
            content: filtered,
            page: { size: 15, number: 0, totalElements: filtered.length, totalPages: 1 },
          });
        }

        // ── GET /api/v1/rooms/join-info/:id — инфо о комнате для кандидата ───
        const joinInfoM = path.match(/^\/api\/v1\/rooms\/join-info\/(.+)$/);
        if (method === 'GET' && joinInfoM) {
          return json({ nameVacancy: 'Kotlin Developer', status: 'ACTIVE' });
        }

        // ── PATCH /api/v1/rooms/finish/:id — завершить интервью ──────────────
        const finishM = path.match(/^\/api\/v1\/rooms\/finish\/([^/]+)$/);
        if (method === 'PATCH' && finishM) {
          return json({ success: true });
        }

        // ── POST /api/v1/rooms/register/:id — регистрация кандидата ─────────
        const regM = path.match(/^\/api\/v1\/rooms\/register\/([^/]+)$/);
        if (method === 'POST' && regM) {
          const idRoom = regM[1];
          const now    = Math.floor(Date.now() / 1000);
          return json({
            tokenAccess: makeJWT({
              sub: 'candidate-1', role: 'candidate',
              exp: now + 7200, iat: now, idRoom,
            }),
          }, 201);
        }

        // ── GET /api/v1/rooms/:id/code/latest — начальный код для редактора ──
        const codeM = path.match(/^\/api\/v1\/rooms\/([^/]+)\/code\/latest$/);
        if (method === 'GET' && codeM) {
          return json({ textContent: '// Начните писать код здесь\n', idLanguage: 'kotlin' });
        }

        // ── GET /api/v1/rooms/:id/notes/paged — заметки интервьюера ─────────
        const notesGetM = path.match(/^\/api\/v1\/rooms\/([^/]+)\/notes\/paged$/);
        if (method === 'GET' && notesGetM) {
          return json({
            content: [
              { id: 'note-1', textContent: 'Хорошо объясняет подход', timeOffset: '03:12', timeCreated: new Date().toISOString() },
              { id: 'note-2', textContent: 'Задал уточняющий вопрос', timeOffset: '07:45', timeCreated: new Date().toISOString() },
            ],
          });
        }

        // ── POST /api/v1/rooms/:id/notes — добавить заметку ─────────────────
        const notesPostM = path.match(/^\/api\/v1\/rooms\/([^/]+)\/notes$/);
        if (method === 'POST' && notesPostM) {
          const body = await readBody(req);
          return json({
            id:          `note-${Date.now()}`,
            textContent: body.textContent,
            timeOffset:  '10:00',
            timeCreated: new Date().toISOString(),
          }, 201);
        }

        // ── DELETE /api/v1/rooms/:id/notes/:noteId — удалить заметку ─────────
        const notesDelM = path.match(/^\/api\/v1\/rooms\/([^/]+)\/notes\/([^/]+)$/);
        if (method === 'DELETE' && notesDelM) {
          return json({}, 204);
        }

        // ── POST /api/v1/rooms/:id/interviewer-assessment — оценка ───────────
        const assessM = path.match(/^\/api\/v1\/rooms\/([^/]+)\/interviewer-assessment$/);
        if (method === 'POST' && assessM) {
          return json({ success: true });
        }

        // ── Метрики (paste / tab-switch) — принять и игнорировать ────────────
        if (method === 'POST' && path.includes('/metrics/')) {
          return json({ success: true });
        }

        // ── GET /api/v1/admin/users — список пользователей ───────────────────
        if (method === 'GET' && path === '/api/v1/admin/users') {
          return json({
            content: MOCK_ADMIN_USERS,
            page: { size: 20, number: 0, totalElements: MOCK_ADMIN_USERS.length, totalPages: 1 },
          });
        }

        // ── POST /api/v1/admin/users — создать пользователя ──────────────────
        if (method === 'POST' && path === '/api/v1/admin/users') {
          const body = await readBody(req);
          return json({
            id:                `user-${Date.now()}`,
            name:              body.name,
            email:             body.email,
            role:              body.role,
            temporaryPassword: body.temporaryPassword,
            createdAt:         new Date().toISOString(),
          }, 201);
        }

        // ── DELETE /api/v1/admin/users/:id — удалить пользователя ────────────
        const adminDelM = path.match(/^\/api\/v1\/admin\/users\/([^/]+)$/);
        if (method === 'DELETE' && adminDelM) {
          const id = adminDelM[1];
          MOCK_ADMIN_USERS = MOCK_ADMIN_USERS.filter((u) => u.id !== id);
          return json({}, 204);
        }

        // ── PATCH /api/v1/admin/users/:id — обновить пользователя ────────────
        const adminPatchM = path.match(/^\/api\/v1\/admin\/users\/([^/]+)$/);
        if (method === 'PATCH' && adminPatchM) {
          const id = adminPatchM[1];
          const body = await readBody(req);
          const existing = MOCK_ADMIN_USERS.find((u) => u.id === id);
          if (!existing) {
            return json({ message: 'User not found' }, 404);
          }
          const updated = {
            ...existing,
            name: String(body.name ?? existing.name),
            email: String(body.email ?? existing.email),
            role: (String(body.role ?? existing.role) as 'HR' | 'INTERVIEWER'),
          };
          MOCK_ADMIN_USERS = MOCK_ADMIN_USERS.map((u) => (u.id === id ? updated : u));
          return json(updated, 200);
        }

        // Неизвестный маршрут — пусть Vite обрабатывает
        next();
      });
    },
  };
}

export default defineConfig({
  // mockApiPlugin() intentionally removed — real backend at 111.88.127.60:8080
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    proxy: {
      // ── Main business API (rooms, auth, notes, code) ─────────────────
      '/api': {
        target:       'http://111.88.127.60:8080',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            // Deployed backend often allows only specific FRONTEND_ORIGIN values.
            // Browser → localhost:5173 still sends Origin: http://localhost:5173;
            // if that origin is not on the server list, Spring CORS returns 403.
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },

      // ── STOMP WebSocket (code sync) ───────────────────────────────────
      '/ws': {
        target:       'http://111.88.127.60:8080',
        changeOrigin: true,
        ws:           true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
          proxy.on('proxyReqWs', (proxyReq, req) => {
            try {
              const u = new URL(req.url ?? '', 'http://localhost');
              const t = u.searchParams.get('access_token');
              if (t) proxyReq.setHeader('Authorization', `Bearer ${t}`);
            } catch {
              /* ignore */
            }
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },

      // ── Tasks Bank Service ────────────────────────────────────────────
      '/tasks-api': {
        target:       'http://111.88.127.60:8001',
        changeOrigin: true,
        rewrite:      (path) => path.replace(/^\/tasks-api/, ''),
      },

      // ── Analytics & AI (history, metrics, assessment, reports) ─────────
      '/analytics-api': {
        target:       'http://111.88.127.60:8000',
        changeOrigin: true,
        rewrite:      (path) => path.replace(/^\/analytics-api/, ''),
      },
    },
  },
});
