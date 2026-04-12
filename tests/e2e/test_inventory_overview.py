import pytest 
import os 
from conftest import login 
 
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:3000") 
 
 
@pytest.mark.inventory 
@pytest.mark.smoke 
def test_page_loads_and_shows_stat_cards(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory") 
    assert page.get_by_text("Stock Overview").first.is_visible() 
    assert page.get_by_text("Total Products").first.is_visible() 
    assert page.get_by_text("Low Stock").first.is_visible() 
 
 
@pytest.mark.inventory 
def test_location_cards_render(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory") 
    assert page.get_by_text("Head Office").first.is_visible() 
    assert page.get_by_text("Kuliyapitiya").first.is_visible() 
 
 
@pytest.mark.inventory 
def test_stock_table_renders_with_rows(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory") 
    assert page.get_by_role("table").is_visible() 
    rows = page.locator("tbody tr") 
    assert rows.first.is_visible() 
 
 
@pytest.mark.inventory 
def test_search_filters_table_rows(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory") 
    search_input = page.locator("input[placeholder*='Search']").first 
    search_input.fill("Fertilizer") 
    assert page.get_by_text("AgriGold Fertilizer").is_visible() 
 
 
@pytest.mark.inventory 
def test_clicking_location_card_filters_table(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory") 
    page.get_by_text("Head Office").first.click() 
    location_badges = page.locator("span:has-text('IGRN1')").first 
    assert location_badges.is_visible() 
 
 
@pytest.mark.inventory 
def test_switching_to_movements_tab_shows_movements_log(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory") 
    page.get_by_role("button", name="Movements Log").click() 
    assert page.get_by_text("All").first.is_visible() 
