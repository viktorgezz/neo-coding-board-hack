"""CRUD-операции банка задач."""

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models import DifficultyLevel, Task, TaskCategory
from schemas import CategoryCreate, CategoryUpdate, TaskCreate, TaskUpdate


def create_category(session: Session, payload: CategoryCreate) -> TaskCategory:
    category = TaskCategory(name=payload.name, description=payload.description)
    session.add(category)
    _commit(session)
    session.refresh(category)
    return category


def list_categories(session: Session) -> list[TaskCategory]:
    return list(session.scalars(select(TaskCategory).order_by(TaskCategory.id)))


def get_category(session: Session, category_id: int) -> TaskCategory | None:
    return session.get(TaskCategory, category_id)


def update_category(session: Session, category: TaskCategory, payload: CategoryUpdate) -> TaskCategory:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    _commit(session)
    session.refresh(category)
    return category


def delete_category(session: Session, category: TaskCategory) -> None:
    session.delete(category)
    _commit(session)


def create_task(session: Session, payload: TaskCreate) -> Task:
    task = Task(**payload.model_dump())
    session.add(task)
    _commit(session)
    session.refresh(task)
    return task


def list_tasks(
    session: Session,
    *,
    difficulty: DifficultyLevel | None = None,
    category_id: int | None = None,
) -> list[Task]:
    query: Select[tuple[Task]] = select(Task).order_by(Task.id)
    if difficulty is not None:
        query = query.where(Task.difficulty == difficulty)
    if category_id is not None:
        query = query.where(Task.category_id == category_id)
    return list(session.scalars(query))


def get_task(session: Session, task_id: int) -> Task | None:
    return session.get(Task, task_id)


def update_task(session: Session, task: Task, payload: TaskUpdate) -> Task:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    _commit(session)
    session.refresh(task)
    return task


def delete_task(session: Session, task: Task) -> None:
    session.delete(task)
    _commit(session)


def _commit(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise
