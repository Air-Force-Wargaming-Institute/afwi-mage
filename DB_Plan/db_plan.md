# MAGE Backend Database Integration Plan

**Goal:** Transition MAGE services from file-based storage to a robust, centralized PostgreSQL database system for improved data management, integrity, scalability, and queryability.

## Foundational Data Persistence

*   All PostgreSQL database instances (primarily the central `db` service) will utilize Docker named volumes (e.g., `postgres_data`) mapped to the PostgreSQL data directory (`/var/lib/postgresql/data`). This ensures that database data persists independently of the container lifecycle, preventing data loss on container restarts, rebuilds, or in a Kubernetes environment where Pods are ephemeral.
*   Application services will connect to these persistent database services and will not store primary relational data within their own container filesystems.
*   File-based assets (e.g., user uploads, ML models) will also be managed via Docker volumes mapped to host directories or named volumes to ensure their persistence.

## Phase 0: API Gateway, Authentication, and Multi-Tenancy Considerations

Before individual service database design, the following principles must be applied across the backend to ensure proper multi-user support, data isolation, and security:

1.  **User Identity Propagation**:
    *   The API Gateway (Traefik + `auth_service`) is responsible for authenticating users and propagating user identity to downstream services.
    *   Standard headers like `X-User-ID`, `X-Username`, and `X-User-Permission` will be injected by the `auth-middleware` after successful token validation.
    *   All backend services handling user-specific data **must** be designed to receive and utilize the `X-User-ID` header.

2.  **Database Schema for Multi-Tenancy**:
    *   Tables storing user-generated or user-associated data **must** include a `user_id` column (or an equivalent foreign key if a central user table is ever introduced). This column will store the `X-User-ID`.
    *   The `user_id` column should be indexed in each relevant table to ensure efficient querying for user-specific data.

3.  **Data Isolation and Access Control**:
    *   **Read Operations**: When services fetch data (e.g., listing files, retrieving chat history), database queries **must** be filtered by the `user_id` obtained from the `X-User-ID` header. This ensures users only see data they own or are permitted to access.
    *   **Write Operations**: Create, update, and delete operations must ensure that data is correctly associated with the `user_id` of the acting user. Ownership checks (verifying the `user_id` on the record matches the `X-User-ID` from the request) are critical before modifications or deletions.

4.  **Role-Based Access Control (RBAC)**:
    *   The `X-User-Permission` header (e.g., 'admin', 'data_scientist', 'basic_user') should be used by services to implement RBAC.
    *   Service logic can check this permission to grant broader access (e.g., an 'admin' viewing data across multiple users) or restrict actions based on role.

5.  **Shared vs. Private Resources**:
    *   For resources that might be public or shared system-wide (e.g., public templates, default configurations), the database schema must differentiate these from user-specific data. This can be achieved through:
        *   A nullable `user_id` (where `NULL` implies a system/public resource).
        *   A dedicated `is_public` boolean column.
        *   Separate tables for user-specific versus system/public resources.

6.  **Auditing (Future Consideration)**:
    *   Consider adding `created_by_user_id` and `last_modified_by_user_id` columns to tables for auditing purposes, in addition to ownership `user_id`.

## Phase 1: Consolidate Existing & Enable Core Databases

1.  **Central PostgreSQL Instance (`db` service in `docker-compose.yml`):**
    *   **Action:** Verify the `init-multiple-databases.sh` script and the `POSTGRES_MULTIPLE_DATABASES` environment variable in the `db` service.
    *   **Current Databases:** `dbname` (for `core_service`), `authdb` (for `auth_service`), `transcriptiondb` (for `transcription_service`).
    *   **Databases to Add/Enable on this Instance:**
        *   `chat_db` (for `chat_service`)
        *   `agent_db` (for `agent_service`)
        *   `direct_chat_db` (for `direct_chat_service`)
        *   `upload_db` (for `upload_service`)
        *   `embedding_db` (for `embedding_service`)
        *   `workbench_db` (for `workbench_service`)
        *   `extraction_db` (for `extraction_service`)
        *   `report_builder_db` (for `report_builder_service`)
        *   `wargame_db` (for `wargame_service`)
    *   **Task:** Update `POSTGRES_MULTIPLE_DATABASES` in `docker-compose.yml` for the `db` service to include all the database names listed above.
        ```diff
        --- a/backend/docker-compose.yml
        +++ b/backend/docker-compose.yml
        @@ -164,7 +164,7 @@
         environment:
         POSTGRES_USER: ${POSTGRES_USER:-postgres}
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
        -     POSTGRES_MULTIPLE_DATABASES: dbname,authdb,transcriptiondb
        +     POSTGRES_MULTIPLE_DATABASES: dbname,authdb,transcriptiondb,chat_db,agent_db,direct_chat_db,upload_db,embedding_db,workbench_db,extraction_db,report_builder_db,wargame_db
         volumes:
         - postgres_data:/var/lib/postgresql/data
         networks:
        ```

