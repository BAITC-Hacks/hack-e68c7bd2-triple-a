import sys
from pathlib import Path
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

@pytest.fixture(autouse=True)
def no_paid_api(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
