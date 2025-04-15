import logging
from concurrent.futures import ThreadPoolExecutor
from amplitude import Amplitude, BaseEvent
from app.config import settings

logger = logging.getLogger(__name__)

# Создаём единый ThreadPoolExecutor
executor = ThreadPoolExecutor(max_workers=4)  # 4 потока для аналитики

# Инициализация Amplitude клиента
amplitude_client = Amplitude(settings.amplitude_api_key)

def log_event(telegram_id: int, event_type: str, event_properties: dict = None):
    """
    Логирует событие в Amplitude в отдельном потоке.
    """
    event = BaseEvent(
        event_type=event_type,
        user_id=str(telegram_id),
        event_properties=event_properties or {}
    )
    
    def sync_log_event():
        """Синхронная функция для отправки события."""
        try:
            amplitude_client.log_event(event)
            logger.info(f"Logged event: {event_type} for user {telegram_id}")
        except Exception as e:
            logger.error(f"Failed to log event {event_type}: {e}")

    # Отправляем задачу в пул потоков
    executor.submit(sync_log_event)