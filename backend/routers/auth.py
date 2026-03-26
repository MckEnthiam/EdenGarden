from fastapi import APIRouter, Depends
from models.user import User
from auth import get_current_user

router = APIRouter()

@router.get('/validate')
def validate_session(user: User = Depends(get_current_user)):
    return {
        'valid': True,
        'user_id': user.id,
        'email': user.email,
        'display_name': user.display_name,
    }

@router.get('/user')
def get_user_profile(user: User = Depends(get_current_user)):
    return {
        'id': user.id,
        'google_id': user.google_id,
        'email': user.email,
        'display_name': user.display_name,
        'avatar_url': user.avatar_url,
    }
