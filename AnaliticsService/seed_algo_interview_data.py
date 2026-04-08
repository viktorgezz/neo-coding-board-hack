"""Данные для сида: длинная сессия live-coding (топологическая сортировка / Course Schedule II)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from schemas import CodeSnapshot, InterviewerNote, SessionHistory

# Отдельная комната под «большое» интервью (не трогаем ROOM_FULL / ROOM_PASSED).
ROOM_ALGO_INTERVIEW = uuid.UUID("44444444-4444-4444-4444-444444444444")

_SESSION_START = datetime(2026, 4, 8, 14, 0, 0, tzinfo=timezone.utc)
_SESSION_END = datetime(2026, 4, 8, 16, 15, 0, tzinfo=timezone.utc)


def _code_fragments() -> list[str]:
    """Каждый фрагмент дописывается к предыдущему; итог — корректный Python."""
    return [
        "# Interview: topological order (LeetCode 210 style)\n",
        "# Given numCourses and prerequisites [a,b] — b before a\n",
        "\n",
        "from collections import defaultdict\n",
        "from collections import deque\n",
        "from typing import List\n",
        "\n",
        "class Solution:\n",
        '    """Kahn algorithm — BFS by indegree."""\n',
        "\n",
        "    def findOrder(\n",
        "        self,\n",
        "        numCourses: int,\n",
        "        prerequisites: List[List[int]],\n",
        "    ) -> List[int]:\n",
        "        graph: dict[int, List[int]] = defaultdict(list)\n",
        "        indegree = [0] * numCourses\n",
        "\n",
        "        for edge in prerequisites:\n",
        "            course = edge[0]\n",
        "            prereq = edge[1]\n",
        "            graph[prereq].append(course)\n",
        "            indegree[course] += 1\n",
        "\n",
        "        queue: deque[int] = deque()\n",
        "        for i in range(numCourses):\n",
        "            if indegree[i] == 0:\n",
        "                queue.append(i)\n",
        "\n",
        "        order: List[int] = []\n",
        "        while queue:\n",
        "            u = queue.popleft()\n",
        "            order.append(u)\n",
        "            for v in graph[u]:\n",
        "                indegree[v] -= 1\n",
        "                if indegree[v] == 0:\n",
        "                    queue.append(v)\n",
        "\n",
        "        if len(order) != numCourses:\n",
        "            return []\n",
        "        return order\n",
        "\n",
        "# --- edge: нет рёбер — любой порядок 0..n-1\n",
        "def order_without_edges(n: int) -> List[int]:\n",
        "    return list(range(n))\n",
        "\n",
        "# --- сложность: время O(V+E), память O(V+E)\n",
        "\n",
        "def _self_check() -> None:\n",
        "    sol = Solution()\n",
        "    one = sol.findOrder(2, [[1, 0]])\n",
        "    assert set(one) == {0, 1}\n",
        "\n",
        "def _self_check_cycle() -> None:\n",
        "    sol = Solution()\n",
        "    bad = sol.findOrder(2, [[0, 1], [1, 0]])\n",
        "    assert bad == []\n",
        "\n",
        'if __name__ == "__main__":\n',
        "    _self_check()\n",
        "    _self_check_cycle()\n",
        "    print(\"ok\")\n",
    ]


def _snapshot_times(n: int) -> list[str]:
    """Равномерно от 14:00 до ~16:10 в пределах сессии."""
    start_m = 14 * 60
    end_m = 16 * 60 + 10
    span = end_m - start_m
    times: list[str] = []
    for i in range(n):
        m = start_m + int(i * span / max(1, n - 1))
        h, mm = divmod(m, 60)
        times.append(f"{h:02d}:{mm:02d}")
    return times


def build_algo_session_history() -> SessionHistory:
    frags = _code_fragments()
    assert len(frags) >= 50, len(frags)
    times = _snapshot_times(len(frags))
    cumulative = ""
    snapshots: list[CodeSnapshot] = []
    for t, piece in zip(times, frags, strict=True):
        cumulative += piece
        snapshots.append(CodeSnapshot(timestamp=t, code=cumulative, language="python"))

    notes = [
        InterviewerNote(timestamp="14:01", text="Сформулировал задачу: порядок курсов с зависимостями."),
        InterviewerNote(timestamp="14:06", text="Уточнил: граф ориентированный, нужно вернуть один топологический порядок."),
        InterviewerNote(timestamp="14:14", text="Предложил Kahn вместо DFS — обсудили плюсы."),
        InterviewerNote(timestamp="14:21", text="Записал indegree и список смежности корректно."),
        InterviewerNote(timestamp="14:28", text="Ошибся в направлении ребра [a,b] — быстро исправил после подсказки."),
        InterviewerNote(timestamp="14:36", text="Спросил про случай цикла — ответил, что очередь опустеет раньше времени."),
        InterviewerNote(timestamp="14:44", text="Оценка сложности O(V+E) — верно."),
        InterviewerNote(timestamp="14:52", text="Небольшая пауза на типизацию deque[int]."),
        InterviewerNote(timestamp="15:05", text="Рефакторинг имён переменных без изменения логики."),
        InterviewerNote(timestamp="15:18", text="Добавил проверку на пустые prerequisites устно."),
        InterviewerNote(timestamp="15:31", text="Написал демо-assert для примера из условия."),
        InterviewerNote(timestamp="15:48", text="Итог: решение принято, обсудили альтернативу DFS с цветами."),
    ]
    assert len(notes) >= 10

    return SessionHistory(
        startTime=_SESSION_START,
        endTime=_SESSION_END,
        codeSnapshots=snapshots,
        interviewerNotes=notes,
    )


def session_start_for_violations() -> datetime:
    return _SESSION_START
