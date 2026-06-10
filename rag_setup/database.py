import aiomysql
import os
from dotenv import load_dotenv

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