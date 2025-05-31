import psycopg2
import psycopg2.extras

class DatabaseService:
    def __init__(self, db_config: dict):
        self.db_config = db_config
        self.connection = None
        self.cursor = None

    def connect(self):
        if not self.connection or self.connection.closed:
            try:
                self.connection = psycopg2.connect(
                    dbname=self.db_config.get("dbname"),
                    user=self.db_config.get("user"),
                    password=self.db_config.get("password"),
                    host=self.db_config.get("host"),
                    port=self.db_config.get("port", 5432)  # Default PostgreSQL port
                )
                self.cursor = self.connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
                print("Successfully connected to PostgreSQL via DatabaseService")
            except psycopg2.Error as e:
                print(f"Error connecting to PostgreSQL via DatabaseService: {e}")
                raise

    def close(self):
        if self.cursor:
            self.cursor.close()
            self.cursor = None # Clear cursor after closing
        if self.connection and not self.connection.closed:
            self.connection.close()
            self.connection = None # Clear connection after closing
            print("PostgreSQL connection closed by DatabaseService.")

    def get_table_schemas(self) -> dict:
        """
        Retrieves the schema (column names and types) for all tables in the public schema.
        """
        if not self.cursor:
            # Attempt to connect if not connected, useful for standalone calls
            # or if the service is used in a way where connect isn't explicitly called first.
            # However, for agents, explicit connect/close is better.
            # For now, let's assume connect is called.
            raise ConnectionError("Database connection not established or cursor not available.")

        schemas = {}
        try:
            # Get all table names in the public schema
            self.cursor.execute("""
                SELECT tablename
                FROM pg_catalog.pg_tables
                WHERE schemaname = 'public';
            """)
            tables = [row[0] for row in self.cursor.fetchall()]

            for table_name in tables:
                self.cursor.execute(f"""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = \'{table_name}\';
                """)
                columns = self.cursor.fetchall()
                schemas[table_name] = {col['column_name']: col['data_type'] for col in columns}
            return schemas
        except psycopg2.Error as e:
            print(f"DatabaseService: Error retrieving table schemas: {e}")
            raise
        except Exception as e:
            print(f"DatabaseService: An unexpected error occurred: {e}")
            raise

    # Context manager methods to ensure connection is managed properly
    async def __enter__(self):
        await self.connect()
        return self

    async def __exit__(self, exc_type, exc_val, exc_tb):
        await self.close() 