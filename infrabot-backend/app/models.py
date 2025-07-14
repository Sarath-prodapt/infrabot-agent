from pydantic import BaseModel, Field
from typing import List, Dict

class ChatResponse(BaseModel):
    answer: str
    context: List[Dict]
