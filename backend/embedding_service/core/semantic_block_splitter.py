"""
Custom TextSplitter for splitting documents based on semantic blocks
(paragraphs, list items) and detecting portion markings.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Iterable

from langchain_core.documents import Document
from langchain_text_splitters import TextSplitter

# Assuming normalize_security_classification is available
# We'll need to ensure it's imported correctly later
try:
    from .metadata import normalize_security_classification
except ImportError:
    try:
        from core.metadata import normalize_security_classification
    except ImportError:
        # Basic fallback if import fails
        def normalize_security_classification(classification: str) -> str:
            return classification.upper() if classification else "UNCLASSIFIED"

logger = logging.getLogger("embedding_service")

class SemanticBlockSplitter(TextSplitter):
    """Splits text into semantic blocks like paragraphs and list items,
    detecting portion markings for each block.

    Inherits from LangChain's TextSplitter.
    """

    def __init__(
        self,
        max_block_size: int = 1500, # Max characters per chunk
        min_block_size: int = 50,   # Min characters to consider a block
        document_metadata: Optional[Dict[str, Any]] = None, # Overall doc metadata
        **kwargs: Any,
    ) -> None:
        """Initialize the SemanticBlockSplitter.

        Args:
            max_block_size: Maximum number of characters allowed in a single chunk.
                          Blocks larger than this may be split further (with warnings).
            min_block_size: Minimum number of characters for a block to be considered.
                           Smaller blocks might be merged or ignored.
            document_metadata: Document-level metadata to inherit for chunks.
            **kwargs: Additional arguments passed to the parent TextSplitter.
        """
        super().__init__(**kwargs)
        self.max_block_size = max_block_size
        self.min_block_size = min_block_size
        self.document_metadata = document_metadata or {}
        # Regex to find portion markings like (U), (S), (C), (TS), (TS//...), etc.
        # Handles optional spaces and variations.
        # Looks for markings in parentheses, potentially preceded by whitespace or start of line,
        # and potentially followed by whitespace or end of line.
        # Allows classifications like C, S, TS, U and caveats like SCI, REL TO, FVEY
        # It captures the full marking including parentheses.
        self.portion_marking_regex = re.compile(
            r"(?:^|\s)(\((?:U|C|S|TS)(?:\/\/[\w\s\/,\-]+)?\))(?=\s|$)",
            re.IGNORECASE
        )
        # Classification hierarchy (lower index = lower classification)
        self.classification_order = ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP SECRET"]

    def _get_classification_level(self, normalized_classification: str) -> int:
        """Returns the integer level of a normalized classification."""
        base_classification = normalized_classification.split('//')[0]
        try:
            return self.classification_order.index(base_classification)
        except ValueError:
            logger.warning(f"Unknown base classification '{base_classification}' found.")
            return -1 # Unknown is lowest

    def _detect_portion_marking(self, block: str) -> Optional[str]:
        """Detects the highest portion marking within a block.

        Looks for markings at the beginning or end of the block.
        Returns the normalized classification string or None if not found.
        """
        if not block:
            return None

        found_markings = []

        # Check near the beginning (first ~70 chars or first line)
        first_line_break = block.find('\n')
        check_len_start = min(70, len(block)) if first_line_break == -1 else min(first_line_break, 70)
        start_text = block[:check_len_start]
        for match in self.portion_marking_regex.finditer(start_text):
            found_markings.append(match.group(1))

        # Check near the end (last ~70 chars or last line)
        last_line_break = block.rfind('\n')
        check_start_end = len(block) - 70 if last_line_break == -1 else max(last_line_break + 1, len(block) - 70)
        end_text = block[check_start_end:]
        for match in self.portion_marking_regex.finditer(end_text):
             # Avoid double-counting if start and end overlap significantly and have same marking
            if match.group(1) not in found_markings:
                found_markings.append(match.group(1))

        if not found_markings:
            #logger.debug(f"No portion marking detected in block: '{block[:50]}...'")
            return None

        # Normalize and find the highest classification
        highest_classification = None
        highest_level = -1

        for marking in found_markings:
            normalized = normalize_security_classification(marking)
            level = self._get_classification_level(normalized)

            if level > highest_level:
                highest_level = level
                highest_classification = normalized

        if highest_classification:
            logger.debug(f"Detected highest portion marking: {highest_classification} in block: '{block[:30]}...'")
        #else:
            #logger.debug(f"Could not determine highest classification from markings: {found_markings}")

        return highest_classification

    def _identify_semantic_blocks(self, text: str) -> List[str]:
        """Identifies semantic blocks (paragraphs, list items) in the text.

        Returns:
            A list of strings, where each string is a potential semantic block.
        """
        # More robust block identification logic
        lines = text.splitlines()
        blocks = []
        current_block_lines = []
        # Regex to identify start of list items (bullet points, numbers, letters)
        list_item_regex = re.compile(r"^\s*([-*+]|\d+\.|[a-zA-Z]\))\s+")

        for line in lines:
            stripped_line = line.strip()
            is_list_start = list_item_regex.match(stripped_line)
            is_blank_line = not stripped_line

            if is_blank_line:
                # Blank line signifies potential end of a paragraph or block
                if current_block_lines:
                    blocks.append("\n".join(current_block_lines))
                    current_block_lines = []
            elif is_list_start:
                # Start of a new list item always ends the previous block
                if current_block_lines:
                    blocks.append("\n".join(current_block_lines))
                current_block_lines = [stripped_line] # Start new block with list item
            else:
                # Regular line of text
                if not current_block_lines:
                    # Start of a new paragraph block
                    current_block_lines.append(stripped_line)
                else:
                    # Check if this line belongs to the current list item (indentation)
                    # or is part of the current paragraph
                    # Basic check: if previous was list, check indentation
                    prev_line = current_block_lines[-1]
                    is_prev_list = list_item_regex.match(prev_line)
                    # Simple indentation check (could be more sophisticated)
                    if is_prev_list and line.startswith(' ') and not list_item_regex.match(line):
                        current_block_lines.append(stripped_line) # Part of multi-line list item
                    elif not is_prev_list:
                        current_block_lines.append(stripped_line) # Part of paragraph
                    else:
                        # Line doesn't belong to current list item, end previous block
                        blocks.append("\n".join(current_block_lines))
                        current_block_lines = [stripped_line] # Start new paragraph block

        # Add any remaining lines as the last block
        if current_block_lines:
            blocks.append("\n".join(current_block_lines))

        # Filter out blocks smaller than min_block_size
        final_blocks = [b for b in blocks if len(b) >= self.min_block_size]

        logger.debug(f"Identified {len(final_blocks)} potential semantic blocks.")
        return final_blocks

    def split_text(self, text: str) -> List[str]:
        """Split text into chunks based on semantic blocks.

        This method is required by the TextSplitter interface but we will
        primarily use split_documents for richer metadata handling.

        Args:
            text: The text to split.

        Returns:
            A list of text chunks.
        """
        # For simplicity, this basic implementation just uses block identification.
        # A more complete implementation might handle merging/splitting blocks based
        # on size here, but it's better done in split_documents.
        return self._identify_semantic_blocks(text)

    def create_documents(
        self, texts: List[str], metadatas: Optional[List[dict]] = None
    ) -> List[Document]:
        """Create documents from texts and associate metadata.

        Extends the base method to ensure our specific metadata is handled.
        """
        # Ensure metadatas list exists and matches texts length
        _metadatas = metadatas or [{}] * len(texts)
        if len(texts) != len(_metadatas):
            raise ValueError("Number of texts and metadatas must match")

        documents = []
        for i, txt in enumerate(texts):
            metadata = _metadatas[i].copy() # Use a copy
            # Merge chunk-specific metadata with document-level metadata
            # Document metadata comes first, chunk metadata overrides if keys clash
            merged_metadata = {**self.document_metadata, **metadata}
            documents.append(Document(page_content=txt, metadata=merged_metadata))

        return documents

    def split_documents(self, documents: Iterable[Document]) -> List[Document]:
        """Splits Documents into semantic blocks, assigning portion markings.

        Args:
            documents: An iterable of Documents to split.

        Returns:
            A list of smaller Documents, chunked semantically with classifications.
        """
        texts, metadatas = [], []
        doc_index = 0
        for doc in documents:
            texts.append(doc.page_content)
            # Store original document metadata, add a doc index for reference
            original_metadata = doc.metadata.copy()
            original_metadata["original_doc_index"] = doc_index
            metadatas.append(original_metadata)
            doc_index += 1

        return self.split_documents_from_texts(texts, metadatas)

    def split_documents_from_texts(
        self, texts: Iterable[str], metadatas: Iterable[Dict[str, Any]]
    ) -> List[Document]:
        """Core logic to split texts based on semantic blocks.

        Args:
            texts: Iterable of text content from documents.
            metadatas: Iterable of corresponding document metadata.

        Returns:
            List of Documents chunked semantically.
        """
        final_chunks = []
        for i, (text, metadata) in enumerate(zip(texts, metadatas)):
            semantic_blocks = self._identify_semantic_blocks(text)
            doc_chunk_index = 0

            # Get document-level classification as default
            doc_classification = metadata.get("security_classification", "UNCLASSIFIED")
            # Normalize just in case it wasn't already
            doc_classification = normalize_security_classification(doc_classification)

            for block in semantic_blocks:
                # Detect portion marking for this specific block
                chunk_classification = self._detect_portion_marking(block)

                # Default to document classification if no block marking found
                if chunk_classification is None:
                    chunk_classification = doc_classification
                    logger.debug(f"Block '{block[:30]}...' has no marking, defaulting to doc level: {chunk_classification}")

                # TODO: Handle blocks larger than max_block_size
                if len(block) > self.max_block_size:
                    logger.warning(
                        f"Semantic block starting with '{block[:50]}...' exceeds max size "
                        f"({len(block)} > {self.max_block_size}). Currently not splitting further."
                    )
                    # Future enhancement: Split large blocks using a fallback splitter,
                    # inheriting the detected chunk_classification.

                # Create chunk metadata
                chunk_metadata = metadata.copy() # Start with original doc metadata
                chunk_metadata["chunk_classification"] = chunk_classification
                chunk_metadata["semantic_block_index"] = doc_chunk_index
                # Add other relevant chunk info if needed (e.g., block type: paragraph/list)

                final_chunks.append(
                    Document(page_content=block, metadata=chunk_metadata)
                )
                doc_chunk_index += 1

        logger.info(f"Split {len(texts)} documents into {len(final_chunks)} semantic chunks.")
        return final_chunks

    @classmethod
    def from_huggingface_tokenizer(cls, tokenizer: Any, **kwargs: Any) -> "TextSplitter":
        """Text splitter that uses HuggingFace tokenizer to count length."""
        # This method might need adjustment depending on base class requirements
        # For now, it's inherited but likely not directly used by our logic.
        raise NotImplementedError("SemanticBlockSplitter does not primarily rely on tokenizers for splitting.") 