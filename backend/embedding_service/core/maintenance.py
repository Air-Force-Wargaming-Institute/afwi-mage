"""
Maintenance and migration utilities for the embedding service.

This module provides functions for:
- One-time data migrations
- Backup management
- System resource tracking
"""

import os
import gc
import shutil
import logging
import time
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime

# Import from core modules - handle both environments
try:
    # First try relative imports (development)
    from .vectorstore import load_metadata, save_metadata
except ImportError:
    # Fall back to absolute imports (Docker)
    from core.vectorstore import load_metadata, save_metadata

# Set up logging
logger = logging.getLogger("embedding_service")

# Constants for backup management
MAX_BACKUPS_PER_VECTORSTORE = 3  # Keep only this many most recent backups

def migrate_index_files(vectorstore_dir: str) -> None:
    """
    Migrate vector store index files from index subdirectories to main vector store directories.
    
    This is a one-time migration to fix the directory structure.
    
    Args:
        vectorstore_dir: Path to the vector store directory
    """
    logger.info("Starting migration of vector store index files...")
    vs_dir = Path(vectorstore_dir)
    
    # Get all vector store directories
    for vs_path in vs_dir.glob("*"):
        if not vs_path.is_dir():
            continue
        
        vectorstore_id = vs_path.name
        index_subdir = vs_path / "index"
        
        # Check if the index subdirectory exists
        if index_subdir.exists() and index_subdir.is_dir():
            logger.info(f"Found index subdirectory for vector store {vectorstore_id}")
            
            # Check for index.faiss and index.pkl files in the subdirectory
            index_faiss = index_subdir / "index.faiss"
            index_pkl = index_subdir / "index.pkl"
            
            if index_faiss.exists() and index_pkl.exists():
                logger.info(f"Moving index files from {index_subdir} to {vs_path}")
                
                try:
                    # Copy the files to the main directory
                    shutil.copy2(index_faiss, vs_path / "index.faiss")
                    shutil.copy2(index_pkl, vs_path / "index.pkl")
                    
                    # Create a backup of the index subdirectory
                    timestamp = int(time.time())
                    backup_dir = vs_path / f"index_backup_{timestamp}"
                    shutil.copytree(index_subdir, backup_dir)
                    
                    # Update metadata if it exists in the backup
                    backup_metadata_path = backup_dir / "metadata.json"
                    if backup_metadata_path.exists():
                        try:
                            backup_metadata = load_metadata(backup_metadata_path)
                            if backup_metadata:
                                original_id = backup_metadata.get("id")
                                backup_id = f"{original_id}_backup_{timestamp}"
                                
                                # Update metadata
                                backup_metadata["id"] = backup_id
                                backup_metadata["is_backup"] = True
                                backup_metadata["original_id"] = original_id
                                backup_metadata["backup_timestamp"] = timestamp
                                backup_metadata["backup_date"] = datetime.fromtimestamp(timestamp).isoformat()
                                backup_metadata["display_name"] = f"BACKUP OF: {backup_metadata.get('name', 'Unknown')}"
                                backup_metadata["backup_reason"] = "Index migration"
                                
                                # Save updated metadata
                                save_metadata(backup_metadata, backup_metadata_path)
                                logger.info(f"Updated backup metadata for index migration backup with ID {backup_id}")
                        except Exception as e:
                            logger.warning(f"Error updating metadata for backup during migration: {str(e)}")
                    
                    logger.info(f"Successfully migrated index files for vector store {vectorstore_id}")
                except Exception as e:
                    logger.error(f"Error migrating index files for vector store {vectorstore_id}: {str(e)}")
    
    logger.info("Migration of vector store index files completed")

