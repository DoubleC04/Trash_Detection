from pydantic import BaseModel

class AnalyzeRequest(BaseModel):
    image: str
    model: str