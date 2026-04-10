"""Цикломатическая сложность: Python — radon, остальное (в т.ч. Kotlin) — lizard."""

import textwrap

import lizard
import radon.complexity as cc_radon


class ComplexityAnalyzer:
    """Цикломатическая сложность: Python через radon, остальные языки через lizard, bash — эвристика."""

    @staticmethod
    def get_python_complexity(code: str) -> int:
        """Суммарная цикломатическая сложность по всем блокам кода в Python (пакет radon).

        Снимки из редактора часто — тело метода с отступом под класс; без нормализации AST падает
        с IndentationError и раньше возвращалось 0.
        """
        if not code or not code.strip():
            return 0
        normalized = textwrap.dedent(code.expandtabs()).strip()
        stripped = code.strip()
        for src in (normalized, stripped):
            if not src:
                continue
            try:
                results = cc_radon.cc_visit(src)
                return sum(block.complexity for block in results)
            except Exception:
                continue
        return 0

    @staticmethod
    def get_universal_complexity(code: str, ext: str) -> int:
        """Суммарная цикломатическая сложность по функциям для расширения `ext`, поддерживаемого lizard."""
        if not code or not code.strip():
            return 0
        file_name = f"tmp.{ext}"
        try:
            analysis = lizard.analyze_file.analyze_source_code(file_name, code)
            return sum(func.cyclomatic_complexity for func in analysis.function_list)
        except Exception:
            return 0

    @staticmethod
    def _bash_branch_heuristic(code: str) -> int:
        """Грубая оценка ветвлений в shell по ключевым словам и операторам (lizard для sh не используется)."""
        if not code or not code.strip():
            return 0
        keywords = ("if ", "while ", "until ", "for ", "&&", "||", "case ")
        return sum(code.count(k) for k in keywords) + 1

    @classmethod
    def calculate(cls, code: str, lang: str) -> int:
        """Возвращает цикломатическую сложность для языка `lang`; для bash — эвристика; неизвестный язык — 0."""
        lang_map = {
            "python": "py",
            "java": "java",
            "cpp": "cpp",
            "c++": "cpp",
            "javascript": "js",
            "js": "js",
            "kotlin": "kt",
            "kt": "kt",
            "bash": "sh",
            "sh": "sh",
        }

        ext = lang_map.get((lang or "").lower())
        if ext is None:
            return 0
        if ext == "py":
            return cls.get_python_complexity(code)
        if ext == "sh":
            return cls._bash_branch_heuristic(code)
        return cls.get_universal_complexity(code, ext)
