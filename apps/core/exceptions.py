from rest_framework.exceptions import (
    APIException, AuthenticationFailed, NotAuthenticated, PermissionDenied, NotFound,
    ValidationError,
)
from rest_framework import status
from rest_framework.views import exception_handler


class ConflictError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'A conflict occurred.'
    default_code = 'conflict'


class BadRequestError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Bad request.'
    default_code = 'bad_request'


def custom_exception_handler(exc, context):
    """
    Converts all DRF exceptions to the unified { success, error } shape.
    Matches the original Express error middleware contract.
    """
    response = exception_handler(exc, context)

    if response is not None:
        errors = response.data

        # Flatten validation errors into a list of { field, message } objects
        if isinstance(exc, ValidationError):
            field_errors = []
            if isinstance(errors, dict):
                for field, messages in errors.items():
                    if isinstance(messages, list):
                        for msg in messages:
                            field_errors.append({'field': field, 'message': str(msg)})
                    else:
                        field_errors.append({'field': field, 'message': str(messages)})
            elif isinstance(errors, list):
                for msg in errors:
                    field_errors.append({'message': str(msg)})

            response.data = {
                'success': False,
                'error': {
                    'message': 'Validation failed',
                    'errors': field_errors,
                },
            }
        else:
            # Extract message
            if isinstance(errors, dict):
                detail = errors.get('detail', str(exc))
            elif isinstance(errors, list):
                detail = str(errors[0]) if errors else str(exc)
            else:
                detail = str(errors)

            response.data = {
                'success': False,
                'error': {'message': str(detail)},
            }

    return response
