import sqlite3
import os
import shutil

# Dynamic path resolution for Production vs Development
ENV_DB_PATH = os.environ.get('PEOPLE_DB_PATH')
ENV_DB_SOURCE = os.environ.get('PEOPLE_DB_SOURCE')

if ENV_DB_PATH:
    DB_PATH = ENV_DB_PATH
    # Ensure the directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # If the database doesn't exist yet, copy the bundled one from resources
    if not os.path.exists(DB_PATH) and ENV_DB_SOURCE and os.path.exists(ENV_DB_SOURCE):
        print(f"Initial setup: Copying database from {ENV_DB_SOURCE}")
        shutil.copy2(ENV_DB_SOURCE, DB_PATH)
else:
    # Default for local development
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "people.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tables and Triggers
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT,
            person_name TEXT,
            email_id TEXT UNIQUE,
            raw_data TEXT,
            source_file TEXT,
            ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    try:
        cursor.execute("DROP TABLE IF EXISTS people_fts")
        cursor.execute('''
            CREATE VIRTUAL TABLE people_fts USING fts5(
                company_name, person_name, email_id, raw_data,
                content='people', content_rowid='id', tokenize="trigram"
            )
        ''')
        
        # Sync Triggers
        cursor.execute("CREATE TRIGGER IF NOT EXISTS people_ai AFTER INSERT ON people BEGIN INSERT INTO people_fts(rowid, company_name, person_name, email_id, raw_data) VALUES (new.id, new.company_name, new.person_name, new.email_id, new.raw_data); END")
        cursor.execute("CREATE TRIGGER IF NOT EXISTS people_ad AFTER DELETE ON people BEGIN INSERT INTO people_fts(people_fts, rowid, company_name, person_name, email_id, raw_data) VALUES('delete', old.id, old.company_name, old.person_name, old.email_id, old.raw_data); END")
        cursor.execute("CREATE TRIGGER IF NOT EXISTS people_au AFTER UPDATE ON people BEGIN INSERT INTO people_fts(people_fts, rowid, company_name, person_name, email_id, raw_data) VALUES('delete', old.id, old.company_name, old.person_name, old.email_id, old.raw_data); INSERT INTO people_fts(rowid, company_name, person_name, email_id, raw_data) VALUES (new.id, new.company_name, new.person_name, new.email_id, new.raw_data); END")
        
        # If the database was just copied, the FTS index might need a rebuild
        cursor.execute("INSERT INTO people_fts(people_fts) VALUES('rebuild')")
    except:
        pass
        
    conn.commit()
    conn.close()
