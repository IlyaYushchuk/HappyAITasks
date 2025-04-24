import os
import requests
from dotenv import load_dotenv

# Загружаем переменные окружения из файла .env
load_dotenv()

# Получаем API-ключ из переменной окружения
API_KEY = os.getenv("NEXT_PUBLIC_ELEVENLABS_API_KEY")
if not API_KEY:
    raise ValueError("ELEVENLABS_API_KEY не найден в переменных окружения. Убедитесь, что он указан в файле .env")

# Базовый URL API ElevenLabs
BASE_URL = "https://api.elevenlabs.io/v1"

# Функция для проверки подписки (оставшихся токенов)
def check_subscription():
    url = f"{BASE_URL}/user/subscription"
    headers = {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Вызывает исключение для статус-кодов 4xx/5xx

        data = response.json()
        character_limit = data.get("character_limit", 0)
        character_count = data.get("character_count", 0)
        remaining_tokens = character_limit - character_count

        print(f"Общий лимит символов: {character_limit}")
        print(f"Использовано символов: {character_count}")
        print(f"Осталось символов: {remaining_tokens}")

        return remaining_tokens
    except requests.exceptions.RequestException as e:
        print(f"Ошибка при проверке подписки: {e}")
        return None

# Функция для тестового запроса на генерацию голоса
def test_voice_generation():
    url = f"{BASE_URL}/text-to-speech/21m00Tcm4TlvDq8ikWAM"  # Пример voice_id, замените на ваш
    headers = {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "text": "Привет, это тестовый запрос для проверки API ElevenLabs!",
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()

        # Сохраняем аудио в файл
        with open("test_output.mp3", "wb") as f:
            f.write(response.content)
        print("Тестовая генерация голоса прошла успешно! Аудио сохранено как test_output.mp3")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Ошибка при генерации голоса: {e}")
        return False

# Основная функция
def main():
    print("Проверка работоспособности API ElevenLabs...")
    print("-" * 50)

    # Шаг 1: Проверяем подписку
    remaining_tokens = check_subscription()
    if remaining_tokens is None:
        print("Не удалось проверить подписку. Завершаем выполнение.")
        return

    if remaining_tokens <= 0:
        print("Токены закончились! Генерация голоса невозможна.")
        return

    # Шаг 2: Пробуем сгенерировать голос
    if test_voice_generation():
        print("API ElevenLabs работает корректно!")
    else:
        print("Ошибка при тестировании API. Проверьте ключ, voice_id или лимиты токенов.")

if __name__ == "__main__":
    main()