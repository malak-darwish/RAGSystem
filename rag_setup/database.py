import aiomysql
import os
from dotenv import load_dotenv
import json

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", 3306)), 
    
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "db": os.getenv("DB_NAME", "rag_chat"),
    "autocommit": True,
}

async def get_conn():
    return await aiomysql.connect(**DB_CONFIG)

async def init_db():
    conn = await get_conn()
    async with conn.cursor() as cur:
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS threads (
                id         INT PRIMARY KEY AUTO_INCREMENT,
                title      TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id         INT PRIMARY KEY AUTO_INCREMENT,
                thread_id  INT NOT NULL,
                role       ENUM('user', 'assistant') NOT NULL,
                content    TEXT NOT NULL,
                sources    JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
            )
        """)
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id         INT PRIMARY KEY AUTO_INCREMENT,
                message_id INT NOT NULL,
                value      ENUM('up', 'down') NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            )
        """)
    conn.close()

async def create_thread(title: str) -> int:
    conn = await get_conn()
    async with conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO threads (title) VALUES (%s)", (title,)
        )
        await cur.execute("SELECT LAST_INSERT_ID()")
        row = await cur.fetchone()
    conn.close()
    return row[0]

async def get_threads() -> list:
    conn = await get_conn()
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT id, title, created_at FROM threads ORDER BY created_at DESC"
        )
        rows = await cur.fetchall()
    conn.close()
    return rows

async def get_messages(thread_id: int) -> list:
    conn = await get_conn()
    async with conn.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT id, role, content, sources, created_at "
            "FROM messages WHERE thread_id = %s ORDER BY created_at ASC",
            (thread_id,)
        )
        rows = await cur.fetchall()
    conn.close()
    return rows

async def save_message(thread_id: int, role: str, content: str, sources=None) -> int:
    conn = await get_conn()
    async with conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO messages (thread_id, role, content, sources) VALUES (%s, %s, %s, %s)",
            (thread_id, role, content, json.dumps(sources) if sources else None)
        )
        await cur.execute("SELECT LAST_INSERT_ID()")
        row = await cur.fetchone()
    conn.close()
    return row[0]