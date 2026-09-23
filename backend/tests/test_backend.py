from __future__ import annotations

import asyncio
import copy
import datetime as dt
import json
import os
import random
import subprocess
import sys
import time
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
import main
import llm_explain
from data_loader import DatasetError, get_catalog, load_catalog, _validate_record
from filters import filter_catalog, summarize_no_match_reason
from ranking import rank_candidates

BASE = dict(city='Алматы', event_date='2026-11-14', event_type='свадьба', category='Фотограф', budget_kzt=300000, duration_hours=None, language=None)

@pytest.fixture
def client():
    with TestClient(main.app) as value:
        yield value

def profile(**changes):
    record = dict(id='test-a', anon_name='Тестовый профиль', city='Алматы', categories=['Фотограф'],
                  price_from_kzt=200000, event_formats=['свадьба'], languages=['русский'],
                  max_hours=6, busy_dates=[], description='Документальная съёмка с вниманием к деталям и эмоциям.',
                  synthetic=False, city_imputed=False, price_imputed=False)
    return {**record, **changes}

def with_catalog(monkeypatch, records):
    monkeypatch.setattr(main, 'get_catalog', lambda: copy.deepcopy(records))

def test_health_and_metadata(client):
    result = client.get('/health')
    assert result.status_code == 200
    assert result.json()['catalog_size'] == 69
    assert result.json()['explanation_mode'] == 'rules'
    assert len(client.get('/catalog/meta').json()['categories']) == 17
    assert client.get('/api/health').json() == result.json()

def test_success_and_contract(client):
    response = client.post('/search', json=BASE)
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'ok'
    assert [x['id'] for x in body['results']] == ['HK-91112', 'HK-76268', 'HK-68220']
    for card in body['results']:
        assert {'id','name','category','city','price_from_kzt','explanation','synthetic'} <= card.keys()
        assert card['explanation_source'] == 'rules'
        assert card['description']
        assert 'нет отметки о занятости' in card['explanation']
        assert 'цена от' in card['explanation']

def test_proxy_alias(client):
    assert client.post('/api/search', json=BASE).json() == client.post('/search', json=BASE).json()

def test_root_is_not_unexplained_404(client):
    response = client.get('/', follow_redirects=False)
    assert response.status_code in (200, 307)

@pytest.mark.parametrize('value', ['20261114', '2026-W46-6', '2026-11-31', '2026-09-22', '2027-01-01', '', '2026-11-14T00:00:00', 'tomorrow', '2026-13-01'])
def test_reject_invalid_dates(client, value):
    assert client.post('/search', json={**BASE, 'event_date': value}).status_code == 422

@pytest.mark.parametrize('value', ['2026-09-23', '2026-12-31', '2026-11-14'])
def test_calendar_boundaries(client, value):
    assert client.post('/search', json={**BASE, 'event_date': value}).status_code == 200

@pytest.mark.parametrize('field', ['budget_kzt','duration_hours'])
@pytest.mark.parametrize('value', [0, -1, 1.5, True, False, '300000', 9007199254740992])
def test_strict_positive_numbers(client, field, value):
    assert client.post('/search', json={**BASE, field:value}).status_code == 422

@pytest.mark.parametrize('field', ['city','event_type','category'])
@pytest.mark.parametrize('value', ['', '  ', 'x' * 101, None])
def test_required_text_validation(client, field, value):
    assert client.post('/search', json={**BASE, field:value}).status_code == 422

def test_unknown_fields_not_silently_ignored(client):
    assert client.post('/search', json={**BASE, 'budjet':1000}).status_code == 422

def test_alias_and_whitespace(client):
    original = client.post('/search', json=BASE).json()
    assert client.post('/search', json={**BASE, 'event_type':' WEDDING ', 'language':'  ', 'city':' Алматы '}).json() == original

def test_language_normalization(client):
    a = client.post('/search', json={**BASE,'language':'Русский '}).json()
    b = client.post('/search', json={**BASE,'language':'русский'}).json()
    assert a == b

