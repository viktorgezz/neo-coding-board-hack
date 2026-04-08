"""Цикломатическая сложность: Python — radon, остальное (в т.ч. Kotlin) — lizard."""

import lizard
import radon.complexity as cc_radon


class ComplexityAnalyzer:
    @staticmethod
    def get_python_complexity(code: str) -> int:
        """Суммарная CC по всем функциям/методам (radon)."""
        if not code or not code.strip():
            return 0
        try:
            results = cc_radon.cc_visit(code)
            return sum(block.complexity for block in results)
        except Exception:
            return 0

    @staticmethod
    def get_universal_complexity(code: str, ext: str) -> int:
        """CC для языков, которые понимает lizard (java, cpp, js, kt, …)."""
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
        """Упрощённая оценка ветвлений для shell (lizard не используем)."""
        if not code or not code.strip():
            return 0
        keywords = ("if ", "while ", "until ", "for ", "&&", "||", "case ")
        return sum(code.count(k) for k in keywords) + 1

    @classmethod
    def calculate(cls, code: str, lang: str) -> int:
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
