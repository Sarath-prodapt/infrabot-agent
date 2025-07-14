from pydantic import BaseModel, Field # type: ignore
from typing import List

class Message(BaseModel):
    role: str  # e.g., "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    history: List[Message] = Field(default_factory=list, description="List of chat messages with roles")
    latest_question: str = Field(..., description="Latest user question")

class ChatResponse(BaseModel):
    answer: str
    standalone_question: str