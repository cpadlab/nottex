from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

from app.shared.logger import get_logger
from app.core.config import settings

logger = get_logger(__name__)


class DatabaseManager:
    """
    Connection manager for MongoDB using the asynchronous Motor driver.

    This class centralizes the logic for connecting, disconnecting, and accessing the 
    different databases in the cluster. It uses a single connection pool to optimize 
    application performance.

    Attributes:
        client (Optional[AsyncIOMotorClient]): Asynchronous MongoDB client instance.
    """

    def __init__(self):
        """
        Initializes the database manager instance.
        """
        self.client: Optional[AsyncIOMotorClient] = None


    async def connect(self) -> None:
        """
        Establishes a connection to the MongoDB cluster.

        Uses the connection URL defined in the global configuration. When connecting, 
        it performs a 'ping' command to the administrative server to validate that 
        communication is stable.

        Raises:
            PyMongoError: If the connection cannot be established or the ping fails.
        """
        try:
            self.client = AsyncIOMotorClient(
                settings.DATABASE_URL,
                maxPoolSize=settings.DATABASE_MAX_POOL_SIZE,
                minPoolSize=settings.DATABASE_MIN_POOL_SIZE,
                maxIdleTimeMS=settings.DATABASE_MAX_IDLE_TIME_MS,
                waitQueueTimeoutMS=settings.DATABASE_WAIT_QUEUE_TIMEOUT_MS,
                serverSelectionTimeoutMS=5000,
            )
            await self.client.admin.command("ping")
            logger.info("Successfully connected to MongoDB.")

        except PyMongoError as e:
            logger.error("MongoDB connection failed (%s)", type(e).__name__)
            raise e
        except Exception as e:
            logger.error("Unexpected MongoDB connection failure (%s)", type(e).__name__)
            raise e


    async def ping(self) -> None:
        """
        Check that the configured MongoDB client can currently serve requests.
        """
        if not self.client:
            raise RuntimeError("Database client is not connected.")
        await self.client.admin.command("ping")


    def close(self) -> None:
        """
        Close the connection pool securely when shutting down the application.
        """
        if self.client:
            self.client.close()
            self.client = None
            logger.info("MongoDB connection closed.")


    @property
    def is_connected(self) -> bool:
        """
        Check whether the client is currently initialized.
        """
        return self.client is not None


    @property
    def users(self) -> AsyncIOMotorDatabase:
        """
        Direct access to the users database.
        """
        if not self.client:
            raise RuntimeError("Database client is not connected.")
        return self.client[settings.DATABASE_USERS_NAME]


    @property
    def notes(self) -> AsyncIOMotorDatabase:
        """
        Direct access to the notes database.
        """
        if not self.client:
            raise RuntimeError("Database client is not connected.")
        return self.client[settings.DATABASE_NOTES_NAME]


    def get_db(self, db_name: str) -> AsyncIOMotorDatabase:
        """
        Returns an instance of any specific database within the cluster.

        Args:
            db_name (str): Name of the database you want to access.

        Returns:
            AsyncIOMotorDatabase: Instance of the requested database.
        """
        if not self.client:
            raise RuntimeError("Database client is not connected.")
        return self.client[db_name]


db = DatabaseManager()
