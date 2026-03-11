from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import User
from ..schemas import UserResponse, UserUpdate
from ..dependencies import get_db, get_current_user
import boto3
import uuid
import os

router = APIRouter(
    prefix="/api/users",
    tags=["users"]
)

# Constants
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get current user profile
    """
    return current_user

@router.put("/me", response_model=UserResponse)
def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user profile
    """
    # Check if email is being changed and if it's already taken by another user
    if user_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    current_user.name = user_update.name
    current_user.email = user_update.email
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload user avatar to S3
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed types: JPG, PNG, WEBP")

    # Validate file size (read chunks to avoid memory issues, though 2MB is small)
    size = 0
    chunk_size = 1024 * 1024
    content = b""
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        size += len(chunk)
        content += chunk
        if size > MAX_FILE_SIZE:
             raise HTTPException(status_code=400, detail="File size too large. Max size: 2MB")
    
    # Seek back to 0 for upload
    await file.seek(0)
    
    # S3 Client
    s3 = boto3.client(
        's3',
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )
    bucket_name = os.getenv("AWS_BUCKET_NAME") or os.getenv("AWS_S3_BUCKET")

    if not bucket_name:
        raise HTTPException(status_code=500, detail="Server misconfiguration: AWS_BUCKET_NAME not set")

    # Delete old avatar if exists
    if current_user.avatar_url:
        try:
            # Extract key from URL. Assumption: URL structure is https://bucket.s3.region.amazonaws.com/key
            # or https://s3.region.amazonaws.com/bucket/key. 
            # A safer way might be to store the key, but we'll try to extract it.
            # Simple approach: if it contains the bucket name, try to split.
            # For now, let's assume standard object URL.
            # Actually, standard practice is to store the key or be able to derive it.
            # Let's try to parse the URL.
            from urllib.parse import urlparse
            parsed_url = urlparse(current_user.avatar_url)
            # path usually starts with /, so strip it. 
            # If using virtual-hosted style: path is key.
            # If using path-style: path is /bucket/key.
            # We will assume virtual-hosted style as it's common.
            key = parsed_url.path.lstrip('/')
            
            # If we are strictly using our own generated URLs, we know the format "avatars/..."
            if "avatars/" in key:
                s3.delete_object(Bucket=bucket_name, Key=key)
        except Exception as e:
            print(f"Failed to delete old avatar: {e}")
            # Don't fail the upload just because delete failed, but log it.

    # Generate new filename
    extension = "." + file.filename.split(".")[-1] if "." in file.filename else ""
    # Ensure extension is valid based on content type if needed, but we checked content_type.
    # To be safer, we could map content_type to extension, but using orig extension is usually okay if validated.
    file_key = f"avatars/{uuid.uuid4()}{extension}"

    try:
        # Upload to S3
        # We need to pass the file object. 'file' is UploadFile.
        # file.file is the actual Python file-like object.
        # But we already read it into 'content' to check size.
        # So we can put_object with Body=content
        
        s3.put_object(
            Bucket=bucket_name,
            Key=file_key,
            Body=content,
            ContentType=file.content_type
        )
        
        # Construct URL
        # Assumption: Standard S3 URL
        region = os.getenv("AWS_REGION")
        url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{file_key}"
        
        # Update User
        current_user.avatar_url = url
        db.commit()
        db.refresh(current_user)
        
        return current_user

    except Exception as e:
        print(f"S3 Upload Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload avatar")
