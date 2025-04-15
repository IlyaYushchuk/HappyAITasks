import logging
import json
from app.openai_client.client import client
from app.analytics.amplitude import log_event
from app.config import settings

logger = logging.getLogger(__name__)

async def analyze_mood_from_photo(file_url: str, telegram_id: int) -> str:
    """
    Анализирует настроение человека на фото с помощью OpenAI Assistants API.
    """
    try:
        logger.info(f"Analyzing photo for telegram_id={telegram_id}, file_url={file_url}")
      
        thread = await client.beta.threads.create()
        thread_id = thread.id
        logger.debug(f"Created thread {thread_id} for photo analysis")

        await client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=[
                {"type": "text", "text": "Какое настроение у человека на этом фото? Опиши кратко."},
                {"type": "image_url", "image_url": {"url": file_url}},
            ]
        )

        run = await client.beta.threads.runs.create_and_poll(
            thread_id=thread_id,
            assistant_id=settings.assistant_id
        )

        if run.status == "completed":
            messages = await client.beta.threads.messages.list(thread_id=thread_id)
            mood = messages.data[0].content[0].text.value.strip()
            logger.info(f"Mood analysis completed for telegram_id={telegram_id}: {mood}")
            log_event(telegram_id, "photo_mood_analysis", {"mood": mood})
            return mood
        else:
            logger.error(f"Run failed with status {run.status} for telegram_id={telegram_id}")
            return "Не удалось определить настроение. Попробуй другое фото!"

    except Exception as e:
        logger.error(f"Error analyzing photo for telegram_id={telegram_id}: {e}")
        return "Не удалось определить настроение. Попробуй другое фото!"