2.  **Configure Services to Use Their Databases:**
    *   **For `chat_service`, `agent_service`, `direct_chat_service`:**
        *   **Task:** Update their `DATABASE_URL` environment variables in `docker-compose.yml` to point to the central `db` service (e.g., `postgresql://postgres:password@db:5432/chat_db`). Ensure `depends_on: db` with `condition: service_healthy` is set.
    *   **For `upload_service`, `embedding_service`, `workbench_service`, `extraction_service`, `report_builder_service`, `wargame_service`:**
        *   **Task:** Add `DATABASE_URL` environment variables to their definitions in `docker-compose.yml`, pointing to the central `db` service and their newly assigned database name (e.g., `postgresql://postgres:password@db:5432/upload_db`).
        *   **Task:** Add `depends_on: db` (condition: `service_healthy`) for these services.
        *   **Task:** Update their respective `config.py` files to read and use this `DATABASE_URL`.

## Phase 2: Data Modeling and ORM Implementation (Service by Service)

For each service identified as needing database integration:

1.  **`upload_service` (File Metadata - `upload_db`)**
    *   **Primary Table: `uploaded_files`**
        | Column Name                 | Data Type      | Constraints & Notes                                                                 |
        | :-------------------------- | :------------- | :---------------------------------------------------------------------------------- |
        | `id`                        | `UUID`         | Primary Key (Unique `document_id`)                                                  |
        | `user_id`                   | `VARCHAR(255)` | Not Null, Indexed (Stores `X-User-ID` from gateway)                               |
        | `original_filename`         | `VARCHAR(255)` | Not Null                                                                            |
        | `stored_filename`           | `VARCHAR(255)` | Not Null (Actual filename on disk, consider UUID prefix for global uniqueness)        |
        | `storage_path_relative`     | `TEXT`         | Not Null (Path relative to `UPLOAD_DIR`, e.g., `user_id_subdir/folder/`)            |
        | `file_type_detected`        | `VARCHAR(10)`  | (e.g., 'PDF', 'DOCX', 'TXT')                                                        |
        | `mime_type`                 | `VARCHAR(100)` | (e.g., `application/pdf`)                                                           |
        | `size_bytes`                | `BIGINT`       | Not Null                                                                            |
        | `upload_timestamp`          | `TIMESTAMPZ`   | Not Null, Default `CURRENT_TIMESTAMP`                                               |
        | `security_classification`   | `VARCHAR(50)`  | Default 'UNCLASSIFIED'                                                              |
        | `conversion_status`         | `VARCHAR(20)`  | (e.g., 'pending', 'converted_to_pdf', 'failed', 'not_applicable')                   |
        | `converted_pdf_filename`    | `VARCHAR(255)` | Nullable                                                                            |
        | `pdf_page_count`            | `INTEGER`      | Nullable                                                                            |
        | `pdf_extracted_metadata`    | `JSONB`        | Nullable (Metadata from PDF, e.g., title, author)                                   |
        | `content_checksum_sha256`   | `VARCHAR(64)`  | Nullable, Indexed (For duplicate detection)                                         |
        | `last_modified_timestamp`   | `TIMESTAMPZ`   | Not Null, Default `CURRENT_TIMESTAMP`, `ON UPDATE CURRENT_TIMESTAMP`                  |
        | `is_deleted`                | `BOOLEAN`      | Default `FALSE` (For soft deletes)                                                  |
        | `deletion_timestamp`        | `TIMESTAMPZ`   | Nullable                                                                            |

    *   **Tasks:**
        *   Create `models.py` with the SQLAlchemy model for `uploaded_files`.
        *   Modify `upload_routes.py`:
            *   On file upload: Receive `X-User-ID` from headers. Save file metadata to the `uploaded_files` table, populating `user_id`.
            *   On file listing: Receive `X-User-ID`. Query `uploaded_files` table, filtering by `user_id` and `is_deleted = FALSE`.
            *   On file deletion: Receive `X-User-ID`. Verify ownership (`user_id` match) before marking as deleted or removing the record/file.
            *   On security update: Receive `X-User-ID`. Verify ownership before updating.
        *   Add `database.py` for engine/session setup (SQLAlchemy).
        *   Ensure `app.py` initializes tables on startup (e.g., `Base.metadata.create_all(bind=engine)`).
        *   Consider file storage strategy: Store files in user-specific subdirectories within `UPLOAD_DIR` (e.g., `UPLOAD_DIR/<user_id>/...`) to enhance isolation and simplify path management. `storage_path_relative` would reflect this.

