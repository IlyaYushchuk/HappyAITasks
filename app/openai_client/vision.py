import logging
from app.openai_client.client import client

logger = logging.getLogger(__name__)

async def analyze_mood_from_photo(file_url: str, telegram_id: int) -> str:
    """
    Анализирует настроение человека на фото с помощью OpenAI Vision API.
    """
    try:
        logger.info(f"Analyzing photo for telegram_id={telegram_id}")
        response = await client.chat.completions.create(
            model="gpt-4o",  
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Какое настроение у человека на этом фото? Опиши кратко."},
                        {"type": "image_url", "image_url": {"url": file_url}},
                    ],
                }
            ],
            max_tokens=100
        )
        mood = response.choices[0].message.content.strip()
        return f"На фото ты выглядишь: {mood}"
    except Exception as e:
        logger.error(f"Error analyzing photo for telegram_id={telegram_id}: {e}")
        return "Не удалось определить настроение. Попробуй другое фото!"