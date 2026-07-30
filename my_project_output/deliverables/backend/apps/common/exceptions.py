from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        detail = response.data
        message = "Internal server error"
        code = "INTERNAL"

        if isinstance(detail, dict):
            if "detail" in detail:
                message = detail["detail"]
                if hasattr(exc, "default_code"):
                    code = exc.default_code.upper()
            else:
                message = "Validation error"
                code = "VALIDATION"
        elif isinstance(detail, list):
            message = str(detail[0]) if detail else "Unknown error"
            code = "VALIDATION"

        body = {"error": {"message": message, "code": code}}
        if isinstance(detail, dict) and "detail" not in detail:
            body["error"]["details"] = detail

        response.data = body

    return response
