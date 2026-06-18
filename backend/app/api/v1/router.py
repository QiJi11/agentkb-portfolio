from fastapi import APIRouter

from app.api.v1.routes import auth, chat, documents, health, identity, retrieve

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(documents.router, tags=["documents"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(identity.router, tags=["identity"])
api_router.include_router(retrieve.router, tags=["retrieve"])
