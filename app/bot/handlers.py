import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from app.config import settings
from app.bot.states import ValueState
from app.analytics.amplitude import log_event
from app.analytics.amplitude import executor
from app.bot.photo_handler import handle_photo_message
from app.bot.voice_handler import handle_voice_message
from app.bot.text_handler import handle_text_response

logger = logging.getLogger(__name__)

bot = Bot(token=settings.telegram_token)
dp = Dispatcher()

async def on_startup(_):
    logger.info(f"Assistant started with ID: {settings.assistant_id}")

async def on_shutdown(_):
    await bot.close()
    await dp.storage.close()
    executor.shutdown(wait=True)

async def start_command(message: types.Message, state: FSMContext):
    telegram_id = message.from_user.id
    username = message.from_user.username or message.from_user.first_name or "unknown"
   
    log_event(telegram_id, "user_sent_start", {"username": username})
   
    await message.reply("Привет! Отправь мне голосовое сообщение или текст, чтобы рассказать, что для тебя важно в жизни.")
    await state.set_state(ValueState.waiting_for_response)

dp.message.register(start_command, CommandStart())
dp.message.register(handle_voice_message, lambda message: message.content_type == types.ContentType.VOICE, StateFilter("*"))
dp.message.register(handle_photo_message, lambda message: message.content_type == types.ContentType.PHOTO, StateFilter("*"))
dp.message.register(handle_text_response, StateFilter("*"))