from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class NodeDetailRequest(BaseModel):
    node_id: str


class SoarPlaybookRequest(BaseModel):
    playbook: str
    params: dict = {}
