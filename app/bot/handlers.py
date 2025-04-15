# app/bot/handlers.py
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from app.config import settings
from app.bot.voice_handler import handle_voice_message
from app.openai_client.client import process_assistant_response
from app.bot.states import ValueState
from app.startup import initialize

bot = Bot(token=settings.telegram_token)
dp = Dispatcher()

async def on_startup(_):
    await initialize()

async def on_shutdown(_):
    await bot.close()
    await dp.storage.close()

async def voice_message_handler(message: types.Message, state: FSMContext):
    await state.set_state(ValueState.waiting_for_response)
    await handle_voice_message(bot, message, state)

async def start_command(message: types.Message, state: FSMContext):
    await message.reply("Привет! Отправь мне голосовое сообщение или текст, чтобы рассказать, что для тебя важно в жизни.")
    await state.set_state(ValueState.waiting_for_response)

async def handle_text_response(message: types.Message, state: FSMContext):
    print(f"USERNAME {message.from_user.username}")
    response = await process_assistant_response(message.from_user.id, message.text, message.from_user.username)
    await message.reply(response)
    if "сохранена" in response.lower():
        await state.clear()
        await message.reply("Отлично! Хочешь добавить ещё одну ценность? Отправь сообщение.")
    else:
        await state.set_state(ValueState.waiting_for_response)

dp.message.register(voice_message_handler, lambda message: message.content_type == types.ContentType.VOICE, StateFilter("*"))
dp.message.register(start_command, CommandStart())
dp.message.register(handle_text_response, StateFilter("*"))