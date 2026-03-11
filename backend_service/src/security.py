from cryptography.fernet import Fernet
import os
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
import hashlib
import logging

logger = logging.getLogger(__name__)

# Auth Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-jwt-keep-it-safe")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Setup Encryption
try:
    # Load key from environment (persistent) or generate new one (ephemeral)
    env_key = os.getenv("ENCRYPTION_KEY")
    if env_key:
        ENCRYPTION_KEY = env_key.encode() if isinstance(env_key, str) else env_key
    else:
        logger.warning("ENCRYPTION_KEY not found in env. Generating ephemeral key (passwords will be lost on restart).")
        ENCRYPTION_KEY = Fernet.generate_key()
    
    cipher_suite = Fernet(ENCRYPTION_KEY)
except Exception as e:
    logger.error(f"Encryption Key Error: {e}")
    # Fallback to prevent crash, but strictly this should be fatal in prod
    ENCRYPTION_KEY = Fernet.generate_key()
    cipher_suite = Fernet(ENCRYPTION_KEY)

def encrypt_password(password: str) -> str:
    if not password: return None
    return cipher_suite.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    if not encrypted_password: return None
    return cipher_suite.decrypt(encrypted_password.encode()).decode()

# Auth Utils
def verify_password(plain_password, hashed_password):
    # Pre-hash to handle long passwords (>72 bytes)
    hashed_input = hashlib.sha256(plain_password.encode()).hexdigest()
    return pwd_context.verify(hashed_input, hashed_password)

def get_password_hash(password):
    # Pre-hash to handle long passwords (>72 bytes)
    hashed_input = hashlib.sha256(password.encode()).hexdigest()
    return pwd_context.hash(hashed_input)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
