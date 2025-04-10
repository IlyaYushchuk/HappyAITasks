import openai
import json
import asyncio
from app.config import settings
from app.db.database import async_session
from app.db.crud import save_value, get_or_create_user,get_user_values, get_user_thread_id, save_user_thread_id

client = openai.AsyncClient(api_key=settings.openai_api_token,  default_headers={"OpenAI-Beta": "assistants=v2"})

async def init_assistant():
    """Создаёт ассистента с функцией save_value, включая username."""
    assistant = await client.beta.assistants.create(
        name="ValueBot",
        instructions="Ты голосовой бот, который помогает пользователю определить его ключевые жизненные ценности. " \
        "Задавай вопросы, чтобы понять, что важно для пользователя. " \
        "Или попытайся определить его ценность из того, что он говорит. " \
        "Когда ценность определена, вызови функцию save_value для сохранения, передав telegram_id и value. " \
        "Только не отвечай, что-то типо 'Твоя ценность сохранена', сгенерируй ответ чтобы пользователь был доволен ответом. " \
        "Например спроси его о чем-нибудь о его ценности или расскажи какой-нибудь интересный факт о ней.",
        model="gpt-4-turbo",
        tools=[{
            "type": "function",
            "function": {
                "name": "save_value",
                "description": "Сохраняет ценность пользователя в базу данных.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "value": {
                            "type": "string",
                            "description": "Ценность пользователя (например, 'семья')"
                        },
                        "telegram_id": {
                            "type": "integer",
                            "description": "ID пользователя в Telegram"
                        }
                    },
                    "required": ["value", "telegram_id"],
                }
            }
        }]
    )
    return assistant.id


async def process_assistant_response(telegram_id: int, message: str, username: str = None) -> str:
    async with async_session() as session:
        current_values = await get_user_values(session, telegram_id)
        thread_id = await get_user_thread_id(session, telegram_id)
        
        if not thread_id:
            thread = await client.beta.threads.create()
            thread_id = thread.id
            await save_user_thread_id(session, telegram_id, thread_id)
        
        await client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=f"Мои текущие ценности: {', '.join(current_values) if current_values else 'ещё не определены'}. {message}"
        )
        
        print(f"Текущий thread {thread_id}")

        run = await client.beta.threads.runs.create_and_poll(
            thread_id=thread_id,
            assistant_id=settings.assistant_id
        )
        
        if run.status == "requires_action":
            tool_calls = run.required_action.submit_tool_outputs.tool_calls
            for tool_call in tool_calls:
                if tool_call.function.name == "save_value":
                    args = json.loads(tool_call.function.arguments)
                    value = args["value"]
                    
                    print(f"Валидируем ценность {value}")
                    is_valid = await validate_value(value)
                    if is_valid:
                        user = await get_or_create_user(session, telegram_id, username)
                        await save_value(session, user.id, value)
                        await client.beta.threads.runs.submit_tool_outputs(
                            thread_id=thread_id,
                            run_id=run.id,
                            tool_outputs=[{"tool_call_id": tool_call.id, "output": "Ценность сохранена"}]
                        )
                        return f"Ценность '{value}' сохранена!"
                    else:
                        return "Ценность некорректна. Давай попробуем ещё раз. Что для тебя важно?"
        
        messages = await client.beta.threads.messages.list(thread_id=thread_id)
        return messages.data[0].content[0].text.value
    
async def validate_value(value: str) -> bool:
    """Валидирует ценность через Completions API."""
    response = await client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {"role": "system", "content": "Ты валидатор ценностей. Проверь, является ли строка осмысленной жизненной ценностью. Не допускай пустые строки или бредовые несвязные слова и символы."},
            {"role": "user", "content": f"Проверь: '{value}'"}
        ],
        functions=[{
            "name": "validate_value",
            "parameters": {
                "type": "object",
                "properties": {"is_valid": {"type": "boolean"}},
                "required": ["is_valid"]
            }
        }],
        function_call={"name": "validate_value"}
    )
    result = json.loads(response.choices[0].message.function_call.arguments)
    ans = result["is_valid"]
    print(f"Провалидировали ценность {value} и получили {ans}")
    return ans


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
    
    # Создаем поток для общения
    thread = await client.beta.threads.create()
    
    # Отправляем сообщение в поток
    await client.beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=text
    )

    run = await client.beta.threads.runs.create_and_poll(
        thread_id=thread.id,
        assistant_id=settings.assistant_id
    )
    
    if run.status == "completed":
        messages = await client.beta.threads.messages.list(
            thread_id=thread.id,
            run_id=run.id,
            limit=1
        )
        return messages.data[0].content[0].text.value
    elif run.status == "failed":
        return f"Run failed: {run.last_error}"
    elif run.status == "cancelled":
        return "Run was cancelled"
    elif run.status == "expired":
        return "Run expired"
    else:
        return f"Unexpected run status: {run.status}"
    

async def text_to_speech(text: str, output_path: str):
    """Преобразование текста в аудио"""
    response = await client.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=text
    )
    with open(output_path, "wb") as f:
        f.write(response.content)