2.  **`wargame_service` (Wargame Builds - `wargame_db`)**
    *   **Primary Table: `wargames`** (Corresponds to `WargameBuild` Pydantic model)
        | Column Name                   | Data Type        | Constraints & Notes                                                              |
        | :---------------------------- | :--------------- | :------------------------------------------------------------------------------- |
        | `id`                          | `UUID`           | Primary Key                                                                      |
        | `user_id`                     | `VARCHAR(255)`   | Not Null, Indexed (Owner of the wargame build)                                   |
        | `name`                        | `VARCHAR(255)`   | Not Null                                                                         |
        | `description`                 | `TEXT`           | Nullable                                                                         |
        | `designer_name`               | `VARCHAR(255)`   | Nullable                                                                         |
        | `security_classification`     | `VARCHAR(50)`    | Nullable                                                                         |
        | `road_to_war`                 | `TEXT`           | Nullable                                                                         |
        | `research_objectives`         | `TEXT[]`         | Nullable (PostgreSQL array of strings)                                           |
        | `number_of_iterations`        | `INTEGER`        | Default 5                                                                        |
        | `number_of_moves`             | `INTEGER`        | Default 10                                                                       |
        | `time_horizon`                | `VARCHAR(100)`   | Nullable                                                                         |
        | `wargame_start_date`          | `VARCHAR(50)`    | Nullable (Consider DATE or TIMESTAMP type)                                       |
        | `selected_vectorstore_id`     | `VARCHAR(255)`   | Nullable (ID of a vector store from `embedding_service`)                         |
        | `selected_database_id`        | `VARCHAR(255)`   | Nullable (If referencing another MAGE DB resource, clarify which)                |
        | `approved_fields_json`        | `JSONB`          | Nullable (Stores `WargameBuild.approvedFields: Dict[str, bool]`)                 |
        | `created_at`                  | `TIMESTAMPZ`     | Not Null, Default `CURRENT_TIMESTAMP`                                            |
        | `modified_at`                 | `TIMESTAMPZ`     | Not Null, Default `CURRENT_TIMESTAMP`, `ON UPDATE CURRENT_TIMESTAMP`               |
        | `last_executed_at`            | `TIMESTAMPZ`     | Nullable                                                                         |

    *   **Table: `wargame_activated_entities`** (Corresponds to `WargameBuild.activatedEntities: List[ActivatedEntity]`)
        | Column Name                   | Data Type        | Constraints & Notes                                                              |
        | :---------------------------- | :--------------- | :------------------------------------------------------------------------------- |
        | `id`                          | `UUID`           | Primary Key (for this table row)                                                 |
        | `wargame_id`                  | `UUID`           | Not Null, FK to `wargames.id` (ON DELETE CASCADE)                                |
        | `entity_id_source`            | `VARCHAR(255)`   | Not Null (Original ID of the entity, e.g., country code)                         |
        | `entity_name`                 | `VARCHAR(255)`   | Not Null                                                                         |
        | `entity_type`                 | `VARCHAR(50)`    | Not Null (e.g., "nation", "organization")                                        |
        | `is_configured`               | `BOOLEAN`        | Default FALSE                                                                    |
        | `is_custom_entity_link`       | `BOOLEAN`        | Default FALSE (True if links to `wargame_custom_entities`)                       |
        | `config_data_json`            | `JSONB`          | Nullable (Stores the full `ConfigData` Pydantic model for this entity)           |

    *   **Table: `wargame_custom_entities`** (Corresponds to `WargameBuild.customEntities: List[CustomEntity]`)
        | Column Name                   | Data Type        | Constraints & Notes                                                              |
        | :---------------------------- | :--------------- | :------------------------------------------------------------------------------- |
        | `id`                          | `UUID`           | Primary Key (for this table row)                                                 |
        | `wargame_id`                  | `UUID`           | Not Null, FK to `wargames.id` (ON DELETE CASCADE)                                |
        | `custom_entity_id_source`     | `VARCHAR(255)`   | Not Null (User-defined ID for this custom entity within the wargame)             |
        | `entity_name`                 | `VARCHAR(255)`   | Not Null                                                                         |
        | `entity_type`                 | `VARCHAR(50)`    | Not Null (e.g., "insurgent_group", "corporation")                                |

    *   **Table: `wargame_entity_relationships`** (For dyadic relationships, Pydantic schema for `nationRelationships` might need adjustment from `Dict[str, NationRelationship]` to `List[DyadicRelationship]` for clarity)
        | Column Name                   | Data Type        | Constraints & Notes                                                              |
        | :---------------------------- | :--------------- | :------------------------------------------------------------------------------- |
        | `id`                          | `SERIAL`         | Primary Key                                                                      |
        | `wargame_id`                  | `UUID`           | Not Null, FK to `wargames.id` (ON DELETE CASCADE)                                |
        | `source_entity_id_source`     | `VARCHAR(255)`   | Not Null (Refers to `entity_id_source` of an activated entity)                   |
        | `target_entity_id_source`     | `VARCHAR(255)`   | Not Null (Refers to `entity_id_source` of another activated entity)              |
        | `relationship_type`           | `VARCHAR(50)`    | Not Null (e.g., "ally", "neutral", "adversary")                                |
        | `notes`                       | `TEXT`           | Nullable                                                                         |

    *   **Table: `wargame_conflict_theaters`** (Corresponds to `WargameBuild.conflictTheaters: List[ConflictTheater]`)
        | Column Name                   | Data Type        | Constraints & Notes                                                              |
        | :---------------------------- | :--------------- | :------------------------------------------------------------------------------- |
        | `id`                          | `UUID`           | Primary Key (for this table row)                                                 |
        | `wargame_id`                  | `UUID`           | Not Null, FK to `wargames.id` (ON DELETE CASCADE)                                |
        | `cocom_id`                    | `VARCHAR(50)`    | Not Null (e.g., "AFRICOM", "CENTCOM")                                            |
        | `name`                        | `VARCHAR(255)`   | Not Null (User-editable display name)                                            |
        | `description`                 | `TEXT`           | Nullable                                                                         |
        | `is_active`                   | `BOOLEAN`        | Default FALSE                                                                    |
        | `functional_cocoms_json`      | `JSONB`          | Nullable (Stores `ConflictTheater.functionalCocoms: Dict[str, bool]`)               |

    *   **Table: `wargame_conflict_theater_sides`** (Corresponds to `ConflictTheater.sides: List[ConflictTheaterSide]`)
        | Column Name                   | Data Type        | Constraints & Notes                                                              |
        | :---------------------------- | :--------------- | :------------------------------------------------------------------------------- |
        | `id`                          | `UUID`           | Primary Key (for this table row)                                                 |
        | `conflict_theater_id`         | `UUID`           | Not Null, FK to `wargame_conflict_theaters.id` (ON DELETE CASCADE)               |
        | `side_identifier`             | `VARCHAR(10)`    | Not Null (e.g., "side1", "side2")                                              |
        | `lead_nation_entity_id_source`| `VARCHAR(255)`   | Nullable (Refers to `entity_id_source` of an activated entity)                   |
        | `color_code`                  | `VARCHAR(20)`    | Nullable                                                                         |

    *   **Table: `wargame_conflict_theater_side_nations`** (Join table for `ConflictTheaterSide.supportingNationIds`)
        | Column Name                   | Data Type        | Constraints & Notes                                                              |
        | :---------------------------- | :--------------- | :------------------------------------------------------------------------------- |
        | `id`                          | `SERIAL`         | Primary Key                                                                      |
        | `conflict_theater_side_id`    | `UUID`           | Not Null, FK to `wargame_conflict_theater_sides.id` (ON DELETE CASCADE)          |
        | `nation_entity_id_source`     | `VARCHAR(255)`   | Not Null (Refers to `entity_id_source` of an activated entity)                   |
        | *Constraint:*                 |                  | Unique (`conflict_theater_side_id`, `nation_entity_id_source`)                   |

    *   **Table: `wargame_document_references`** (For `GeneralConfig.supportingDocuments` and `MilitaryConfig.doctrineFiles`)
        | Column Name                   | Data Type        | Constraints & Notes                                                              |
        | :---------------------------- | :--------------- | :------------------------------------------------------------------------------- |
        | `id`                          | `SERIAL`         | Primary Key                                                                      |
        | `wargame_id`                  | `UUID`           | Not Null, FK to `wargames.id` (ON DELETE CASCADE)                                |
        | `activated_entity_id`         | `UUID`           | Nullable, FK to `wargame_activated_entities.id` (for entity-specific docs like doctrine) |
        | `reference_type`              | `VARCHAR(50)`    | Not Null (e.g., "supporting_document", "doctrine_file")                        |
        | `uploaded_file_id`            | `UUID`           | Not Null (FK to `upload_service.uploaded_files.id`)                              |
        | `display_name_override`       | `VARCHAR(255)`   | Nullable                                                                         |
        | `description_notes`           | `TEXT`           | Nullable                                                                         |

    *   **Tasks:**
        *   Create `models.py` with SQLAlchemy models for these tables.
        *   Rewrite `crud.py` to use SQLAlchemy for all operations (create, read, update, delete wargame builds).
            *   `create_new_wargame`: Must accept `user_id` and store it in `wargames.user_id`.
            *   Read operations (`get_wargame`, `get_all_wargames_list`): Must filter by `wargames.user_id` based on `X-User-ID` header (unless admin).
            *   Update/Delete operations: Must verify `wargames.user_id` against `X-User-ID` before proceeding (unless admin).
        *   Add `database.py` for engine/session setup.
        *   Ensure `app.py` initializes tables on startup.
        *   API endpoints in `api/v1/endpoints/wargames.py` must be updated to extract `X-User-ID` and `X-User-Permission` from request headers and pass `user_id` to CRUD functions.

