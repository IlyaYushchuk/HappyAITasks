from config import settings
from openai_client import init_assistant, client

async def initialize():
    if settings.assistant_id == "":
        settings.assistant_id = await init_assistant()
    print(f"Assistant initiated with ID: {settings.assistant_id}")