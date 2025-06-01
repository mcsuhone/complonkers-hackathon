import os

# Database Configuration
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "chinook"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432"))
}

# Placeholder database names
PLACEHOLDER_DBS = ["your_db_name", "test_db_placeholder"]