import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

db_path = os.getenv('DB_PATH', 'rental_clothes.db')

def get_connection():
    try:
        connection = sqlite3.connect(db_path, check_same_thread=False)
        connection.row_factory = sqlite3.Row  # for dict-like access
        return connection
    except sqlite3.Error as err:
        print(f"❌ SQLite connection failed: {err}")
        raise