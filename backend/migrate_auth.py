#!/usr/bin/env python3
"""
Migration script to add user authentication to Eden Garden.
This script will:
1. Create the users table
2. Add user_id columns to all existing tables
3. Drop all existing data (as per requirements)
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from db.database import DB_PATH

def migrate():
    if not os.path.exists(DB_PATH):
        print("Database does not exist, skipping migration")
        return

    engine = create_engine(f"sqlite:///{DB_PATH}")

    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            print("Starting migration...")

            # Drop all existing data first
            print("Dropping existing data...")
            conn.execute(text("DELETE FROM quiz_answers"))
            conn.execute(text("DELETE FROM quiz_sessions"))
            conn.execute(text("DELETE FROM chunks"))
            conn.execute(text("DELETE FROM documents"))
            conn.execute(text("DELETE FROM contradictions"))
            conn.execute(text("DELETE FROM professor_profiles"))
            conn.execute(text("DELETE FROM compartments"))

            # Create users table
            print("Creating users table...")
            conn.execute(text("""
                CREATE TABLE users (
                    id VARCHAR(36) PRIMARY KEY,
                    google_id VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    display_name VARCHAR(255) NOT NULL,
                    avatar_url VARCHAR(500),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Add user_id to compartments
            print("Adding user_id to compartments...")
            conn.execute(text("ALTER TABLE compartments ADD COLUMN user_id VARCHAR(36) NOT NULL REFERENCES users(id)"))
            conn.execute(text("CREATE INDEX idx_compartments_user_id ON compartments(user_id)"))

            # Add user_id to documents
            print("Adding user_id to documents...")
            conn.execute(text("ALTER TABLE documents ADD COLUMN user_id VARCHAR(36) NOT NULL REFERENCES users(id)"))
            conn.execute(text("CREATE INDEX idx_documents_user_id ON documents(user_id)"))

            # Add user_id to chunks
            print("Adding user_id to chunks...")
            conn.execute(text("ALTER TABLE chunks ADD COLUMN user_id VARCHAR(36) NOT NULL REFERENCES users(id)"))
            conn.execute(text("CREATE INDEX idx_chunks_user_id ON chunks(user_id)"))

            # Add user_id to professor_profiles
            print("Adding user_id to professor_profiles...")
            conn.execute(text("ALTER TABLE professor_profiles ADD COLUMN user_id VARCHAR(36) NOT NULL REFERENCES users(id)"))
            conn.execute(text("CREATE INDEX idx_professor_profiles_user_id ON professor_profiles(user_id)"))

            # Add user_id to contradictions
            print("Adding user_id to contradictions...")
            conn.execute(text("ALTER TABLE contradictions ADD COLUMN user_id VARCHAR(36) NOT NULL REFERENCES users(id)"))
            conn.execute(text("CREATE INDEX idx_contradictions_user_id ON contradictions(user_id)"))

            # Add user_id to quiz_sessions
            print("Adding user_id to quiz_sessions...")
            conn.execute(text("ALTER TABLE quiz_sessions ADD COLUMN user_id VARCHAR(36) NOT NULL REFERENCES users(id)"))
            conn.execute(text("CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id)"))

            # Add user_id to quiz_answers
            print("Adding user_id to quiz_answers...")
            conn.execute(text("ALTER TABLE quiz_answers ADD COLUMN user_id VARCHAR(36) NOT NULL REFERENCES users(id)"))
            conn.execute(text("CREATE INDEX idx_quiz_answers_user_id ON quiz_answers(user_id)"))

            trans.commit()
            print("Migration completed successfully!")

        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate()