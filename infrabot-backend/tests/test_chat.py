from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_chat_health():
    resp = client.post("/chat", json={"user": "test", "message": "ping"})
    assert resp.status_code == 200