3.  **`embedding_service` (Vector Stores, Documents, Embeddings - `embedding_db`)**
    
    **Note:** FAISS vector indexes and embeddings will remain file-based for performance, but metadata will move to PostgreSQL.

    *   **Table: `vector_stores`**
        | Column Name                 | Data Type      | Constraints & Notes                                                                 |
        | :-------------------------- | :------------- | :---------------------------------------------------------------------------------- |
        | `id`                        | `UUID`         | Primary Key (Vector store ID)                                                       |
        | `user_id`                   | `VARCHAR(255)` | Not Null, Indexed (Owner of the vector store)                                       |
        | `name`                      | `VARCHAR(255)` | Not Null                                                                            |
        | `description`               | `TEXT`         | Nullable                                                                            |
        | `embedding_model_name`      | `VARCHAR(255)` | Not Null (e.g., '/models/bge-base-en-v1.5')                                        |
        | `embedding_dimension`       | `INTEGER`      | Not Null (e.g., 768)                                                               |
        | `chunk_size`                | `INTEGER`      | Default 1000                                                                        |
        | `chunk_overlap`             | `INTEGER`      | Default 100                                                                         |
        | `chunking_method`           | `VARCHAR(20)`  | Default 'semantic' (e.g., 'semantic', 'fixed')                                     |
        | `max_paragraph_length`      | `INTEGER`      | Nullable (for semantic chunking)                                                    |
        | `min_paragraph_length`      | `INTEGER`      | Nullable (for semantic chunking)                                                    |
        | `faiss_index_path`          | `VARCHAR(500)` | Not Null (Path to FAISS index directory)                                           |
        | `total_chunks`              | `INTEGER`      | Default 0 (Total number of chunks)                                                 |
        | `total_documents`           | `INTEGER`      | Default 0 (Total number of source documents)                                       |
        | `created_at`                | `TIMESTAMPZ`   | Not Null, Default `CURRENT_TIMESTAMP`                                               |
        | `updated_at`                | `TIMESTAMPZ`   | Not Null, Default `CURRENT_TIMESTAMP`, `ON UPDATE CURRENT_TIMESTAMP`                  |
        | `is_deleted`                | `BOOLEAN`      | Default `FALSE`                                                                     |

    *   **Table: `vector_store_documents`**
        | Column Name                 | Data Type      | Constraints & Notes                                                                 |
        | :-------------------------- | :------------- | :---------------------------------------------------------------------------------- |
        | `id`                        | `UUID`         | Primary Key                                                                          |
        | `vector_store_id`           | `UUID`         | Not Null, FK to `vector_stores.id` (ON DELETE CASCADE)                             |
        | `user_id`                   | `VARCHAR(255)` | Not Null, Indexed (For direct user access checks)                                  |
        | `uploaded_file_id`          | `UUID`         | Not Null, FK to `upload_service.uploaded_files.id`                                 |
        | `document_id`               | `VARCHAR(255)` | Not Null, Indexed (Unique identifier for this document in this vector store)       |
        | `original_filename`         | `VARCHAR(255)` | Not Null                                                                            |
        | `document_type`             | `VARCHAR(20)`  | Not Null (e.g., 'PDF', 'DOCX', 'TXT')                                              |
        | `page_count`                | `INTEGER`      | Nullable                                                                            |
        | `word_count`                | `INTEGER`      | Nullable                                                                            |
        | `security_classification`   | `VARCHAR(50)`  | Not Null, Default 'UNCLASSIFIED'                                                   |
        | `processing_status`         | `VARCHAR(20)`  | Not Null, Default 'pending' ('pending', 'processing', 'completed', 'failed')      |
        | `processing_error`          | `TEXT`         | Nullable                                                                            |
        | `chunk_count`               | `INTEGER`      | Default 0                                                                           |
        | `added_at`                  | `TIMESTAMPZ`   | Not Null, Default `CURRENT_TIMESTAMP`                                               |
        | `processed_at`              | `TIMESTAMPZ`   | Nullable                                                                            |

    *   **Table: `document_chunks`**
        | Column Name                 | Data Type      | Constraints & Notes                                                                 |
        | :-------------------------- | :------------- | :---------------------------------------------------------------------------------- |
        | `id`                        | `SERIAL`       | Primary Key                                                                          |
        | `vector_store_id`           | `UUID`         | Not Null, FK to `vector_stores.id` (ON DELETE CASCADE)                             |
        | `document_id`               | `VARCHAR(255)` | Not Null, Indexed (References `vector_store_documents.document_id`)                |
        | `user_id`                   | `VARCHAR(255)` | Not Null, Indexed (For direct user access checks)                                  |
        | `chunk_index`               | `INTEGER`      | Not Null (Index within the document)                                               |
        | `semantic_block_index`      | `INTEGER`      | Nullable (For semantic chunking)                                                    |
        | `sub_chunk_index`           | `INTEGER`      | Nullable (For chunks split due to size)                                            |
        | `text_content`              | `TEXT`         | Not Null (The actual text content)                                                 |
        | `text_length`               | `INTEGER`      | Not Null                                                                            |
        | `chunk_classification`      | `VARCHAR(50)`  | Not Null (Chunk-level security classification)                                     |
        | `page_number`               | `INTEGER`      | Nullable                                                                            |
        | `faiss_vector_id`           | `INTEGER`      | Nullable (Index in FAISS vector store)                                             |
        | `text_hash`                 | `VARCHAR(64)`  | Not Null, Indexed (SHA256 hash for deduplication)                                  |
        | `created_at`                | `TIMESTAMPZ`   | Not Null, Default `CURRENT_TIMESTAMP`                                               |

    *   **Table: `chunk_metadata`**
        | Column Name                 | Data Type      | Constraints & Notes                                                                 |
        | :-------------------------- | :------------- | :---------------------------------------------------------------------------------- |
        | `chunk_id`                  | `INTEGER`      | Primary Key, FK to `document_chunks.id` (ON DELETE CASCADE)                        |
        | `portion_marking_detected`  | `VARCHAR(50)`  | Nullable (Detected portion marking like "(S)", "(U)")                              |
        | `portion_marking_location`  | `VARCHAR(20)`  | Nullable ('start', 'end', 'both')                                                  |
        | `is_list_item`              | `BOOLEAN`      | Default `FALSE`                                                                     |
        | `indentation_level`         | `INTEGER`      | Default 0                                                                           |
        | `split_reason`              | `VARCHAR(50)`  | Nullable ('semantic_block', 'oversized_block', 'fixed_size')                       |
        | `language_detected`         | `VARCHAR(10)`  | Default 'en'                                                                        |
        | `has_tables`                | `BOOLEAN`      | Default `FALSE`                                                                     |
        | `has_images`                | `BOOLEAN`      | Default `FALSE`                                                                     |
        | `metadata_json`             | `JSONB`        | Nullable (Additional flexible metadata)                                            |

    *   **Table: `processing_jobs`**
        | Column Name                 | Data Type      | Constraints & Notes                                                                 |
        | :-------------------------- | :------------- | :---------------------------------------------------------------------------------- |
        | `id`                        | `UUID`         | Primary Key                                                                          |
        | `user_id`                   | `VARCHAR(255)` | Not Null, Indexed (Owner of the job)                                               |
        | `job_type`                  | `VARCHAR(50)`  | Not Null ('create_vectorstore', 'update_vectorstore', 'remove_documents', etc.)    |
        | `status`                    | `VARCHAR(20)`  | Not Null ('pending', 'processing', 'completed', 'failed', 'cancelled')            |
        | `operation_target_id`       | `UUID`         | Nullable (Vector store ID or other target)                                         |
        | `total_items`               | `INTEGER`      | Default 0                                                                           |
        | `processed_items`           | `INTEGER`      | Default 0                                                                           |
        | `current_operation`         | `VARCHAR(255)` | Nullable                                                                            |
        | `current_file`              | `VARCHAR(255)` | Nullable                                                                            |
        | `progress_percentage`       | `DECIMAL(5,2)` | Default 0.00                                                                        |
        | `started_at`                | `TIMESTAMPZ`   | Not Null, Default `CURRENT_TIMESTAMP`                                               |
        | `updated_at`                | `TIMESTAMPZ`   | Not Null, Default `CURRENT_TIMESTAMP`, `ON UPDATE CURRENT_TIMESTAMP`                  |
        | `completed_at`              | `TIMESTAMPZ`   | Nullable                                                                            |
        | `error_message`             | `TEXT`         | Nullable                                                                            |
        | `result_data`               | `JSONB`        | Nullable                                                                            |
        | `job_details`               | `JSONB`        | Nullable (Job-specific parameters and details)                                      |

    *   **Table: `embedding_models`** (Reference/catalog table)
        | Column Name                 | Data Type      | Constraints & Notes                                                                 |
        | :-------------------------- | :------------- | :---------------------------------------------------------------------------------- |
        | `id`                        | `SERIAL`       | Primary Key                                                                          |
        | `model_name`                | `VARCHAR(255)` | Not Null, Unique                                                                    |
        | `model_display_name`        | `VARCHAR(255)` | Not Null                                                                            |
        | `provider`                  | `VARCHAR(50)`  | Not Null (e.g., 'vLLM', 'Ollama', 'OpenAI')                                        |
        | `dimension`                 | `INTEGER`      | Not Null                                                                            |
        | `description`               | `TEXT`         | Nullable                                                                            |
        | `is_available`              | `BOOLEAN`      | Default `TRUE`                                                                      |
        | `created_at`                | `TIMESTAMPZ`   | Not Null, Default `CURRENT_TIMESTAMP`                                               |

    *   **Tasks:**
        *   Create SQLAlchemy models for all tables above
        *   Implement `VectorStoreRepository` class to replace file-based `VectorStoreManager`
        *   Update `core/vectorstore.py` to use database instead of `metadata.json` files
        *   Modify API endpoints to:
            *   Extract `X-User-ID` header and filter all operations by `user_id`
            *   Create database entries for vector stores and documents
            *   Track chunk metadata in the database
            *   Use job tracking system for background operations
        *   Migrate existing vector store metadata to database during deployment
        *   Keep FAISS indexes file-based but reference them from database records

