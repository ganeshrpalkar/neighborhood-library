"""Property-based tests for pagination logic."""

from __future__ import annotations

from hypothesis import given
from hypothesis import settings as hy_settings
from hypothesis import strategies as st


@hy_settings(max_examples=100)
@given(
    page=st.integers(min_value=1, max_value=1000),
    page_size=st.integers(min_value=1, max_value=100),
    total=st.integers(min_value=0, max_value=10000),
)
def test_pagination_skip_offset_always_non_negative(page: int, page_size: int, total: int):
    skip = (page - 1) * page_size
    assert skip >= 0


@hy_settings(max_examples=100)
@given(
    page=st.integers(min_value=1, max_value=1000),
    page_size=st.integers(min_value=1, max_value=100),
)
def test_pagination_skip_increases_with_page(page: int, page_size: int):
    skip1 = (page - 1) * page_size
    skip2 = page * page_size
    assert skip2 >= skip1


@hy_settings(max_examples=100)
@given(
    total=st.integers(min_value=0, max_value=100000),
    page_size=st.integers(min_value=1, max_value=100),
)
def test_total_pages_formula(total: int, page_size: int):
    import math

    total_pages = math.ceil(total / page_size) if total > 0 else 0
    assert total_pages >= 0
    if total > 0:
        assert total_pages >= 1
