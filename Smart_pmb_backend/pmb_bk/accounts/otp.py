# One-time-code generation for the forgot-password flow (see
# PasswordResetOTP in models.py and ForgotPasswordView/VerifyResetOTPView
# in views.py). Uses `secrets` (not `random`) since these codes gate a
# real account takeover, same reasoning as generate_temp_password in
# serializers.py.
import secrets

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
# A code is burned (treated as invalid, forcing a fresh request) once more
# than this many wrong guesses have been made against it — a 6-digit code
# is 1-in-a-million, but only if guessing is actually rate-limited.
MAX_OTP_ATTEMPTS = 5


def generate_otp_code() -> str:
    """Returns a random, zero-padded numeric code, e.g. "042817"."""
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"