4.  **`workbench_service` (Spreadsheets, Analysis Jobs, Visualizations - `workbench_db`)**
    *   **Entities:**
        *   `Spreadsheet` (id, `user_id`, name, path_ref_to_upload_service_file_id, description, last_modified, created_at)
        *   `AnalysisJob` (id, `user_id`, spreadsheet_id, name, type, parameters_json, status, result_summary_text, created_at, completed_at)
        *   `Visualization` (id, `user_id`, analysis_job_id, name, type, configuration_json, created_at)
    *   **Tasks:** Define models. Refactor `app.py` and API routes to use the database instead of `metadata.json` and `jobs_store.json`, associating all records with a `user_id`.

5.  **`chat_service` (Sessions, Messages, Teams, Prompts - `chat_db`)**
    *   **Entities:**
        *   `ChatSession` (id, `user_id`, team_id, session_name, created_at, last_activity_timestamp)
        *   `ChatMessage` (id, session_id, sender_type (user/ai/system), content_text, timestamp, agent_id_if_ai, metadata_json)
        *   `AgentTeam` (id, `user_id_creator` (nullable for system teams), name, description, is_public)
        *   `TeamAgentLink` (team_id, agent_definition_id, order_in_team)
        *   `SystemPrompt` (id, `user_id_creator` (nullable for system prompts), name, content_text, variables_json, template_type, is_public, category)
    *   **Tasks:** Define models. Refactor `SessionManager`, `ConversationManager`, `SystemPromptManager`, and related API routes to use the database, incorporating `user_id` for user-created teams/prompts and session ownership.