def cleanup_old_backups(vectorstore_dir: str, vectorstore_id: str, keep_count: int = MAX_BACKUPS_PER_VECTORSTORE) -> int:
    """
    Clean up old backups for a vector store, keeping only the most recent ones.
    
    Args:
        vectorstore_dir: Base directory for vector stores
        vectorstore_id: ID of the vector store to clean up
        keep_count: Number of most recent backups to keep
        
    Returns:
        Number of backups removed
    """
    vs_dir = Path(vectorstore_dir)
    backup_pattern = f"{vectorstore_id}_backup_*"
    
    # Find all backup directories
    backups = list(vs_dir.glob(backup_pattern))
    
    # Skip if we don't have more than the keep_count
    if len(backups) <= keep_count:
        logger.info(f"Only {len(backups)} backups found for {vectorstore_id}, no cleanup needed")
        return 0
    
    logger.info(f"Found {len(backups)} backups for vector store {vectorstore_id}")
    
    # Sort backups by timestamp (newest first)
    try:
        # First try to sort by timestamp in the directory name
        sorted_backups = []
        for backup in backups:
            try:
                # Extract timestamp from the directory name
                parts = str(backup.name).split('_')
                if len(parts) >= 3:
                    timestamp = int(parts[-1])
                    sorted_backups.append((backup, timestamp))
                else:
                    logger.warning(f"Backup directory has unexpected format: {backup.name}")
                    # Use file modification time as fallback
                    timestamp = int(backup.stat().st_mtime)
                    sorted_backups.append((backup, timestamp))
            except (ValueError, IndexError) as e:
                logger.warning(f"Could not extract timestamp from {backup.name}: {str(e)}")
                # Use file modification time as fallback
                timestamp = int(backup.stat().st_mtime)
                sorted_backups.append((backup, timestamp))
        
        # Sort by timestamp (newest first)
        sorted_backups.sort(key=lambda x: x[1], reverse=True)
        
        # Extract just the paths
        backups = [b[0] for b in sorted_backups]
    except Exception as e:
        logger.error(f"Error sorting backups by timestamp: {str(e)}")
        # Fallback to sorting by directory name
        backups.sort(reverse=True)
    
    # Keep the newest, delete the rest
    to_keep = backups[:keep_count]
    to_remove = backups[keep_count:]
    
    logger.info(f"Keeping {len(to_keep)} newest backups: {[b.name for b in to_keep]}")
    logger.info(f"Removing {len(to_remove)} older backups: {[b.name for b in to_remove]}")
    
    removed_count = 0
    
    for backup_dir in to_remove:
        try:
            logger.info(f"Removing old backup: {backup_dir}")
            shutil.rmtree(backup_dir)
            removed_count += 1
        except Exception as e:
            logger.error(f"Error removing backup {backup_dir}: {str(e)}")
    
    logger.info(f"Cleaned up {removed_count} old backups for vector store {vectorstore_id}")
    return removed_count

