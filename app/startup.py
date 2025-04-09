from app.openai_client.client import init_assistant
from app.config import settings

async def initialize():
    assistant_id = await init_assistant()
    settings.assistant_id = assistant_id
    print(f"Ассистент инициализирован с ID: {assistant_id}")