6.  **`agent_service` (Agents, Teams, Templates - `agent_db`)**
    *   **Entities:**
        *   `AgentDefinition` (id, `user_id_creator` (nullable for system agents), name, instructions_text, type (individual/system), associated_llm_config_json, is_public)
        *   (Team definitions might be managed by `chat_service` or duplicated here if `agent_service` needs to manage them independently. Prefer centralizing if possible.)
        *   `PromptTemplateDef` (id, `user_id_creator` (nullable), name, content_text, category, is_public)
    *   **Tasks:** Define models. Refactor logic in `agents/` and `routes/agent_routes.py`, associating user-creatable definitions with `user_id`.

7.  **`direct_chat_service` (Sessions, Messages, Document States - `direct_chat_db`)**
    *   **Entities:**
        *   `DirectChatSession` (id, `user_id`, name, created_at, updated_at, selected_vectorstore_id_ref)
        *   `DirectChatMessage` (id, session_id, sender_type, content_text, timestamp, metadata_json) 
        *   `SessionDocumentState` (id, direct_chat_session_id, uploaded_file_id_ref, is_checked_for_context, classification_override, markdown_path_cache, markdown_size_cache)
    *   **Tasks:** Define models. Refactor `chat_logger.py` and session management in `app.py` to use the database, ensuring `user_id` for session ownership.

