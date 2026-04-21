from typing import Optional

from pydantic import BaseModel, Field, field_validator

class FasilitasCreate(BaseModel):
    nama: str = Field(..., min_length=3, max_length=120)
    jenis: str = Field(..., min_length=3, max_length=50)
    alamat: Optional[str] = None
    longitude: float = Field(..., ge=-180, le=180)
    latitude: float = Field(..., ge=-90, le=90)

    @field_validator("nama", "jenis")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("field tidak boleh kosong")
        return cleaned

    @field_validator("alamat")
    @classmethod
    def validate_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None