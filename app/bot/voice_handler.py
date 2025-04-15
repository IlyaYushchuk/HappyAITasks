import logging
from pathlib import Path
from aiogram import types
from aiogram.fsm.context import FSMContext
from aiogram.types import FSInputFile
from app.bot.states import ValueState
from app.openai_client.client import process_assistant_response, transcribe_audio, text_to_speech
from app.analytics.amplitude import log_event

logger = logging.getLogger(__name__)

async def handle_voice_message(message: types.Message, state: FSMContext):
    """
    Обрабатывает голосовое сообщение: сохраняет аудио, транскрибирует, отвечает голосом и логирует события.
    """
    telegram_id = message.from_user.id
    username = message.from_user.username or message.from_user.first_name or "unknown"
    ogg_path = f"temp_{message.message_id}.ogg"
    output_path = f"output_{message.message_id}.mp3"

    try:        
        logger.info(f"Processing voice message for telegram_id={telegram_id}")
        log_event(telegram_id, "user_sent_voice", {"username": username})

        logger.debug(f"Saving voice message to {ogg_path}")
        file_info = await message.bot.get_file(message.voice.file_id)
        file_bytes = await message.bot.download_file(file_info.file_path)
        with open(ogg_path, "wb") as f:
            f.write(file_bytes.read())
        logger.info(f"Voice message saved to {ogg_path}")

        logger.debug(f"Transcribing audio from {ogg_path}")
        text = await transcribe_audio(ogg_path)
        logger.info(f"Transcription completed for telegram_id={telegram_id}: {text}")
        
        response_text = await process_assistant_response(telegram_id, text, username)
        logger.info(f"Assistant response received: {response_text}")
        
        logger.debug(f"Converting response to speech, saving to {output_path}")
        await text_to_speech(response_text, output_path)
        
        await message.reply_voice(FSInputFile(output_path))
        logger.info(f"Voice reply sent to telegram_id={telegram_id}")
        
        if "сохранена" in response_text.lower():
            await state.clear()
            logger.info(f"Value saved, state cleared for telegram_id={telegram_id}")
            log_event(telegram_id, "value_saved", {"username": username})
        else:
            await state.set_state(ValueState.waiting_for_response)
            logger.info(f"Waiting for next response, state set for telegram_id={telegram_id}")

    except Exception as e:
        logger.error(f"Error processing voice message for telegram_id={telegram_id}: {e}")
        await message.reply("Не удалось обработать голосовое сообщение. Попробуй ещё раз!")

    finally:
        for path in [ogg_path, output_path]:
            path_obj = Path(path)
            if path_obj.exists():
                try:
                    path_obj.unlink()
                    logger.info(f"File deleted: {path}")
                except PermissionError as e:
                    logger.error(f"Permission error deleting file {path}: {e}")
                except Exception as e:
                    logger.error(f"Error deleting file {path}: {e}")
            else:
                logger.debug(f"File {path} does not exist, skipping deletion")