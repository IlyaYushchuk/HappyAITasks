import openai
from config import settings

client = openai.AsyncClient(api_key=settings.openai_api_token,  default_headers={"OpenAI-Beta": "assistants=v2"})

ASSISTANT_ID = None

async def init_assistant():
    """Создание ассистента"""
    assistant = await client.beta.assistants.create(
        name="GenerateAnswersAssistant",
        instructions="Ты ассистент который генерирует ответы в 3-4 предложения.",
        model="gpt-4-turbo"
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
    
    # Запускаем и ожидаем ответа
    run = await client.beta.threads.runs.create_and_poll(
        thread_id=thread.id,
        assistant_id=ASSISTANT_ID
    )
    
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