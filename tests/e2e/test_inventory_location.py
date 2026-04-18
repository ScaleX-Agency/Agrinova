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
def test_record_movement_button_opens_modal(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory/1") 
    page.get_by_role("button", name="Record Movement").first.click() 
    assert page.get_by_text("Movement Type").first.is_visible() 
 
 
@pytest.mark.inventory 
def test_movements_log_tab_shows_history(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory/1") 
    page.get_by_role("button", name="Movements Log").click() 
    assert page.get_by_text("All Movements").first.is_visible() 