@pytest.mark.parametrize('changes,reason', [
    ({'busy_dates':[BASE['event_date']]},'занят на эту дату'),
    ({'price_from_kzt':300001},'выше бюджета'),
    ({'event_formats':['корпоратив']},'такой формат'),
    ({'languages':['казахский']},'нужном языке'),
    ({'max_hours':3},'длительность'),
])
def test_each_filter(client,monkeypatch,changes,reason):
    with_catalog(monkeypatch,[profile(**changes)])
    response=client.post('/search',json={**BASE,'duration_hours':4,'language':'русский'}).json()
    assert response['status']=='no_match'
    assert not response['results']
    assert reason in response['message']

def test_no_category_is_distinct(client,monkeypatch):
    with_catalog(monkeypatch,[profile(city='Астана')])
    body=client.post('/search',json=BASE).json()
    assert body['status']=='no_category' and body['message']

def test_foreign_profiles_not_added(monkeypatch,client):
    with_catalog(monkeypatch,[profile(id='foreign',city='Зарубежье'),profile(id='local')])
    assert [x['id'] for x in client.post('/search',json=BASE).json()['results']]==['local']

def test_null_duration_limit_and_exact_boundaries(client,monkeypatch):
    with_catalog(monkeypatch,[profile(id='a',max_hours=None,price_from_kzt=300000), profile(id='b',max_hours=6,price_from_kzt=300000)])
    result=client.post('/search',json={**BASE,'duration_hours':6}).json()
    assert len(result['results'])==2
    result=client.post('/search',json={**BASE,'duration_hours':7}).json()
    assert [x['id'] for x in result['results']]==['a']

def test_less_than_three_explains_why(client,monkeypatch):
    with_catalog(monkeypatch,[profile(),profile(id='b',busy_dates=[BASE['event_date']])])
    result=client.post('/search',json=BASE).json()
    assert len(result['results'])==1
    assert '1 из 2' in result['message'] and 'занят' in result['message']

def test_small_catalog_is_not_padded(client,monkeypatch):
    with_catalog(monkeypatch,[profile()])
    result=client.post('/search',json=BASE).json()
    assert len(result['results'])==1
    assert 'Это все профили' in result['message']

def test_rare_demo_flags(client):
    result=client.post('/search',json={**BASE,'category':'Флорист','budget_kzt':350000}).json()
    assert result['status']=='ok' and result['message']
    assert result['results'][0]['synthetic'] is True

def test_identical_requests_have_identical_order(client):
    outputs=[client.post('/search',json=BASE).json() for _ in range(5)]
    assert all(body==outputs[0] for body in outputs)

def test_different_dates_change_recommendations(client):
    a=client.post('/search',json=BASE).json()
    b=client.post('/search',json={**BASE,'event_date':'2026-11-15'}).json()
    assert [x['id'] for x in a['results']] != [x['id'] for x in b['results']]

def test_rank_ties_use_id_not_input_order():
    items=[profile(id='c'),profile(id='b'),profile(id='a'),profile(id='d')]
    assert [rec['id'] for rec,_ in rank_candidates(items,BASE)]==['a','b','c','d']

def test_budget_closeness_order_without_bonus():
    items=[profile(id='c',price_from_kzt=100000),profile(id='b',price_from_kzt=299999),profile(id='a',price_from_kzt=250000)]
    assert [rec['id'] for rec,_ in rank_candidates(items,BASE)]==['b','a','c']

def test_all_catalog_busy_dates_are_excluded():
    for rec in get_catalog():
        for date in rec['busy_dates']:
            query={**BASE,'city':rec['city'],'category':rec['categories'][0],'event_type':rec['event_formats'][0],
                   'budget_kzt':max(rec['price_from_kzt'],1),'event_date':date}
            assert filter_catalog([rec],query)['status']=='no_match'

