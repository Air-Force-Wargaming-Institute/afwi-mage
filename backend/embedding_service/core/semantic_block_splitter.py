"""
Custom TextSplitter for splitting documents based on semantic blocks
(paragraphs, list items) and detecting portion markings.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Iterable

from langchain_core.documents import Document
from langchain_text_splitters import TextSplitter, RecursiveCharacterTextSplitter

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
        min_block_size: int = 50,   # Min characters to consider a block
        max_block_size_fallback: int = 5000, # Fallback max size for excessively large blocks
        document_metadata: Optional[Dict[str, Any]] = None, # Overall doc metadata
        **kwargs: Any,
    ) -> None:
        """Initialize the SemanticBlockSplitter.

        Args:
            min_block_size: Minimum number of characters for a block to be considered.
                           Smaller blocks might be merged or ignored.
            max_block_size_fallback: If a single identified semantic block (e.g., a very long paragraph)
                                    exceeds this size, it will be split further using a simpler method.
            document_metadata: Document-level metadata to inherit for chunks.
            **kwargs: Additional arguments passed to the parent TextSplitter.
        """
        # Extract max_block_size from kwargs if present, so it doesn't get passed to super()
        # We don't use it directly anymore in this class's primary logic.
        _ = kwargs.pop('max_block_size', None)

        # Pass chunk_size and chunk_overlap (from kwargs if provided) to parent for potential use,
        # but our primary logic won't use them directly for splitting semantic blocks.
        # Provide defaults if not present in kwargs.
        kwargs.setdefault('chunk_size', 1000)
        kwargs.setdefault('chunk_overlap', 100)
        super().__init__(**kwargs)
        # Store chunk_size and chunk_overlap for fallback splitter
        self._fallback_chunk_size = kwargs['chunk_size']
        self._fallback_chunk_overlap = kwargs['chunk_overlap']

        self.min_block_size = min_block_size
        self.max_block_size_fallback = max_block_size_fallback
        self.document_metadata = document_metadata or {}
        # Regex to find portion markings like (U), (S), (C), (TS), (TS//...), etc.
        # Handles optional spaces and variations.
        # Looks for markings in parentheses, potentially preceded by whitespace or start of line,
        # and potentially followed by whitespace or end of line.
        # Allows classifications like C, S, TS, U and caveats like SCI, REL TO, FVEY
        # It captures the full marking including parentheses.
        self.portion_marking_regex = re.compile(
            r"(?:^|\s)(\((?:U|C|S|TS|FOUO)(?:\/\/[A-Z0-9\s\/,\-]+)?\))(?=\s|$)", # Added FOUO
            re.IGNORECASE
        )
        # Classification hierarchy (lower index = lower classification)
        self.classification_order = ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP SECRET"]
        # Regex to identify start of list items (bullet points, numbers, letters)
        self.list_item_regex = re.compile(r"^\s*(?:[-*+]|\d+\.|[a-zA-Z][).])\s+")
        # Regex to check for indentation (more than just start of line whitespace)
        self.indentation_regex = re.compile(r"^\s{2,}") # Matches 2 or more spaces at the start

        # Initialize fallback splitter for oversized blocks
        self._fallback_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self._fallback_chunk_size,
            chunk_overlap=self._fallback_chunk_overlap
        )


    def _get_classification_level(self, normalized_classification: str) -> int:
        """Returns the integer level of a normalized classification."""
        # Handle potential caveats like FOUO
        if normalized_classification.startswith("FOUO"):
            base_classification = "UNCLASSIFIED" # Treat FOUO as UNCLASSIFIED for level
        else:
            base_classification = normalized_classification.split('//')[0]

        try:
            return self.classification_order.index(base_classification)
        except ValueError:
            logger.warning(f"Unknown base classification '{base_classification}' found in '{normalized_classification}'.")
            # If base isn't recognized, assume lowest level
            return -1

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
        highest_level = -2 # Initialize lower than unknown (-1)

        for marking in found_markings:
            # Extract content inside parentheses for normalization
            marking_content = marking.strip()[1:-1] # Remove '(' and ')'
            normalized = normalize_security_classification(marking_content)
            level = self._get_classification_level(normalized)

            if level > highest_level:
                highest_level = level
                highest_classification = normalized
            # If levels are equal, potentially merge caveats later if needed
            # For now, just take the first one encountered at the highest level

        if highest_classification:
            logger.debug(f"Detected highest portion marking: {highest_classification} in block: '{block[:30]}...'")
        #else:
            #logger.debug(f"Could not determine highest classification from markings: {found_markings}")

        return highest_classification

    def _is_indented(self, line: str, base_indent: int) -> bool:
        """Check if a line is indented relative to a base indentation level."""
        match = re.match(r"^(\s*)", line)
        if match:
            indent_level = len(match.group(1))
            return indent_level > base_indent
        return False

    def _get_indentation(self, line: str) -> int:
        """Get the indentation level (number of leading spaces) of a line."""
        match = re.match(r"^(\s*)", line)
        return len(match.group(1)) if match else 0

    def _identify_semantic_blocks(self, text: str) -> List[str]:
        """Identifies semantic blocks (paragraphs, list items) in the text.

        Handles multi-line list items based on indentation.

        Returns:
            A list of strings, where each string is a potential semantic block.
        """
        lines = text.splitlines()
        blocks = []
        current_block_lines = []
        current_block_indent = 0
        in_list_item = False

        for line in lines:
            stripped_line = line.strip()
            is_blank_line = not stripped_line
            is_list_start = self.list_item_regex.match(line) # Match on original line for indent
            current_line_indent = self._get_indentation(line)

            # Determine if the current block should end
            should_end_block = False
            if is_blank_line:
                should_end_block = True
            elif is_list_start:
                should_end_block = True # Always end previous block on new list item
            elif in_list_item and current_line_indent < current_block_indent:
                # Dedented line ends the current list item block
                should_end_block = True
            elif not in_list_item and current_block_lines and not self.indentation_regex.match(line):
                 # If not in list and line is not indented, could start new paragraph block
                 # unless previous line was also not indented (part of same paragraph)
                 if not self.indentation_regex.match(current_block_lines[-1]):
                     pass # Continue paragraph
                 # else: # Previous line was indented, this one is not - start new block?
                 # This needs more careful thought - for now, rely on blank lines mostly
                 pass


            # End the current block if necessary
            if should_end_block and current_block_lines:
                block_text = "\n".join(current_block_lines).strip()
                if len(block_text) >= self.min_block_size:
                    blocks.append(block_text)
                current_block_lines = []
                in_list_item = False
                current_block_indent = 0

            # Process the current line
            if is_blank_line:
                continue # Skip blank lines after potentially ending a block

            if is_list_start:
                current_block_lines = [line] # Start new block with original line (preserves indent)
                in_list_item = True
                current_block_indent = current_line_indent # Base indent for this list item
            elif not current_block_lines:
                # Start of a new block (likely paragraph)
                current_block_lines = [line]
                in_list_item = False
                current_block_indent = current_line_indent
            else:
                # Continue current block
                # If in list item, check if current line is indented properly
                if in_list_item:
                    if current_line_indent >= current_block_indent:
                        # Treat as part of the list item, even if slightly less indented
                        # (e.g., handling wrapped lines)
                        current_block_lines.append(line)
                    else:
                        # Dedented line, already handled by should_end_block logic
                        pass
                else:
                    # Continue paragraph
                    current_block_lines.append(line)

        # Add any remaining lines as the last block
        if current_block_lines:
            block_text = "\n".join(current_block_lines).strip()
            if len(block_text) >= self.min_block_size:
                blocks.append(block_text)

        # Filter out any potentially empty strings added during processing
        final_blocks = [b for b in blocks if b]

        logger.debug(f"Identified {len(final_blocks)} semantic blocks after filtering.")
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

        Handles fallback splitting for blocks exceeding max_block_size_fallback.

        Args:
            texts: Iterable of text content from documents.
            metadatas: Iterable of corresponding document metadata (one dict per text).
                       This should contain metadata specific to the text being processed
                       (e.g., page number if applicable), which will be merged with
                       the base document metadata held in self.document_metadata.

        Returns:
            List of Documents chunked semantically.
        """
        final_chunks = []
        # Use enumerate to track index, which corresponds to the metadatas list
        for i, text in enumerate(texts):
            # Get the corresponding input metadata specific to this text (e.g., page data)
            input_metadata = metadatas[i].copy() if i < len(metadatas) else {}

            if not text: # Skip empty texts
                continue
            semantic_blocks = self._identify_semantic_blocks(text)
            doc_chunk_index = 0 # Renamed for clarity, this is the semantic block index within this *text*

            # Get document-level classification from the base metadata as default
            # Use self.document_metadata which was set during init
            base_doc_classification = normalize_security_classification(
                self.document_metadata.get("security_classification", "UNCLASSIFIED")
            )

            for block_index, block in enumerate(semantic_blocks):
                chunk_classification = self._detect_portion_marking(block)

                # Default to document classification if no block marking found
                if chunk_classification is None:
                    chunk_classification = base_doc_classification

                # Check if block exceeds fallback size limit
                if len(block) > self.max_block_size_fallback:
                    logger.warning(
                        f"Semantic block {block_index} (starting '{block[:50]}...') exceeds fallback size "
                        f"({len(block)} > {self.max_block_size_fallback}). Splitting further."
                    )
                    # Use fallback splitter on this large block
                    fallback_sub_chunks = self._fallback_splitter.split_text(block)
                    for sub_chunk_index, sub_chunk in enumerate(fallback_sub_chunks):
                        # Base metadata for sub-chunk IS self.document_metadata
                        chunk_metadata = self.document_metadata.copy()
                        # Merge the metadata specific to the text block it came from (input_metadata)
                        chunk_metadata.update(input_metadata)
                        # Add/override with chunk-specific info
                        chunk_metadata["chunk_classification"] = chunk_classification # Use block's detected/inherited classification
                        chunk_metadata["semantic_block_index"] = doc_chunk_index # Index of the parent semantic block
                        chunk_metadata["sub_chunk_index"] = sub_chunk_index # Add sub-chunk index
                        chunk_metadata["split_reason"] = "oversized_semantic_block" # Indicate why it was split

                        # Ensure critical base fields are present if somehow lost (defensive)
                        if "document_id" not in chunk_metadata and "document_id" in self.document_metadata:
                            chunk_metadata["document_id"] = self.document_metadata["document_id"]
                        if "original_filename" not in chunk_metadata and "original_filename" in self.document_metadata:
                             chunk_metadata["original_filename"] = self.document_metadata["original_filename"]


                        final_chunks.append(
                            Document(page_content=sub_chunk, metadata=chunk_metadata)
                        )
                else:
                    # Block is within size limits, add as a single chunk
                    # Base metadata IS self.document_metadata
                    chunk_metadata = self.document_metadata.copy()
                    # Merge the metadata specific to the text block it came from (input_metadata)
                    chunk_metadata.update(input_metadata)
                    # Add/override with chunk-specific info
                    chunk_metadata["chunk_classification"] = chunk_classification
                    chunk_metadata["semantic_block_index"] = doc_chunk_index

                    # Ensure critical base fields are present if somehow lost (defensive)
                    if "document_id" not in chunk_metadata and "document_id" in self.document_metadata:
                        chunk_metadata["document_id"] = self.document_metadata["document_id"]
                    if "original_filename" not in chunk_metadata and "original_filename" in self.document_metadata:
                            chunk_metadata["original_filename"] = self.document_metadata["original_filename"]

                    final_chunks.append(
                        Document(page_content=block, metadata=chunk_metadata)
                    )

                doc_chunk_index += 1 # Increment semantic block index

        logger.info(f"Split {len(list(texts))} raw text(s) into {len(final_chunks)} final chunks.")
        return final_chunks

    @classmethod
    def from_huggingface_tokenizer(cls, tokenizer: Any, **kwargs: Any) -> "TextSplitter":
        """Text splitter that uses HuggingFace tokenizer to count length."""
        # This method might need adjustment depending on base class requirements
        # For now, it's inherited but likely not directly used by our logic.
        raise NotImplementedError("SemanticBlockSplitter does not primarily rely on tokenizers for splitting.") 