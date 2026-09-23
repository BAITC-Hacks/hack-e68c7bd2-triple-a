"""
FastAPI-сервис "умный подбор подрядчиков".

Запуск:
    uvicorn main:app --reload

Эндпоинт: POST /search — см. README.md за примером запроса/ответа.
"""

from __future__ import annotations

import datetime as dt
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from data_loader import DatasetError, get_catalog
from filters import filter_catalog, summarize_no_match_reason
from llm_explain import generate_explanation
from ranking import rank_candidates

app = FastAPI(title="Умный подбор подрядчиков", version="1.0.0")

# На хакатоне фронт обычно крутится на другом порту/деве — открываем CORS полностью.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_RESULTS = 3


class SearchRequest(BaseModel):
    city: str
    event_date: str = Field(..., description="YYYY-MM-DD")
    event_type: str
    category: str
    budget_kzt: int = Field(..., gt=0)
    duration_hours: Optional[int] = Field(default=None, gt=0)
    language: Optional[str] = None

    @field_validator("event_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            parsed = dt.date.fromisoformat(v)
        except ValueError as e:
            raise ValueError("event_date должен быть в формате YYYY-MM-DD") from e
        min_date = dt.date(2026, 9, 23)
        max_date = dt.date(2026, 12, 31)
        if not (min_date <= parsed <= max_date):
            raise ValueError(
                "event_date должен быть в диапазоне 2026-09-23 — 2026-12-31 "
                "(границы календаря датасета)"
            )
        return v

    @field_validator("city", "event_type", "category")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("поле не может быть пустым")
        return v.strip()


class ContractorCard(BaseModel):
    id: str
    name: str
    category: str
    city: str
    price_from_kzt: int
    explanation: str
    synthetic: bool


class SearchResponse(BaseModel):
    status: str  # "ok" | "no_category" | "no_match"
    message: Optional[str] = None
    results: list[ContractorCard]


@app.get("/health")
def health():
    try:
        catalog = get_catalog()
        return {"status": "ok", "catalog_size": len(catalog)}
    except DatasetError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest) -> SearchResponse:
    try:
        catalog = get_catalog()
    except DatasetError as e:
        raise HTTPException(status_code=500, detail=f"Ошибка датасета: {e}") from e

    query = req.model_dump()

    result = filter_catalog(catalog, query)

    if result["status"] == "no_category":
        return SearchResponse(
            status="no_category",
            message=(
                f"В городе «{req.city}» в каталоге нет категории «{req.category}». "
                f"Попробуйте другой город или категорию."
            ),
            results=[],
        )

    if result["status"] == "no_match":
        return SearchResponse(
            status="no_match",
            message=summarize_no_match_reason(result["fail_reasons"]),
            results=[],
        )

    # status == "ok"
    ranked = rank_candidates(result["candidates"], query)[:MAX_RESULTS]

    cards = []
    for rec, breakdown in ranked:
        match_reasons = {
            "city": req.city,
            "event_date": req.event_date,
            "event_type": req.event_type,
            "budget_kzt": req.budget_kzt,
            "price_score": breakdown["price_score"],
            "language_match": breakdown["language_match"],
            "keyword_hits": breakdown["keyword_hits"],
        }
        explanation = generate_explanation(rec, match_reasons)
        cards.append(
            ContractorCard(
                id=rec["id"],
                name=rec["anon_name"],
                category=req.category,
                city=rec["city"],
                price_from_kzt=rec["price_from_kzt"],
                explanation=explanation,
                synthetic=rec.get("synthetic", False),
            )
        )

    return SearchResponse(status="ok", message=None, results=cards)
