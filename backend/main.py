"""Shabyt API. Run from project root: python -m uvicorn main:app --app-dir backend."""
from __future__ import annotations

import asyncio
import datetime as dt
import logging
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

# Explicit path: .env also works when launched from the repository root.
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env', override=False)

from data_loader import DatasetError, MAX_SAFE_INT, MIN_DATE, MAX_DATE, get_catalog
from filters import filter_catalog, summarize_no_match_reason, summarize_failure_counts
from llm_explain import ExplanationSource, generate_explanation_async
from ranking import rank_candidates

logger = logging.getLogger(__name__)
MAX_RESULTS = 3

@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        get_catalog()
    except DatasetError:
        logger.error('Catalog unavailable. Check the data files; API will return 503.')
    yield

app = FastAPI(title='Shabyt — подбор подрядчиков', version='2.0.0', lifespan=lifespan)
origins = [value.strip() for value in os.getenv('CORS_ORIGINS', '').split(',') if value.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins,
                   allow_origin_regex=r'https?://(localhost|127\.0\.0\.1)(:\d+)?',
                   allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])

class SearchRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    city: str = Field(min_length=1, max_length=100)
    event_date: str = Field(description='YYYY-MM-DD, 2026-09-23 — 2026-12-31')
    event_type: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=100)
    budget_kzt: int = Field(gt=0, le=MAX_SAFE_INT, strict=True)
    duration_hours: int | None = Field(default=None, gt=0, le=MAX_SAFE_INT, strict=True)
    language: str | None = Field(default=None, max_length=100)

    @field_validator('event_date')
    @classmethod
    def validate_date(cls, value: str) -> str:
        # date.fromisoformat also accepts YYYYMMDD and ISO week dates. Those would
        # bypass string equality against busy_dates if the raw input was retained.
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
            raise ValueError('Дата должна быть строго в формате YYYY-MM-DD')
        try:
            dt.date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError('Несуществующая календарная дата') from exc
        if not MIN_DATE <= value <= MAX_DATE:
            raise ValueError(f'Дата должна быть в диапазоне {MIN_DATE} — {MAX_DATE}')
        return value

    @field_validator('city', 'event_type', 'category')
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Поле не может быть пустым')
        return value.strip()

    @field_validator('event_type')
    @classmethod
    def normalize_event(cls, value: str) -> str:
        aliases = {'wedding': 'свадьба', 'corporate': 'корпоратив', 'conference': 'конференция',
                   'birthday': 'день рождения', 'anniversary': 'юбилей', 'toi': 'той'}
        return aliases.get(value.lower(), value.lower())

    @field_validator('language')
    @classmethod
    def normalize_language(cls, value: str | None) -> str | None:
        return value.strip().lower() or None if value is not None else None

class ContractorCard(BaseModel):
    id: str
    name: str
    category: str
    city: str
    price_from_kzt: int
    explanation: str
    synthetic: bool
    description: str = ''
    languages: list[str] = Field(default_factory=list)
    max_hours: int | None = None
    explanation_source: ExplanationSource = 'rules'
    price_imputed: bool = False
    city_imputed: bool = False

class SearchResponse(BaseModel):
    status: Literal['ok', 'no_category', 'no_match']
    message: str | None = None
    results: list[ContractorCard]

def _catalog():
    try:
        return get_catalog()
    except DatasetError as exc:
        # Hide server paths and malformed record contents from public errors.
        raise HTTPException(status_code=503, detail='Каталог временно недоступен. Проверьте файлы данных на сервере.') from exc

@app.get('/api/health', include_in_schema=False)
@app.get('/health')
def health():
    return {'status': 'ok', 'catalog_size': len(_catalog()),
            'explanation_mode': 'openai_with_fallback' if os.getenv('OPENAI_API_KEY', '').strip() else 'rules',
            'calendar': {'from': MIN_DATE, 'to': MAX_DATE}}

@app.get('/api/catalog/meta', include_in_schema=False)
@app.get('/catalog/meta')
def catalog_meta():
    catalog = _catalog()
    return {'size': len(catalog), 'categories': sorted({cat for rec in catalog for cat in rec['categories']}),
            'cities': sorted({rec['city'] for rec in catalog}), 'calendar': {'from': MIN_DATE, 'to': MAX_DATE}}

@app.post('/api/search', response_model=SearchResponse, include_in_schema=False)
@app.post('/search', response_model=SearchResponse)
async def search(req: SearchRequest) -> SearchResponse:
    query = req.model_dump()
    result = filter_catalog(_catalog(), query)
    if result['status'] == 'no_category':
        return SearchResponse(status='no_category', results=[], message=f'В городе «{req.city}» в каталоге нет категории «{req.category}». Попробуйте другой город или категорию.')
    if result['status'] == 'no_match':
        return SearchResponse(status='no_match', results=[], message=summarize_no_match_reason(result['fail_reasons']))

    ranked = rank_candidates(result['candidates'], query)[:MAX_RESULTS]
    async def make_card(rec, breakdown):
        match_reasons = {**query, 'price_score': breakdown['price_score'],
                         'language_match': breakdown['language_match'], 'keyword_hits': breakdown['keyword_hits']}
        explanation, source = await generate_explanation_async(rec, match_reasons)
        return ContractorCard(id=rec['id'], name=rec['anon_name'], category=req.category,
                              city=rec['city'], price_from_kzt=rec['price_from_kzt'], explanation=explanation,
                              synthetic=rec['synthetic'], description=rec['description'], languages=rec['languages'],
                              max_hours=rec['max_hours'], explanation_source=source,
                              price_imputed=rec['price_imputed'], city_imputed=rec['city_imputed'])
    # gather keeps input order even when remote explanation requests finish out of order.
    cards = await asyncio.gather(*(make_card(rec, details) for rec, details in ranked))
    message = None
    if len(cards) < MAX_RESULTS:
        total = len(result['candidates']) + len(result['fail_reasons'])
        message = f'По вашим условиям подходят {len(cards)} из {total} профилей этой категории в городе.'
        if result['fail_reasons']:
            message += ' Среди остальных: ' + summarize_failure_counts(result['fail_reasons']) + '.'
        else:
            message += ' Это все профили данной категории в этом городе — не добавляем случайные варианты ради трёх карточек.'
    return SearchResponse(status='ok', message=message, results=cards)

# After npm run build, one FastAPI process can serve both the site and API.
# /api/search is deliberately registered before the static mount.
DIST_DIR = BASE_DIR.parent / 'frontend' / 'dist'
if (DIST_DIR / 'index.html').is_file():
    app.mount('/', StaticFiles(directory=DIST_DIR, html=True), name='site')
else:
    @app.get('/', include_in_schema=False)
    def root():
        return RedirectResponse('/docs')
