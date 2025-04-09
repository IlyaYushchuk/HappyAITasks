from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    username: Mapped[str] = mapped_column(String(50), nullable=True)

    # Связь с таблицей values
    values: Mapped[list["Value"]] = relationship("Value", back_populates="user")

    def __repr__(self):
        return f"<User(telegram_id={self.telegram_id}, username={self.username})>"

class Value(Base):
    __tablename__ = "values"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    value: Mapped[str] = mapped_column(String(100))

    # Связь с таблицей users
    user: Mapped["User"] = relationship("User", back_populates="values")

    def __repr__(self):
        return f"<Value(user_id={self.user_id}, value={self.value})>"