8.  **`extraction_service` (Extraction Job Metadata - `extraction_db`)**
    *   **Entities:**
        *   `ExtractionJob` (id, `user_id`, job_name, source_uploaded_file_ids_json, output_csv_storage_path, parameters_json, status, created_at, completed_at)
    *   **Tasks:** Define models. Modify `extraction_routes.py` to log job metadata associated with a `user_id`.

9.  **`report_builder_service` (Reports, Templates, Elements - `report_builder_db`)**
    *   **Entities:**
        *   `Report` (id, `user_id`, name, description, report_template_id_ref, created_at, updated_at, status, associated_vectorstore_id_ref)
        *   `ReportTemplate` (id, `user_id_creator` (nullable for system templates), name, description, structure_json, is_public, category)
        *   `ReportElement` (id, report_id, order_index, type (explicit/generative), format_type, content_text, instructions_for_ai, ai_generated_content_text, source_document_chunk_ids_json)
    *   **Tasks:** Define models. Refactor `init_templates.py` and API routes, associating reports and user-created templates with `user_id`.

## Phase 3: Data Migration (If Applicable)

*   For services currently storing data in files (e.g., `chat_service` session logs, `workbench_service` JSON files, `wargame_service` JSON files), write one-time scripts to migrate existing data into the new database tables. These scripts will need to associate data with a default user or handle unauthenticated legacy data appropriately.
*   **Embedding Service Migration**: Create migration scripts to:
    *   Parse existing `metadata.json` files from vector store directories
    *   Import vector store and document metadata into PostgreSQL tables
    *   Preserve FAISS index file references and chunk mappings
    *   Migrate job tracking from JSON files to database tables

