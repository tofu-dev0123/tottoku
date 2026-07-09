# ER 図

第1フェーズのテーブル関係。フォルダとタグは書類と多対多、フォルダは自己参照で階層を持つ。

```mermaid
erDiagram
    users {
        uuid id PK
        text email UK
        text display_name
        timestamptz created_at
    }
    folders {
        uuid id PK
        text name
        uuid parent_id FK "self-ref, NULL=root"
        uuid created_by FK
        timestamptz created_at
    }
    documents {
        uuid id PK
        text title
        text s3_key UK
        text mime_type
        date doc_date "nullable"
        date expiry_date "nullable"
        text memo "nullable"
        uuid uploaded_by FK
        uuid updated_by FK "nullable"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable, 論理削除"
    }
    document_folders {
        uuid document_id PK,FK
        uuid folder_id PK,FK
    }
    tags {
        uuid id PK
        text name UK
    }
    document_tags {
        uuid document_id PK,FK
        uuid tag_id PK,FK
    }

    users ||--o{ folders : "created_by"
    users ||--o{ documents : "uploaded_by"
    users |o--o{ documents : "updated_by"
    folders |o--o{ folders : "parent_id (階層)"
    documents ||--o{ document_folders : ""
    folders ||--o{ document_folders : ""
    documents ||--o{ document_tags : ""
    tags ||--o{ document_tags : ""
```

## 関係の要点

- **users → folders / documents**: 作成者・アップロード者・更新者を参照。`updated_by` は NULL 可（更新されるまで NULL）。
- **folders → folders（自己参照）**: `parent_id` で階層。`NULL` はトップ階層。循環参照はアプリ側で防止（[invariants.md](./invariants.md)）。
- **documents ⇄ folders（多対多）**: `document_folders` が「1 書類を複数フォルダに入れる」実体。ファイラーの「🗂 2」バッジはこの行数。
- **documents ⇄ tags（多対多）**: `document_tags`。タグは書類の作成/更新時に名前で upsert。
- 中間表（`document_folders` / `document_tags`）は複合主キーで重複所属を防止し、`documents` / `folders` / `tags` 削除時に `ON DELETE CASCADE` で自動的に外れる。
