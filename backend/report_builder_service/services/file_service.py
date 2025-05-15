import json
from pathlib import Path
from typing import List, Optional
import logging
import shutil

from config import REPORTS_DIR, TEMPLATES_DIR, LEGACY_REPORTS_DATA_FILE, logger
from models.schemas import Report, Template

# Function to load a single report from a file
def load_report_from_file(file_path: Path) -> Optional[Report]:
    try:
        with open(file_path, "r") as f:
            report_data = json.load(f)
            return Report(**report_data)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        logger.error(f"Error loading report from {file_path}: {e}")
        return None

# Function to save a single report to a file
def save_report_to_file(report: Report):
    file_path = REPORTS_DIR / f"{report.id}.json"
    with open(file_path, "w") as f:
        json.dump(report.dict(), f, indent=4)

# Function to load all reports from the reports directory
def load_all_reports() -> List[Report]:
    reports = []
    for file_path in REPORTS_DIR.glob("*.json"):
        report = load_report_from_file(file_path)
        if report:
            reports.append(report)
    return reports

# Template functions
def load_template_from_file(file_path: Path) -> Optional[Template]:
    try:
        with open(file_path, "r") as f:
            template_data = json.load(f)
            return Template(**template_data)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        logger.error(f"Error loading template from {file_path}: {e}")
        return None

def save_template_to_file(template: Template):
    file_path = TEMPLATES_DIR / f"{template.id}.json"
    with open(file_path, "w") as f:
        json.dump(template.dict(), f, indent=4)

def load_all_templates() -> List[Template]:
    templates = []
    for file_path in TEMPLATES_DIR.glob("*.json"):
        template = load_template_from_file(file_path)
        if template:
            templates.append(template)
    return templates

# Function to migrate legacy data if it exists
def migrate_legacy_data():
    if LEGACY_REPORTS_DATA_FILE.exists():
        try:
            with open(LEGACY_REPORTS_DATA_FILE, "r") as f:
                legacy_data = json.load(f)
                
            # Save each report as an individual file
            for report_data in legacy_data:
                report = Report(**report_data)
                save_report_to_file(report)
                
            # Backup and remove the legacy file
            backup_path = LEGACY_REPORTS_DATA_FILE.with_suffix('.json.bak')
            shutil.copy2(LEGACY_REPORTS_DATA_FILE, backup_path)
            LEGACY_REPORTS_DATA_FILE.unlink()
            
            logger.info(f"Successfully migrated legacy data to individual files. Backup created at {backup_path}")
        except Exception as e:
            logger.error(f"Error migrating legacy data: {e}")

# Ensure directories exist
def ensure_directories():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True) 