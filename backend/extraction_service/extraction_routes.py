import sys
import os
import csv
from datetime import datetime
import re
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.tag import pos_tag
import pdfplumber
from docx import Document
from pathlib import Path
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import JSONResponse
from config import UPLOAD_DIR, EXTRACTION_DIR, DATASET_DIR, OUTPUT_DIR, LOG_DIR
import logging
from typing import List
from pydantic import BaseModel
from utils.file_utils import get_file_security_classification
import itertools

# Download necessary NLTK data
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')

# Configure logging
logging.basicConfig(filename=LOG_DIR / 'extraction_service.log', level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class ExtractionRequest(BaseModel):
    filenames: List[str]
    csv_filename: str

def extract_text_with_layout(file_path):
    _, ext = os.path.splitext(file_path)
    if ext.lower() == '.pdf':
        return extract_from_pdf(file_path)
    elif ext.lower() == '.docx':
        return extract_from_docx(file_path)
    elif ext.lower() == '.txt':
        return extract_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")

def extract_from_pdf(file_path):
    extracted_content = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                extracted_content.append(text)
    return extracted_content

def extract_from_docx(file_path):
    doc = Document(file_path)
    extracted_content = []
    for para in doc.paragraphs:
        if para.text.strip():
            extracted_content.append(para.text.strip())
    return extracted_content

def extract_from_txt(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    return [content]

def extract_paragraphs(text):
    return text.split('\n\n')

def extract_sentences(text):
    return sent_tokenize(text)

def is_meaningful_text(text):
    words = word_tokenize(text)
    tagged = pos_tag(words)
    has_noun = any(tag.startswith('NN') for _, tag in tagged)
    has_verb = any(tag.startswith('VB') for _, tag in tagged)
    is_long_enough = len(words) > 5
    text_chars = sum(1 for c in text if c.isalpha())
    total_chars = len(text)
    text_ratio = text_chars / total_chars if total_chars > 0 else 0
    return has_noun and has_verb and is_long_enough and text_ratio > 0.7

def clean_text(text):
    # Remove headers, footers, and page numbers
    cleaned_text = re.sub(r'^.*?Page \d+.*?$', '', text, flags=re.MULTILINE)
    # Remove extra whitespace
    cleaned_text = ' '.join(cleaned_text.split())
    return cleaned_text

@router.post("/extract/")
async def extract_file_content(request_data: ExtractionRequest):
    results = []
    extracted_content = []

    for filename in request_data.filenames:
        try:
            file_path = UPLOAD_DIR / filename
            if not file_path.exists():
                results.append({"filename": filename, "status": "File not found"})
                continue

            # Extract content with layout information
            raw_content = extract_text_with_layout(str(file_path))
            logger.info(f"Raw content extracted from {filename}: {len(raw_content)} items")

            # Get the security classification for this file
            security_classification = get_file_security_classification(filename)

            # First pass: Extract paragraphs
            for content in raw_content:
                cleaned_content = clean_text(content)
                paragraphs = extract_paragraphs(cleaned_content)
                for para in paragraphs:
                    if is_meaningful_text(para):
                        extracted_content.append({
                            "answer": para,
                            "source": filename,
                            "security_classification": security_classification,
                            "type": "paragraph"
                        })

            # Second pass: Extract sentences
            for content in raw_content:
                cleaned_content = clean_text(content)
                sentences = extract_sentences(cleaned_content)
                for sentence in sentences:
                    if is_meaningful_text(sentence):
                        extracted_content.append({
                            "answer": sentence,
                            "source": filename,
                            "security_classification": security_classification,
                            "type": "sentence"
                        })

            results.append({"filename": filename, "status": "Content extracted successfully"})
        except Exception as e:
            logger.error(f"Error extracting content from {filename}: {str(e)}")
            results.append({"filename": filename, "status": f"Error: {str(e)}"})

    logger.info(f"Total extracted items: {len(extracted_content)}")

    # Create CSV file
    current_date = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_filename = f"{request_data.csv_filename}_{current_date}.csv"
    csv_path = EXTRACTION_DIR / csv_filename
    csv_path.parent.mkdir(parents=True, exist_ok=True)

    with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
        csv_writer = csv.writer(csvfile)
        csv_writer.writerow(["question", "answer", "source", "security classification", "type"])
        for item in extracted_content:
            csv_writer.writerow([
                "",  # question (empty for now)
                item["answer"],
                item["source"],
                item["security_classification"],
                item["type"]
            ])

    logger.info(f"CSV file created: {csv_path}")

    return {
        "status": "Extraction process completed",
        "results": results,
        "csv_file": str(csv_path.name),
        "extracted_items_count": len(extracted_content)
    }

@router.get("/csv-files/")
async def get_csv_files():
    try:
        csv_files = []
        for f in os.listdir(EXTRACTION_DIR):
            if f.endswith('.csv'):
                file_path = EXTRACTION_DIR / f
                csv_files.append({
                    "name": f,
                    "created_at": datetime.fromtimestamp(file_path.stat().st_ctime).isoformat()
                })
        logger.info(f"CSV files found: {csv_files}")
        logger.info(f"EXTRACTION_DIR: {EXTRACTION_DIR}")
        return JSONResponse(content=csv_files, status_code=200)
    except Exception as e:
        logger.error(f"Error fetching CSV files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching CSV files: {str(e)}")

@router.get("/csv-preview/{filename}")
async def get_csv_preview(filename: str, rows: int = 1000):  # Default to 1000 rows, but allow it to be configurable
    try:
        file_path = EXTRACTION_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="CSV file not found")
        
        with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
            csv_reader = csv.DictReader(csvfile)
            data = list(itertools.islice(csv_reader, rows))  # Use itertools.islice for efficiency
        
        return JSONResponse(content=data, status_code=200)
    except Exception as e:
        logger.error(f"Error fetching CSV preview for {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching CSV preview: {str(e)}")

@router.post("/rename-csv/")
async def rename_csv_file(request: dict = Body(...)):
    old_name = request.get("old_name")
    new_name = request.get("new_name")
    
    if not old_name or not new_name:
        raise HTTPException(status_code=400, detail="Both old_name and new_name are required")
    
    old_path = EXTRACTION_DIR / old_name
    new_path = EXTRACTION_DIR / new_name
    
    if not old_path.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")
    
    if new_path.exists():
        raise HTTPException(status_code=400, detail="New file name already exists")
    
    try:
        old_path.rename(new_path)
        return JSONResponse(content={"message": f"CSV file renamed from '{old_name}' to '{new_name}' successfully"}, status_code=200)
    except Exception as e:
        logger.error(f"Error renaming CSV file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error renaming CSV file: {str(e)}")

@router.delete("/delete-csv/{filename}")
async def delete_csv_file(filename: str):
    file_path = EXTRACTION_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")
    
    try:
        os.remove(file_path)
        return JSONResponse(content={"message": f"CSV file '{filename}' deleted successfully"}, status_code=200)
    except Exception as e:
        logger.error(f"Error deleting CSV file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting CSV file: {str(e)}")