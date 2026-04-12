from rest_framework.response import Response
from rest_framework import status


def success_response(data, http_status=status.HTTP_200_OK, meta=None):
    """Unified { success, data, meta } response shape — matching original API contract."""
    payload = {'success': True, 'data': data}
    if meta is not None:
        payload['meta'] = meta
    return Response(payload, status=http_status)
