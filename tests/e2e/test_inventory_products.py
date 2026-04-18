import pytest 
import os 
from conftest import login 
 
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:3000") 
 
 
@pytest.mark.inventory 
def test_products_page_loads_catalogue(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory/products") 
    assert page.get_by_text("Products").first.is_visible() 
    assert page.get_by_role("table").is_visible() 
 
 
@pytest.mark.inventory 
def test_search_filters_products(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory/products") 
    search = page.locator("input[placeholder*='Search']").first 
    search.fill("Fungicide") 
    assert page.get_by_text("BioShield Fungicide").first.is_visible() 
 
 
@pytest.mark.inventory 
def test_new_product_modal_opens(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory/products") 
    page.get_by_role("button", name="New Product").first.click() 
    assert page.get_by_text("Add New Product").first.is_visible() 
    assert page.get_by_placeholder("Glyphosate").first.is_visible() 
 
 
@pytest.mark.inventory 
def test_new_product_form_validates_required_fields(page): 
    login(page) 
    page.goto(f"{BASE_URL}/inventory/products") 
    page.get_by_role("button", name="New Product").first.click() 
    page.get_by_role("button", name="Add Product").first.click() 
    assert page.get_by_text("Product name is required").first.is_visible() 
