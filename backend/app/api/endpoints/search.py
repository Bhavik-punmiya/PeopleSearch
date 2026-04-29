from fastapi import APIRouter, Query
from typing import List
from ...db.database import get_db_connection
import json

router = APIRouter()

@router.get("/")
def search(q: str = Query("")):
    if not q or len(q) < 1:
        return []
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Use the FTS5 table with the trigram tokenizer for powerful string matching
    # We also rank the results so the most relevant ones appear first
    try:
        query = """
            SELECT p.id, p.company_name, p.person_name, p.email_id, p.raw_data, p.source_file 
            FROM people p
            JOIN people_fts f ON p.id = f.rowid
            WHERE people_fts MATCH ?
            ORDER BY rank
            LIMIT 50
        """
        # Trigram matching works best with the exact term
        cursor.execute(query, (q,))
    except:
        # Fallback if FTS5 has issues
        query = """
            SELECT id, company_name, person_name, email_id, raw_data, source_file 
            FROM people 
            WHERE person_name LIKE ? 
               OR company_name LIKE ? 
               OR email_id LIKE ? 
               OR raw_data LIKE ?
            LIMIT 50
        """
        like_q = f"%{q}%"
        cursor.execute(query, (like_q, like_q, like_q, like_q))
        
    results = []
    for row in cursor.fetchall():
        results.append({
            "id": row["id"],
            "company_name": row["company_name"],
            "person_name": row["person_name"],
            "email_id": row["email_id"],
            "raw_data": json.loads(row["raw_data"]),
            "source_file": row["source_file"]
        })
        
    conn.close()
    return results
