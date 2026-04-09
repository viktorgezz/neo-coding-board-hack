"""Pydantic-схемы API банка задач."""

from pydantic import BaseModel, ConfigDict, Field

from models import DifficultyLevel


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = None


class CategoryRead(CategoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=256)
    statement: str = Field(min_length=1)
    difficulty: DifficultyLevel
    category_id: int = Field(ge=1)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=256)
    statement: str | None = Field(default=None, min_length=1)
    difficulty: DifficultyLevel | None = None
    category_id: int | None = Field(default=None, ge=1)


class TaskRead(TaskBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
