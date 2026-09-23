"""
Детерминированное ранжирование прошедших фильтр кандидатов.

Правила (из ТЗ):
- чем ближе price_from_kzt к budget_kzt снизу — тем выше (цена не может быть
  выше бюджета, это уже гарантировано фильтром)
- бонус, если язык совпадает
- бонус, если в description есть релевантные слова запроса
- при равенстве очков — сортировать по id (стабильность)

Никакого ML/LLM здесь нет — только арифметика, чтобы порядок был
воспроизводимым и объяснимым жюри.
"""

from __future__ import annotations

import re
from typing import Any

LANGUAGE_BONUS = 0.15
KEYWORD_BONUS_PER_HIT = 0.05
MAX_KEYWORD_BONUS = 0.2

_WORD_RE = re.compile(r"[a-zA-Zа-яА-ЯёЁ0-9]+")


def _tokenize(text: str) -> set[str]:
    return {w.lower() for w in _WORD_RE.findall(text) if len(w) > 2}


# служебные слова запроса, которые не несут смысла для keyword-бонуса
_STOPWORDS = {"для", "мероприятия", "мероприятие", "событие", "события"}


def _query_keywords(query: dict[str, Any]) -> set[str]:
    parts = [query.get("event_type", ""), query.get("category", "")]
    kws = set()
    for p in parts:
        kws |= _tokenize(p)
    return kws - _STOPWORDS


def price_score(price_from_kzt: int, budget_kzt: int) -> float:
    """1.0 = цена равна бюджету (максимально близко снизу), 0.0 = цена сильно ниже бюджета."""
    if budget_kzt <= 0:
        return 0.0
    return max(0.0, min(1.0, price_from_kzt / budget_kzt))


def score_candidate(rec: dict[str, Any], query: dict[str, Any]) -> tuple[float, dict[str, Any]]:
    """Возвращает (score, breakdown) — breakdown нужен для explanation/дебага."""
    breakdown: dict[str, Any] = {}

    p_score = price_score(rec["price_from_kzt"], query["budget_kzt"])
    breakdown["price_score"] = round(p_score, 4)
    total = p_score

    language = query.get("language")
    language_match = bool(language and language in (rec.get("languages") or []))
    breakdown["language_match"] = language_match
    if language_match:
        total += LANGUAGE_BONUS

    keywords = _query_keywords(query)
    description_tokens = _tokenize(rec.get("description", ""))
    hits = sorted(keywords & description_tokens)
    breakdown["keyword_hits"] = hits
    keyword_bonus = min(MAX_KEYWORD_BONUS, len(hits) * KEYWORD_BONUS_PER_HIT)
    total += keyword_bonus

    breakdown["total_score"] = round(total, 4)
    return total, breakdown


def rank_candidates(
    candidates: list[dict[str, Any]], query: dict[str, Any]
) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    """
    Возвращает список (профиль, breakdown), отсортированный по убыванию score,
    при равенстве — по возрастанию id (детерминизм).
    """
    scored = []
    for rec in candidates:
        score, breakdown = score_candidate(rec, query)
        scored.append((rec, score, breakdown))

    scored.sort(key=lambda item: (-item[1], item[0]["id"]))
    return [(rec, breakdown) for rec, _score, breakdown in scored]
