import os

# Database Configuration
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "chinook"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432"))
}

# Example for model configurations, adjust as needed
MODEL_CONFIG = {
    "model_name": "default_model",
    "api_key": "your_api_key_here", # Be cautious with storing sensitive data
    "parameters": {
        "temperature": 0.7,
        "max_tokens": 500,
    }
}

# Add other configurations as needed
# For example, API keys for external services, paths, etc.
# EXTERNAL_API_KEY = "your_external_api_key" 