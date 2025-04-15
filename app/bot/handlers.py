from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from app.config import settings
from app.bot.voice_handler import handle_voice_message
from app.openai_client.client import process_assistant_response
from app.bot.states import ValueState
from app.analytics.amplitude import log_event
from app.analytics.amplitude import executor
from app.bot.photo_handler import handle_photo_message
from app.openai_client.vision import analyze_mood_from_photo

import logging
logger = logging.getLogger(__name__)

bot = Bot(token=settings.telegram_token)
dp = Dispatcher()

async def on_startup(_):
     print(f"Ассистент инициализирован с ID: {settings.assistant_id}")

async def on_shutdown(_):
    await bot.close()
    await dp.storage.close()
    executor.shutdown(wait=True)

async def start_command(message: types.Message, state: FSMContext):
    await message.reply("Привет! Отправь мне голосовое сообщение или текст, чтобы рассказать, что для тебя важно в жизни.")
    await state.set_state(ValueState.waiting_for_response)

async def handle_text_response(message: types.Message, state: FSMContext):
    
    print(f"Bot: {message.bot}")
    telegram_id = message.from_user.id
    username = message.from_user.username or message.from_user.first_name or "unknown"
    
    # Логируем событие отправки текста
    log_event(telegram_id, "user_sent_text", {"username": username})
    
    print(f"USERNAME {message.from_user.username}")
    response = await process_assistant_response(message.from_user.id, message.text, message.from_user.username)
    
    # Логируем результат обработки
    log_event(telegram_id, "text_processed", {"response": response})
    
    await message.reply(response)
    if "сохранена" in response.lower():
        await state.clear()
        await message.reply("Отлично! Хочешь добавить ещё одну ценность или отправить фото?")
    else:
        await state.set_state(ValueState.waiting_for_response)


# async def handle_photo_message(message: types.Message, state: FSMContext):
#     """
#     Обрабатывает фото от пользователя, анализирует настроение и отправляет ответ.
#     """
#     print(f"Bot: {message.bot}")
#     telegram_id = message.from_user.id
#     username = message.from_user.username or message.from_user.first_name or "unknown"
    
#     # Логируем событие отправки фото
#     log_event(telegram_id, "user_sent_photo", {"username": username})
    
#     try:
#         # Берём фото наилучшего качества
#         photo = message.photo[-1]
#         file = await bot.get_file(photo.file_id)
#         file_url = f"https://api.telegram.org/file/bot{bot.token}/{file.file_path}"
        
#         # Анализируем настроение через OpenAI Vision API
#         response = await analyze_mood_from_photo(file_url, telegram_id)
#         print(f"Response: {response}")
#         # Логируем результат анализа
#         log_event(telegram_id, "mood_detected", {"mood_response": response})
        
#         # Отправляем ответ пользователю
#         await message.reply(response)
#         await message.reply("Хочешь отправить ещё фото или рассказать о своих ценностях?")
#     except Exception as e:
#         logger.error(f"Error processing photo for telegram_id={telegram_id}: {e}")
#         await message.reply("Не удалось обработать фото. Попробуй ещё раз!")
    
#     # Сбрасываем состояние, чтобы пользователь мог продолжить
#     await state.clear()

dp.message.register(handle_voice_message, lambda message: message.content_type == types.ContentType.VOICE, StateFilter("*"))
dp.message.register(handle_photo_message, lambda message: message.content_type == types.ContentType.PHOTO, StateFilter("*"))
dp.message.register(start_command, CommandStart())
dp.message.register(handle_text_response, StateFilter("*"))