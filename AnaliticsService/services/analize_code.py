"""Эвристическая оценка сложности исходного кода по языку (AST, парсеры, текстовые паттерны)."""

import ast
import re
from typing import Any

import bashlex
import clang.cindex
import esprima
import javalang

_JS_NODE_WEIGHTS: dict[str, int] = {
    "FunctionDeclaration": 8,
    "FunctionExpression": 8,
    "ArrowFunctionExpression": 6,
    "ClassDeclaration": 10,
    "ClassExpression": 10,
    "MethodDefinition": 8,
    "TryStatement": 5,
    "CatchClause": 2,
    "IfStatement": 3,
    "SwitchStatement": 4,
    "ForStatement": 3,
    "ForInStatement": 3,
    "ForOfStatement": 3,
    "WhileStatement": 3,
    "DoWhileStatement": 3,
    "ConditionalExpression": 2,
    "LogicalExpression": 1,
    "VariableDeclaration": 1,
    "JSXElement": 3,
    "JSXFragment": 3,
}


def _walk_estree_score(node: Any, acc: list[int]) -> None:
    """Рекурсивно обходит ESTree (dict/list) и накапливает эвристический скор по типам узлов."""
    if node is None:
        return
    if isinstance(node, dict):
        ntype = node.get("type")
        if isinstance(ntype, str):
            acc[0] += _JS_NODE_WEIGHTS.get(ntype, 0)
        for v in node.values():
            _walk_estree_score(v, acc)
    elif isinstance(node, list):
        for item in node:
            _walk_estree_score(item, acc)


def _parse_js_to_dict(code: str) -> dict[str, Any] | None:
    """Парсит JavaScript/JSX в словарь AST: сначала как script, при ошибке — как module (tolerant)."""
    for source_type in ("script", "module"):
        try:
            ast_root = esprima.parse(
                code,
                tolerant=True,
                jsx=True,
                sourceType=source_type,
            )
            return esprima.toDict(ast_root)
        except Exception:
            continue
    return None


class AnalyticsEngine:
    """Эвристическая оценка «сложности» кода по языку: AST, парсер или текстовые паттерны."""

    @staticmethod
    def analyze_python(code: str) -> int:
        """Число определений функций/классов в Python-AST, умноженное на коэффициент; при ошибке парсинга — 0."""
        try:
            tree = ast.parse(code)
            return sum(1 for _ in ast.walk(tree) if isinstance(_, (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef))) * 5
        except: return 0

    @staticmethod
    def analyze_java(code: str) -> int:
        """Суммирует веса методов, классов и блоков try в Java-AST (javalang); при ошибке — 0."""
        try:
            tree = javalang.parse.parse(code)
            score = 0
            for path, node in tree:
                if isinstance(node, (javalang.tree.MethodDeclaration, javalang.tree.ClassDeclaration)):
                    score += 8
                if isinstance(node, javalang.tree.TryStatement):
                    score += 5
            return score
        except Exception:
            return 0

    @staticmethod
    def analyze_kotlin(code: str) -> int:
        """Эвристика по тексту (без AST): ключевые слова fun, class, interface, object, when, try, val/var."""
        if not code or not code.strip():
            return 0
        score = 0
        score += len(re.findall(r"\bfun\s+", code)) * 8
        score += len(re.findall(r"\bclass\s+", code)) * 10
        score += len(re.findall(r"\binterface\s+", code)) * 10
        score += len(re.findall(r"\bobject\s+", code)) * 8
        score += len(re.findall(r"\bwhen\s*\(", code)) * 5
        score += len(re.findall(r"\btry\s*\{", code)) * 5
        score += min(len(re.findall(r"\b(val|var)\s+", code)), 25) * 2
        return score

    @staticmethod
    def analyze_js(code: str) -> int:
        """Обход ESTree после esprima: функции, классы, ветвления, циклы, JSX и т.д.; пустой код — 0."""
        if not code or not code.strip():
            return 0
        tree = _parse_js_to_dict(code)
        if not tree:
            return 0
        acc = [0]
        _walk_estree_score(tree, acc)
        return acc[0]

    @staticmethod
    def analyze_cpp(code: str) -> int:
        """Обход AST libclang: объявления классов и функций с фиксированными весами; при ошибке — 0."""
        try:
            index = clang.cindex.Index.create()
            tu = index.parse('tmp.cpp', unsaved_files=[('tmp.cpp', code)])
            score = 0
            for node in tu.cursor.walk_preorder():
                if node.kind == clang.cindex.CursorKind.CLASS_DECL: score += 10
                if node.kind == clang.cindex.CursorKind.FUNCTION_DECL: score += 5
            return score
        except: return 0

    @staticmethod
    def analyze_bash(code: str) -> int:
        """Число верхнеуровневых фрагментов bashlex (команды/пайпы) с фиксированным весом на фрагмент."""
        try:
            parts = bashlex.parse(code)
            score = 0
            for part in parts:
                # bashlex разбивает на команды, пайпы и подвыражения
                score += 3
            return score
        except: return 0

    @classmethod
    def get_complexity(cls, code: str, lang: str) -> int:
        """Возвращает эвристический скор для строки `lang` (python, java, js, …); неизвестный язык — 0."""
        mapping = {
            "python": cls.analyze_python,
            "java": cls.analyze_java,
            "javascript": cls.analyze_js,
            "js": cls.analyze_js,
            "cpp": cls.analyze_cpp,
            "bash": cls.analyze_bash,
            "kotlin": cls.analyze_kotlin,
            "kt": cls.analyze_kotlin,
        }
        handler = mapping.get(lang.lower())
        return handler(code) if handler else 0