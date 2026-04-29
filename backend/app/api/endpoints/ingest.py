from fastapi import APIRouter, UploadFile, File, Form
from typing import List, Optional
import json
from ...db.database import get_db_connection
from ...services.parser import get_file_preview, parse_hr_file_with_mapping

router = APIRouter()

@router.post("/peek")
async def peek_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        preview = get_file_preview(content, file.filename)
        return preview
    except Exception as e:
        return {"error": str(e)}

@router.post("/")
async def ingest(
    files: List[UploadFile] = File(...),
    mapping: str = Form("{}") # JSON string of mapping
):
    conn = get_db_connection()
    cursor = conn.cursor()
    ingested = 0
    skipped = 0
    errors = []
    
    try:
        mapping_dict = json.loads(mapping)
    except:
        mapping_dict = {}
    
    for file in files:
        try:
            content = await file.read()
            # If no mapping provided, the service will try to find columns by name as fallback
            people = parse_hr_file_with_mapping(content, file.filename, mapping_dict)
            if not people:
                skipped += 1
                errors.append(f"{file.filename}: No valid data found based on mapping")
                continue
                
            for p in people:
                cursor.execute('''
                    INSERT OR REPLACE INTO people (company_name, person_name, email_id, raw_data, source_file)
                    VALUES (?, ?, ?, ?, ?)
                ''', (p['company_name'], p['person_name'], p['email_id'], json.dumps(p['raw_data']), p['source_file']))
                ingested += 1
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
            skipped += 1
            
    conn.commit()
    conn.close()
    return {"ingested": ingested, "skipped": skipped, "errors": errors}

@router.get("/stats")
def stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM people")
    count = cursor.fetchone()[0]
    conn.close()
    return {"total_records": count}

@router.post("/clear")
def clear():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM people")
    try: cursor.execute("INSERT INTO people_fts(people_fts) VALUES('rebuild')")
    except: pass
    conn.commit()
    conn.close()
    return {"status": "success"}
