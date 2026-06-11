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
              reason     VARCHAR(200),
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
          )
      """)
      # Safe migration if table already exists without reason column
        await cur.execute("""
          SELECT COUNT(*) FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'feedback'
            AND COLUMN_NAME = 'reason'
      """)
        (col_exists,) = await cur.fetchone()
        if not col_exists:
          await cur.execute(
              "ALTER TABLE feedback ADD COLUMN reason VARCHAR(200) AFTER value"
          )
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS message_versions (
                id         INT PRIMARY KEY AUTO_INCREMENT,
                message_id INT NOT NULL,
                version    INT NOT NULL,
                content    TEXT NOT NULL,
                sources    JSON,
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
            "SELECT id, title, pinned, created_at FROM threads ORDER BY pinned DESC, created_at DESC"
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

async def save_version(message_id: int, content: str, sources) -> int:
    """
    Saves a regenerated version. On first regeneration, snapshots the
    original as version 1 first, then saves the new one as version 2.
    Returns the new version number.
    """
    import json as _json
 
    conn = await get_conn()
    try:
        async with conn.cursor() as cur:
            # How many versions exist already?
            await cur.execute(
                "SELECT COALESCE(MAX(version), 0) FROM message_versions WHERE message_id = %s",
                (message_id,)
            )
            (max_ver,) = await cur.fetchone()
 
            # First regeneration — snapshot the original as v1
            if max_ver == 0:
                await cur.execute(
                    "SELECT content, sources FROM messages WHERE id = %s", (message_id,)
                )
                row = await cur.fetchone()
                if row:
                    orig_src = row[1] if isinstance(row[1], str) else _json.dumps(row[1] or [])
                    await cur.execute(
                        "INSERT INTO message_versions (message_id, version, content, sources) VALUES (%s, 1, %s, %s)",
                        (message_id, row[0], orig_src)
                    )
                max_ver = 1
 
            new_ver = max_ver + 1
            src_json = sources if isinstance(sources, str) else _json.dumps(sources or [])
 
            await cur.execute(
                "INSERT INTO message_versions (message_id, version, content, sources) VALUES (%s, %s, %s, %s)",
                (message_id, new_ver, content, src_json)
            )
            # Update canonical messages row to latest version
            await cur.execute(
                "UPDATE messages SET content = %s, sources = %s WHERE id = %s",
                (content, src_json, message_id)
            )
        await conn.commit()
        return new_ver
    finally:
        conn.close()
 
 
async def get_versions(message_id: int) -> list:
    """Returns all versions for a message, oldest first."""
    import json as _json
 
    conn = await get_conn()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT version, content, sources FROM message_versions "
                "WHERE message_id = %s ORDER BY version ASC",
                (message_id,)
            )
            rows = await cur.fetchall()
            return [
                {
                    "version": r[0],
                    "content": r[1],
                    "sources": _json.loads(r[2]) if r[2] else [],
                }
                for r in rows
            ]
    finally:
        conn.close()

async def save_feedback(message_id: int, value: str, reason: str | None = None):
      conn = await get_conn()
      async with conn.cursor() as cur:
          # Delete old feedback for this message first (allow changing vote)
          await cur.execute(
              "DELETE FROM feedback WHERE message_id = %s", (message_id,)
          )
          await cur.execute(
              "INSERT INTO feedback (message_id, value, reason) VALUES (%s, %s, %s)",
              (message_id, value, reason),
          )
      conn.close()
      
async def delete_thread(thread_id: int):
    conn = await get_conn()
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM threads WHERE id = %s", (thread_id,))
    conn.close()

async def rename_thread(thread_id: int, title: str):
    conn = await get_conn()
    async with conn.cursor() as cur:
        await cur.execute("UPDATE threads SET title = %s WHERE id = %s", (title, thread_id))
    conn.close()

async def pin_thread(thread_id: int, pinned: bool):
    conn = await get_conn()
    async with conn.cursor() as cur:
        await cur.execute("UPDATE threads SET pinned = %s WHERE id = %s", (int(pinned), thread_id))
    conn.close()