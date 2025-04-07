import openai
import asyncio
from config import settings

client = openai.AsyncClient(api_key=settings.openai_api_token,  default_headers={"OpenAI-Beta": "assistants=v2"})
#some test comments
ASSISTANT_ID = None

async def init_assistant():
    """Создание ассистента"""
    assistant = await client.beta.assistants.create(
        name="GenerateAnswersAssistant",
        instructions="Ты ассистент который генерирует ответы в 3-4 предложения.",
        model="gpt-3.5-turbo"
    )
    return assistant.id

async def transcribe_audio(audio_path: str) -> str:
    """Преобразование аудио в текст"""
    with open(audio_path, "rb") as audio_file:
        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="ru"
        )
    return transcription.text

async def generate_response(text: str) -> str:
    """Генерация текстового ответа с использованием Assistant API"""
    global ASSISTANT_ID
    if ASSISTANT_ID is None:
        ASSISTANT_ID = await init_assistant()
    
    # Создаем поток для общения
    thread = await client.beta.threads.create()
    
    # Отправляем сообщение в поток
    await client.beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=text
    )
    
    # Запускаем ассистента для обработки потока
    run = await client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=ASSISTANT_ID
    )
    
    # Ожидаем завершения выполнения
    while True:
        run_status = await client.beta.threads.runs.retrieve(
            thread_id=thread.id,
            run_id=run.id
        )
        if run_status.status == "completed":
            break
        await asyncio.sleep(1)
    
    messages = await client.beta.threads.messages.list(
        thread_id=thread.id
    )
    
    return messages.data[0].content[0].text.value

async def text_to_speech(text: str, output_path: str):
    """Преобразование текста в аудио"""
    response = await client.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=text
    )
    with open(output_path, "wb") as f:
        f.write(response.content)