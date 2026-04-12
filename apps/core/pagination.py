from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Replicates the original pagination contract:
      meta: { total, page, limit, totalPages, hasNext, hasPrev }
    """
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100
    page_query_param = 'page'

    def get_paginated_response_data(self, data, serializer_class=None):
        total = self.page.paginator.count
        current_page = self.page.number
        page_size = self.get_page_size(self.request)
        total_pages = self.page.paginator.num_pages

        meta = {
            'total': total,
            'page': current_page,
            'limit': page_size,
            'totalPages': total_pages,
            'hasNext': self.get_next_link() is not None,
            'hasPrev': self.get_previous_link() is not None,
        }
        return data, meta
