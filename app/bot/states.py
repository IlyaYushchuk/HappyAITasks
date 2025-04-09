from aiogram.fsm.state import State, StatesGroup

class ValueState(StatesGroup):
    waiting_for_response = State()