## Phase 4: Refinement and Optimization

*   Implement database indexing for `user_id` columns and other frequently queried columns.
*   Review and optimize database queries for performance and security (preventing SQL injection if not using ORM strictly).
*   Set up regular database backup and recovery procedures.
*   Implement a database migration tool (e.g., Alembic) for managing future schema changes systematically.
*   **Embedding Service Specific Optimizations**:
    *   Index `text_hash` in `document_chunks` for deduplication
    *   Index `chunk_classification` for security filtering
    *   Index `faiss_vector_id` for vector-to-metadata lookups
    *   Consider partitioning large tables by `user_id` for performance

## Tooling

*   **ORM:** SQLAlchemy (ensure all services use this consistently for Python backends).
*   **Migration:** Alembic (highly recommended for future schema evolution).

## Order of Implementation (Suggestion)

1.  **Foundational (User Data Focus):** `upload_service`, `wargame_service` (good candidates for initial DB work).
2.  **Core Data Services:** `embedding_service` (document & vector store metadata), `workbench_service`.
3.  **Interaction Services:** `chat_service`, `agent_service`, `direct_chat_service`.
4.  **Supporting Services:** `report_builder_service`, `extraction_service`.

This order prioritizes services where user data ownership is critical and then builds out from there.

**Special Considerations for Embedding Service:**
- Vector embeddings remain in FAISS for performance
- Metadata moves to PostgreSQL for querying and user isolation
- Complex security classification handling at chunk level
- Background job processing requires robust state management
- File-to-document-to-chunk relationships need careful foreign key design