def test_seeded_queries_never_return_an_invalid_candidate(client):
    catalog=get_catalog(); by_id={rec['id']:rec for rec in catalog}; rng=random.Random(79)
    for _ in range(150):
        sample=rng.choice(catalog)
        query={**BASE,'city':sample['city'],'category':rng.choice(sample['categories']),
               'event_type':rng.choice(['свадьба','той','корпоратив','конференция','юбилей','день рождения']),
               'event_date':(dt.date(2026,9,23)+dt.timedelta(days=rng.randrange(100))).isoformat(),
               'budget_kzt':rng.choice([1000,200000,300000,1000000,10000000]),
               'duration_hours':rng.choice([None,3,7,12]),'language':rng.choice([None,'русский','казахский','английский'])}
        response=client.post('/search',json=query)
        assert response.status_code==200
        cards=response.json()['results'];assert len(cards)<=3
        for card in cards:
            rec=by_id[card['id']]
            assert not filter_catalog([rec],query)['fail_reasons']
            assert filter_catalog([rec],query)['status']=='ok'

@pytest.mark.parametrize('change', [
    {'id':None}, {'categories':'Фотограф'}, {'event_formats':[]}, {'languages':None},
    {'price_from_kzt':True}, {'price_from_kzt':-1}, {'max_hours':-1}, {'synthetic':'false'},
    {'busy_dates':['20261114']}, {'busy_dates':['2026-11-31']}, {'busy_dates':['2027-01-01']},
    {'description':{}},
])
def test_bad_profiles_are_rejected(change):
    with pytest.raises(DatasetError):
        _validate_record(profile(**change),'test')

@pytest.mark.parametrize('value',[None,[],5,'bad'])
def test_not_object_profile(value):
    with pytest.raises(DatasetError): _validate_record(value,'test')

def test_missing_calendar_is_not_assumed_free():
    rec=profile();del rec['busy_dates']
    with pytest.raises(DatasetError): _validate_record(rec,'test')

def test_duplicate_ids_in_main_dataset_rejected(tmp_path):
    file=tmp_path/'catalog.jsonl';file.write_text('\n'.join(json.dumps(profile()) for _ in range(2)))
    with pytest.raises(DatasetError,match='Дублирующийся'):
        load_catalog(file,tmp_path/'missing.jsonl')

def test_corrupt_json_and_empty_file(tmp_path):
    file=tmp_path/'catalog.jsonl';file.write_text('{broken')
    with pytest.raises(DatasetError):load_catalog(file,tmp_path/'none.jsonl')
    file.write_text('')
    with pytest.raises(DatasetError):load_catalog(file,tmp_path/'none.jsonl')

def test_dataset_failure_is_503_without_path_leak(client,monkeypatch):
    def failure():raise DatasetError('/private/secret/dataset')
    monkeypatch.setattr(main,'get_catalog',failure)
    for response in [client.get('/health'),client.post('/search',json=BASE)]:
        assert response.status_code==503
        assert '/private/' not in response.text

def test_offline_explanations_are_profile_specific():
    a=llm_explain.generate_explanation(profile(description='Репортажные кадры и естественное освещение на камерных событиях.'),BASE)
    b=llm_explain.generate_explanation(profile(description='Студийные портреты и постановочные фотографии в большом зале.'),BASE)
    assert a!=b and 'Репортажные' in a and 'Студийные' in b
    assert 'отличный выбор' not in a and 'цена от' in a

def test_determinism_across_hash_seeds():
    code='from filters import summarize_no_match_reason; print(summarize_no_match_reason({"a":["budget","busy_date"],"b":["busy_date","budget"]}))'
    outputs=[]
    for seed in ('1','101'):
        env={**os.environ,'PYTHONHASHSEED':seed,'PYTHONPATH':str(Path(main.__file__).parent)}
        outputs.append(subprocess.check_output([sys.executable,'-c',code],env=env))
    assert outputs[0]==outputs[1]

