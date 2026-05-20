import pytest 
import os 
from conftest import login 
 
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:3000") 
 
 
@pytest.mark.inventory 
def test_navigating_to_location_1_shows_head_office_stock(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory/1") 
    assert page.get_by_text("Head Office").first.is_visible() 
    assert page.get_by_text("Back to Stock Overview").first.is_visible() 
 
 
@pytest.mark.inventory
def test_location_stock_table_visible(page):
    login(page)
    page.goto(f"{BASE_URL}/inventory/1")
    assert page.get_by_role("table").is_visible()
