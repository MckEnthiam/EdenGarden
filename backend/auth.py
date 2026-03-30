from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import requests
import os
from db.database import get_db
from models.user import User
from datetime import datetime

# Google OAuth client ID - should be set as environment variable
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Validate Google OAuth token and return the current user.
    Creates user if they don't exist.
    """
    try:
        if credentials.credentials == "local_user":
            user = db.query(User).filter(User.google_id == "local_user").first()
            if not user:
                user = User(
                    google_id="local_user",
                    email="local@localhost",
                    display_name="Mode Local",
                    avatar_url=""
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                user.last_login_at = datetime.utcnow()
                db.commit()
            return user

        # Pass ID token or access token with tokeninfo fallback
        try:
            idinfo = id_token.verify_oauth2_token(
                credentials.credentials,
                google_requests.Request(),
                GOOGLE_CLIENT_ID
            )
        except ValueError:
            tokeninfo_resp = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'access_token': credentials.credentials},
                timeout=5,
            )
            if tokeninfo_resp.status_code != 200:
                raise ValueError('Google token verification failed')
            idinfo = tokeninfo_resp.json()
            if idinfo.get('aud') != GOOGLE_CLIENT_ID:
                raise ValueError('Invalid token audience')

        google_id = idinfo['sub']
        email = idinfo.get('email')
        if not email:
            raise ValueError('Email non fourni')
        display_name = idinfo.get('name', email)
        avatar_url = idinfo.get('picture')

        # Check if user exists
        user = db.query(User).filter(User.google_id == google_id).first()

        if not user:
            # Create new user
            user = User(
                google_id=google_id,
                email=email,
                display_name=display_name,
                avatar_url=avatar_url
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update last login
            user.last_login_at = datetime.utcnow()
            db.commit()

        return user

    except ValueError as e:
        message = str(e)
        print(f"[AUTH] Google token validation failed: {message}")
        if 'expired' in message.lower() or 'token has expired' in message.lower():
            raise HTTPException(status_code=401, detail={"error": "token_expired"})
        raise HTTPException(status_code=401, detail={"error": "invalid_token", "message": message})
    except Exception as e:
        message = str(e)
        print(f"[AUTH] Google authentication error: {message}")
        raise HTTPException(status_code=401, detail={"error": "authentication_failed", "message": message})

async def get_current_user_id(
    user: User = Depends(get_current_user)
) -> str:
    """Dependency to get just the user ID"""
    return user.id