def test_openai_error_falls_back_without_paid_call(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY','test-not-a-real-key')
    def fail(**kwargs):raise RuntimeError('Simulated outage')
    monkeypatch.setitem(sys.modules,'openai',SimpleNamespace(OpenAI=fail))
    text,source=llm_explain._generate_with_source(profile(),BASE)
    assert source=='fallback' and 'нет отметки' in text

def test_openai_success_sets_source_and_disables_retries(monkeypatch):
    captured={}
    class FakeClient:
        def __init__(self,**kwargs):captured.update(kwargs);self.chat=SimpleNamespace(completions=SimpleNamespace(create=self.create))
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def create(self,**kwargs):
            captured.update(kwargs)
            return SimpleNamespace(choices=[SimpleNamespace(finish_reason='stop',message=SimpleNamespace(content='Цена от 200 000 ₸ соответствует бюджету. Документальная съёмка указана в профиле.'))])
    monkeypatch.setenv('OPENAI_API_KEY','test-not-a-real-key');monkeypatch.setitem(sys.modules,'openai',SimpleNamespace(OpenAI=FakeClient))
    text,source=llm_explain._generate_with_source(profile(),BASE)
    assert source=='openai' and text
    assert captured['max_retries']==0 and captured['timeout']==4.5
    assert captured['max_completion_tokens']==250

def test_slow_llm_does_not_hold_response_until_remote_completion(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY','test-not-a-real-key')
    monkeypatch.setattr(llm_explain,'EXPLANATION_DEADLINE_SECONDS',0.03)
    def slow(*args):time.sleep(.2);return ('late','openai')
    monkeypatch.setattr(llm_explain,'_generate_with_source',slow)
    async def check():
        start=time.perf_counter();text,source=await llm_explain.generate_explanation_async(profile(),BASE)
        assert time.perf_counter()-start<.15
        assert source=='fallback' and 'нет отметки' in text
    asyncio.run(check())

def test_parallel_explanations_preserve_ranking(client,monkeypatch):
    with_catalog(monkeypatch,[profile(id='a'),profile(id='b'),profile(id='c')])
    async def fake(rec,reasons):
        assert {'language','duration_hours','category'} <= reasons.keys()
        await asyncio.sleep({'a':.03,'b':.01,'c':.02}[rec['id']])
        return ('Тестовое объяснение без обращения к модели.','rules')
    monkeypatch.setattr(main,'generate_explanation_async',fake)
    assert [x['id'] for x in client.post('/search',json=BASE).json()['results']]==['a','b','c']

def test_cors_allows_local_but_not_arbitrary_external_origins(client):
    headers={'Origin':'http://localhost:4173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type'}
    assert client.options('/search',headers=headers).status_code==200
    headers['Origin']='https://not-allowed.invalid'
    assert client.options('/search',headers=headers).status_code==400

def test_built_site_mount_preserves_api_and_javascript_mime(tmp_path):
    """Static route integration with a tiny fixture, NOT a real Vite build."""
    import shutil
    import subprocess
    import sys
    from pathlib import Path
    source_backend = Path(__file__).resolve().parents[1]
    project = tmp_path / 'single-server'
    shutil.copytree(source_backend, project / 'backend', ignore=shutil.ignore_patterns('__pycache__', '.venv', '.env', 'tests'))
    dist = project / 'frontend' / 'dist'
    (dist / 'assets').mkdir(parents=True)
    (dist / 'index.html').write_text('<!doctype html><html><body>Static fixture</body></html>', encoding='utf-8')
    (dist / 'assets' / 'app.js').write_text('export {};', encoding='utf-8')
    probe = '''
from fastapi.testclient import TestClient
from main import app
with TestClient(app) as client:
    response=client.get('/')
    assert response.status_code==200 and 'Static fixture' in response.text
    js=client.get('/assets/app.js')
    assert js.status_code==200 and 'javascript' in js.headers['content-type']
    assert client.get('/api/health').json()['catalog_size']==69
    assert client.get('/openapi.json').status_code==200
    assert client.post('/api/search', json={'city':'Алматы','event_date':'2026-11-14','event_type':'свадьба','category':'Фотограф','budget_kzt':300000}).json()['status']=='ok'
'''
    result = subprocess.run([sys.executable, '-c', probe], cwd=project / 'backend', capture_output=True, text=True, timeout=15)
    assert result.returncode == 0, result.stdout + result.stderr
