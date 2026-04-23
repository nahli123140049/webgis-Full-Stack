import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import get_pool
from models import TokenResponse, UserLogin, UserPublic, UserRegister

router = APIRouter(prefix="/api/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key-for-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register_user(data: UserRegister):
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing_user = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1 OR email = $2",
            data.username,
            data.email,
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="Username atau email sudah terdaftar")

        row = await conn.fetchrow(
            """
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email
            """,
            data.username,
            data.email,
            get_password_hash(data.password),
        )
        return dict(row)


@router.post("/login", response_model=TokenResponse)
async def login_user(data: UserLogin):
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, email, password_hash FROM users WHERE username = $1",
            data.username,
        )
        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Username atau password salah")

        token = create_access_token(str(user["id"]))
        return TokenResponse(access_token=token)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserPublic:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token tidak valid")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Token tidak valid atau kadaluarsa") from exc

    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, username, email FROM users WHERE id = $1",
            int(user_id),
        )
        if not row:
            raise HTTPException(status_code=401, detail="User tidak ditemukan")

    return UserPublic(**dict(row))