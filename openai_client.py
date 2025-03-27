import openai
from config import OPENAI_API_KEY

client = openai.AsyncClient(api_key=OPENAI_API_KEY)

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
    """Генерация текстового ответа"""
    response = await client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": text}]
    )
    return response.choices[0].message.content

async def text_to_speech(text: str, output_path: str):
    """Преобразование текста в аудио"""
    response = await client.audio.speech.create(
        model="tts-1",
        voice="alloy",
        input=text
    )
    with open(output_path, "wb") as f:
        f.write(response.content)