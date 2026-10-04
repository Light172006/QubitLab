from pydantic import BaseModel
from typing import Optional

class ProgressOverview(BaseModel):
    lessons_completed: int
    total_lessons: int
    challenges_solved: int
    total_challenges: int
    total_points: int
    current_streak: int = 0

class SkillScore(BaseModel):
    skill_name: str
    score: float  # 0-100

class SkillBreakdownResponse(BaseModel):
    skills: list[SkillScore]
