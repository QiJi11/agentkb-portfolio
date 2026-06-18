from hashlib import sha256
from secrets import choice

ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
CODE_LENGTH = 8


def generate_code() -> str:
    """Generate a short human-readable interviewer access code."""
    suffix = "".join(choice(ALPHABET) for _ in range(CODE_LENGTH))
    return f"AKB-{suffix}"


def hash_code(code: str) -> str:
    """Hash an interviewer access code for INTERVIEWER_CODE_HASH."""
    return sha256(code.strip().upper().encode("utf-8")).hexdigest()


def main() -> None:
    """Print a new code and the matching environment variable."""
    code = generate_code()
    print(f"INTERVIEWER_CODE={code}")
    print(f"INTERVIEWER_CODE_HASH={hash_code(code)}")


if __name__ == "__main__":
    main()
