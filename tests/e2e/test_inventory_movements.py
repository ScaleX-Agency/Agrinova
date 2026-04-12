import pytest 
import os 
from conftest import login 
 
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:3000") 
 
 
@pytest.mark.inventory 
def test_movements_page_loads(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory/movements") 
    assert page.get_by_text("Movements Log").is_visible() 
    assert page.get_by_text("Total Records").is_visible() 
 
 
@pytest.mark.inventory 
def test_type_filter_works(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory/movements") 
    page.get_by_role("button", name="Issue").click() 
    badges = page.locator("span:has-text('Issue')").first 
    assert badges.is_visible() 
