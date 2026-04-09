"""Сидирование банка задач: 6 категорий и ~100 задач."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select

from database import SessionLocal, run_migrations
from models import DifficultyLevel, Task, TaskCategory


@dataclass(frozen=True)
class CategorySeed:
    name: str
    description: str


@dataclass(frozen=True)
class TaskBlueprint:
    title_prefix: str
    statement_template: str
    difficulty: DifficultyLevel


CATEGORIES: list[CategorySeed] = [
    CategorySeed("Массивы и строки", "Задачи на индексы, подмассивы, окна и обработку строк."),
    CategorySeed("Хеш-таблицы и множества", "Проверка частот, уникальности и быстрых lookup-операций."),
    CategorySeed("Стек, очередь, связные списки", "Базовые структуры данных и их прикладное применение."),
    CategorySeed("Деревья и графы", "Обходы, поиск путей, уровни и рекурсивные разборы."),
    CategorySeed("Алгоритмы и сложность", "Сортировки, бинарный поиск, жадные/ДП и оценка Big O."),
    CategorySeed("Python-синтаксис и практики", "Понимание языка, idiomatic-подходы и частые конструкции."),
]


def _build_blueprints() -> dict[str, list[TaskBlueprint]]:
    return {
        "Массивы и строки": [
            TaskBlueprint("Два указателя", "Для входной последовательности #{n} реализуйте решение через два указателя.", DifficultyLevel.EASY),
            TaskBlueprint("Скользящее окно", "Для строки/массива #{n} найдите оптимальный диапазон методом скользящего окна.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Префиксные суммы", "Постройте структуру префиксных сумм и ответьте на запросы для кейса #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Разворот строки", "Модифицируйте строку в задаче #{n} с учётом Unicode-символов и ограничений памяти.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Макс подмассив", "Определите подмассив максимальной суммы для варианта #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Анаграммы", "Проверьте анаграммы для набора #{n} с линейной сложностью.", DifficultyLevel.EASY),
            TaskBlueprint("Сжатие строки", "Реализуйте RLE-сжатие и восстановление строки для кейса #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Палиндром", "Найдите максимальную палиндромную подстроку в примере #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Ротация массива", "Выполните ротацию массива на k шагов для задачи #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Слияние интервалов", "Объедините пересекающиеся интервалы в наборе #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Поиск подстроки", "Реализуйте поиск подстроки в строке для сценария #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Минимальное окно", "Найдите минимальное окно, покрывающее символы шаблона в кейсе #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Сравнение версий", "Сравните версии ПО в задаче #{n} без преобразования в float.", DifficultyLevel.EASY),
            TaskBlueprint("Нормализация пути", "Нормализуйте Unix-путь в примере #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Частотный топ-K", "Верните top-k часто встречающихся элементов в наборе #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Разбиение строки", "Разбейте строку на валидные сегменты для кейса #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Матрица спираль", "Считайте элементы матрицы спиралью в сценарии #{n}.", DifficultyLevel.EASY),
        ],
        "Хеш-таблицы и множества": [
            TaskBlueprint("Уникальные символы", "Проверьте уникальность символов в строке для теста #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Частота слов", "Подсчитайте частоты слов и выведите статистику для текста #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Пересечение множеств", "Найдите пересечение двух наборов данных в кейсе #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Сумма пары", "Найдите пару с заданной суммой в наборе #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Изоморфные строки", "Проверьте изоморфизм двух строк для примера #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Группировка анаграмм", "Сгруппируйте слова-анаграммы в сценарии #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("LRU кэш", "Реализуйте простейший LRU-кэш для набора операций #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Счётчик событий", "Спроектируйте счётчик событий в скользящем окне для кейса #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Повторяющийся элемент", "Найдите первый повторяющийся элемент в массиве #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Подмассив с суммой", "Определите существование подмассива с заданной суммой в тесте #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Близкие дубликаты", "Проверьте наличие дубликатов в радиусе k для набора #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Хеш индексация", "Постройте обратный индекс токенов для коллекции #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Поиск цикла строк", "Обнаружьте цикл подстановок в отображении для кейса #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Нормализация email", "Подсчитайте уникальные email после нормализации для списка #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Баланс тегов", "Проверьте соответствие открывающих/закрывающих тегов с хеш-структурой в тесте #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Распределение бакетов", "Смоделируйте хеш-бакеты и оцените коллизии для входа #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Словарь синонимов", "Объедините группы синонимов и ответьте на запросы для кейса #{n}.", DifficultyLevel.MEDIUM),
        ],
        "Стек, очередь, связные списки": [
            TaskBlueprint("Валидные скобки", "Проверьте валидность скобочной последовательности в тесте #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Минимум в стеке", "Реализуйте стек с O(1) получением минимума для сценария #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Очередь через стеки", "Соберите очередь на двух стеках в задаче #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Реверс списка", "Разверните односвязный список для примера #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Слияние списков", "Слейте два отсортированных списка в кейсе #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Поиск середины", "Найдите середину связного списка методом быстрый/медленный для #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Удаление n-го с конца", "Удалите n-й узел с конца списка в тесте #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Цикл в списке", "Обнаружьте цикл в связном списке для входа #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Копия списка с random", "Скопируйте список с random-ссылками в кейсе #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Польская запись", "Вычислите выражение в обратной польской нотации для набора #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Монотонный стек", "Найдите следующий больший элемент для последовательности #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Очередь задач", "Смоделируйте очередь печати с приоритетами для кейса #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Дек с максимумом", "Реализуйте структуру дек с получением максимума в сценарии #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Пересечение списков", "Найдите узел пересечения двух списков в задаче #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Проверка палиндрома списка", "Проверьте, является ли список палиндромом в тесте #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Плоская очередь", "Разверните вложенную очередь команд для примера #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("История undo/redo", "Смоделируйте undo/redo через два стека для сценария #{n}.", DifficultyLevel.HARD),
        ],
        "Деревья и графы": [
            TaskBlueprint("Обход в ширину", "Выполните BFS по дереву/графу в наборе #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Обход в глубину", "Выполните DFS (итеративно и рекурсивно) для кейса #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Глубина дерева", "Посчитайте максимальную глубину бинарного дерева в примере #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Проверка BST", "Проверьте, является ли дерево корректным BST для входа #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("LCA", "Найдите наименьшего общего предка двух узлов в задаче #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Симметрия дерева", "Определите симметричность бинарного дерева в тесте #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Серилизация дерева", "Сериализуйте и десериализуйте дерево для кейса #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Топологическая сортировка", "Постройте топологический порядок для DAG в примере #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Поиск цикла в графе", "Обнаружьте цикл в ориентированном графе для входа #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Кратчайший путь", "Найдите кратчайший путь в невзвешенном графе для теста #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Острова на карте", "Подсчитайте количество островов в матрице #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Зеркало дерева", "Постройте зеркальную копию дерева для кейса #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Правый вид дерева", "Верните правый вид бинарного дерева в сценарии #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Диаметр дерева", "Вычислите диаметр бинарного дерева для примера #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Trie автодополнение", "Реализуйте Trie и автодополнение для словаря #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Пути до листьев", "Сформируйте все пути от корня до листьев для дерева #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Компоненты связности", "Подсчитайте компоненты связности неориентированного графа для кейса #{n}.", DifficultyLevel.MEDIUM),
        ],
        "Алгоритмы и сложность": [
            TaskBlueprint("Бинарный поиск", "Реализуйте бинарный поиск и объясните сложность для случая #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Сортировка слиянием", "Реализуйте merge sort для набора #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Быстрая сортировка", "Реализуйте quick sort и обсудите худший случай на данных #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Поиск k-го", "Найдите k-й по величине элемент в задаче #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Жадный размен", "Минимизируйте число монет жадным подходом для кейса #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Планировщик интервалов", "Выберите максимум непересекающихся интервалов для теста #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Лестница ДП", "Посчитайте число способов подняться по лестнице для n=#{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Рюкзак 0/1", "Решите задачу 0/1 рюкзака для набора #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("LCS", "Найдите длину LCS для пар строк в примере #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Редакционное расстояние", "Вычислите edit distance для случая #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Жадная маршрутизация", "Постройте эвристический маршрут минимальной стоимости для кейса #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("Двоичное возведение", "Реализуйте быстрое возведение в степень для входа #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Двухпроходная оптимизация", "Примените двухпроходный алгоритм к массиву в задаче #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Сложность фрагмента", "Оцените асимптотику фрагмента кода из сценария #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Память алгоритма", "Сравните time/space trade-off для методов в примере #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Флойд для циклов", "Примените алгоритм Флойда для обнаружения цикла в тесте #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("DP по подстрокам", "Реализуйте ДП по подстрокам для задачи #{n}.", DifficultyLevel.HARD),
        ],
        "Python-синтаксис и практики": [
            TaskBlueprint("List comprehension", "Преобразуйте цикл в list comprehension для примера #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Dict comprehension", "Соберите словарь через comprehension в кейсе #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Работа с enumerate", "Используйте enumerate для решения задачи #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("zip и распаковка", "Обработайте параллельные коллекции через zip в тесте #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Срезы строк", "Реализуйте преобразования строк с помощью срезов в сценарии #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("defaultdict", "Перепишите агрегацию с использованием defaultdict для кейса #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Counter", "Подсчитайте частоты с Counter в задаче #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Генераторы", "Реализуйте ленивый генератор данных для примера #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Итераторы", "Создайте пользовательский итератор для кейса #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Декоратор времени", "Напишите декоратор измерения времени для функции #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Контекстный менеджер", "Реализуйте context manager для ресурса в тесте #{n}.", DifficultyLevel.HARD),
            TaskBlueprint("dataclass", "Опишите модель данных через dataclass для сценария #{n}.", DifficultyLevel.EASY),
            TaskBlueprint("Ошибки и исключения", "Организуйте обработку исключений в задаче #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("typing аннотации", "Добавьте корректные type hints для модуля #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("match/case", "Используйте конструкцию match/case в примере #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Функции высшего порядка", "Примените map/filter/reduce в кейсе #{n}.", DifficultyLevel.MEDIUM),
            TaskBlueprint("Асинхронный синтаксис", "Перепишите I/O код на async/await для сценария #{n}.", DifficultyLevel.HARD),
        ],
    }


def seed() -> None:
    category_created = 0
    category_skipped = 0
    task_created = 0
    task_skipped = 0

    blueprints = _build_blueprints()

    run_migrations()

    with SessionLocal() as session:
        existing_categories = {
            category.name: category
            for category in session.scalars(select(TaskCategory))
        }

        for category_seed in CATEGORIES:
            if category_seed.name in existing_categories:
                category_skipped += 1
                continue
            category = TaskCategory(
                name=category_seed.name,
                description=category_seed.description,
            )
            session.add(category)
            session.flush()
            existing_categories[category_seed.name] = category
            category_created += 1

        existing_task_keys = {
            (task.title, task.category_id)
            for task in session.scalars(select(Task))
        }

        for category_name, task_list in blueprints.items():
            category = existing_categories[category_name]
            for index, blueprint in enumerate(task_list, start=1):
                title = f"{blueprint.title_prefix} #{index}"
                statement = blueprint.statement_template.format(n=index)
                task_key = (title, category.id)
                if task_key in existing_task_keys:
                    task_skipped += 1
                    continue
                session.add(
                    Task(
                        title=title,
                        statement=statement,
                        difficulty=blueprint.difficulty,
                        category_id=category.id,
                    )
                )
                existing_task_keys.add(task_key)
                task_created += 1

        session.commit()

        total_categories = session.query(TaskCategory).count()
        total_tasks = session.query(Task).count()

    print(
        "Seed finished:",
        f"categories created={category_created}, skipped={category_skipped};",
        f"tasks created={task_created}, skipped={task_skipped};",
        f"total categories={total_categories}, total tasks={total_tasks}",
    )


if __name__ == "__main__":
    seed()

