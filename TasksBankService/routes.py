"""HTTP-маршруты CRUD для категорий и задач."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import crud
from database import get_db
from jwt_auth import CurrentUser, require_roles
from models import DifficultyLevel
from schemas import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    TaskCreate,
    TaskRead,
    TaskUpdate,
)

router = APIRouter()

require_staff_read = require_roles("HR", "INTERVIEWER")
require_bank_write = require_roles("HR")


@router.post("/api/v1/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED, tags=["Categories"])
def create_category(
    payload: CategoryCreate,
    session: Session = Depends(get_db),
    _: CurrentUser = Depends(require_bank_write),
):
    try:
        return crud.create_category(session, payload)
    except IntegrityError as exc:
        _raise_conflict_if_unique_violation(exc, "Category with this name already exists")
        raise


@router.get("/api/v1/categories", response_model=list[CategoryRead], tags=["Categories"])
def list_categories(
    session: Session = Depends(get_db),
    _: CurrentUser = Depends(require_staff_read),
):
    return crud.list_categories(session)


@router.get("/api/v1/categories/{category_id}", response_model=CategoryRead, tags=["Categories"])
def get_category(
    category_id: int,
    session: Session = Depends(get_db),
    _: CurrentUser = Depends(require_staff_read),
):
    category = crud.get_category(session, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.patch("/api/v1/categories/{category_id}", response_model=CategoryRead, tags=["Categories"])
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    session: Session = Depends(get_db),
    _: CurrentUser = Depends(require_bank_write),
):
    category = crud.get_category(session, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    try:
        return crud.update_category(session, category, payload)
    except IntegrityError as exc:
        _raise_conflict_if_unique_violation(exc, "Category with this name already exists")
        raise


@router.delete("/api/v1/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, tags=["Categories"])
def delete_category(
    category_id: int,
    session: Session = Depends(get_db),
    _: CurrentUser = Depends(require_bank_write),
):
    category = crud.get_category(session, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    try:
        crud.delete_category(session, category)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category cannot be deleted while tasks are attached",
        ) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/api/v1/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED, tags=["Tasks"])
def create_task(
    payload: TaskCreate,
    session: Session = Depends(get_db),
    _: CurrentUser = Depends(require_bank_write),
):
    try:
        return crud.create_task(session, payload)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task references a non-existent category",
        ) from None


@router.get("/api/v1/tasks", response_model=list[TaskRead], tags=["Tasks"])
def list_tasks(
    difficulty: DifficultyLevel | None = Query(default=None),
    category_id: int | None = Query(default=None, ge=1),
    session: Session = Depends(get_db),
    _: CurrentUser = Depends(require_staff_read),
):
    return crud.list_tasks(session, difficulty=difficulty, category_id=category_id)


@router.get("/api/v1/tasks/{task_id}", response_model=TaskRead, tags=["Tasks"])
def get_task(
    task_id: int,
    session: Session = Depends(get_db),
    _: CurrentUser = Depends(require_staff_read),
):
    task = crud.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.patch("/api/v1/tasks/{task_id}", response_model=TaskRead, tags=["Tasks"])
def update_task(
    task_id: int,
    payload: TaskUpdate,
    session: Session = Depends(get_db),
    _: CurrentUser = Depends(require_bank_write),
):
    task = crud.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    try:
        return crud.update_task(session, task, payload)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task references a non-existent category",
        ) from None


@router.delete("/api/v1/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, tags=["Tasks"])
def delete_task(
    task_id: int,
    session: Session = Depends(get_db),
    _: CurrentUser = Depends(require_bank_write),
):
    task = crud.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    crud.delete_task(session, task)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _raise_conflict_if_unique_violation(exc: IntegrityError, detail: str) -> None:
    original = str(exc.orig).lower()
    if "duplicate key value" in original or "unique constraint" in original:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from None
