import logging
from aiogram import types
from aiogram.fsm.context import FSMContext
from app.openai_client.client import process_assistant_response
from app.bot.states import ValueState
from app.analytics.amplitude import log_event

logger = logging.getLogger(__name__)

async def handle_text_response(message: types.Message, state: FSMContext):

    telegram_id = message.from_user.id
    username = message.from_user.username or message.from_user.first_name or "unknown"
    
    logger.info(f"User {username} sent text message: {message.text}")
    log_event(telegram_id, "user_sent_text", {"username": username})
    
    response = await process_assistant_response(message.from_user.id, message.text, message.from_user.username)
    
    await message.reply(response)
    if "сохранена" in response.lower():
        await state.clear()
    else:
        await state.set_state(ValueState.waiting_for_response)