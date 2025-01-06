from pathlib import Path
import json

def get_file_security_classification(filename):
    metadata_path = Path(filename).with_suffix('.metadata')
    if metadata_path.exists():
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
            return metadata.get('security_classification', 'Unclassified')
    return 'Unclassified'