def cleanup_all_backups(vectorstore_dir: str, max_per_store: int = MAX_BACKUPS_PER_VECTORSTORE) -> Dict[str, Any]:
    """
    Clean up old backup files for all vector stores.
    
    Args:
        vectorstore_dir: Base directory for vector stores
        max_per_store: Maximum number of backups to keep per vector store
        
    Returns:
        Dictionary with cleanup results
    """
    try:
        total_removed = 0
        total_errors = 0
        vectorstore_dir_path = Path(vectorstore_dir)
        
        # Check if vectorstore directory exists
        if not vectorstore_dir_path.exists() or not vectorstore_dir_path.is_dir():
            return {
                "success": False,
                "message": f"Vector store directory {vectorstore_dir} not found",
            }
        
        # Get all vector store IDs
        vs_dirs = [d for d in vectorstore_dir_path.glob("*") if d.is_dir() and not str(d.name).endswith("_backup_")]
        logger.info(f"Found {len(vs_dirs)} vector stores")
        
        # Also look for backup directories without a corresponding vector store
        all_dirs = set(d.name for d in vectorstore_dir_path.glob("*") if d.is_dir())
        orphaned_backups = []
        
        for dir_name in all_dirs:
            if "_backup_" in dir_name:
                # Extract vectorstore_id from backup directory name
                vs_id = dir_name.split("_backup_")[0]
                if vs_id not in [d.name for d in vs_dirs]:
                    orphaned_backups.append((dir_name, vs_id))
        
        # For each vector store, clean up its backups
        for vs_dir in vs_dirs:
            vs_id = vs_dir.name
            try:
                removed = cleanup_old_backups(vectorstore_dir, vs_id, max_per_store)
                total_removed += removed
            except Exception as e:
                logger.error(f"Error cleaning up backups for {vs_id}: {str(e)}")
                total_errors += 1
        
        # Clean up orphaned backups (ones without a corresponding vector store)
        orphaned_removed = 0
        for orphaned_backup, _ in orphaned_backups:
            try:
                backup_path = vectorstore_dir_path / orphaned_backup
                if backup_path.exists():
                    logger.info(f"Removing orphaned backup {orphaned_backup}")
                    shutil.rmtree(backup_path)
                    orphaned_removed += 1
                    total_removed += 1
            except Exception as e:
                logger.error(f"Error removing orphaned backup {orphaned_backup}: {str(e)}")
                total_errors += 1
        
        result = {
            "success": True,
            "message": f"Cleaned up {total_removed} old backups ({orphaned_removed} orphaned)",
            "removed_count": total_removed,
            "orphaned_count": orphaned_removed,
            "errors": total_errors
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error cleaning up backups: {str(e)}")
        return {
            "success": False,
            "message": f"Error cleaning up backups: {str(e)}",
        }

def log_system_resources(context: str = "") -> Dict[str, Any]:
    """
    Log system resource information.
    
    Args:
        context: Optional context string to include in the log
    
    Returns:
        Dictionary of system resource information
    """
    try:
        import psutil
        
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        
        # Get memory usage
        memory_used_mb = memory_info.rss / (1024 * 1024)
        
        # Get CPU usage
        cpu_percent = process.cpu_percent(interval=0.1)
        
        # Get system memory information
        system_memory = psutil.virtual_memory()
        system_memory_used_gb = system_memory.used / (1024 * 1024 * 1024)
        system_memory_total_gb = system_memory.total / (1024 * 1024 * 1024)
        system_memory_percent = system_memory.percent
        
        # Get disk information
        disk = psutil.disk_usage('/')
        disk_used_gb = disk.used / (1024 * 1024 * 1024)
        disk_total_gb = disk.total / (1024 * 1024 * 1024)
        disk_percent = disk.percent
        
        # Get open file count
        try:
            open_files = len(process.open_files())
        except Exception:
            open_files = -1
        
        # Create resource info dictionary
        resource_info = {
            "process": {
                "memory_mb": round(memory_used_mb, 1),
                "cpu_percent": round(cpu_percent, 1),
                "open_files": open_files
            },
            "system": {
                "memory_used_gb": round(system_memory_used_gb, 1),
                "memory_total_gb": round(system_memory_total_gb, 1),
                "memory_percent": round(system_memory_percent, 1),
                "disk_used_gb": round(disk_used_gb, 1),
                "disk_total_gb": round(disk_total_gb, 1),
                "disk_percent": round(disk_percent, 1)
            }
        }
        
        # Run garbage collection to reduce memory usage
        gc.collect()
        
        # Log resource information
        context_str = f" ({context})" if context else ""
        logger.info(f"System resources{context_str}: "
                   f"Process memory: {resource_info['process']['memory_mb']} MB, "
                   f"CPU: {resource_info['process']['cpu_percent']}%, "
                   f"System memory: {resource_info['system']['memory_percent']}%, "
                   f"Disk: {resource_info['system']['disk_percent']}%")
        
        return resource_info
        
    except Exception as e:
        logger.error(f"Error getting system resources: {str(e)}")
        return {
            "error": str(e)
        } 