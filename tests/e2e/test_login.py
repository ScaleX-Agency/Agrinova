import pytest 
import os 
 
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:3000") 
 
 
@pytest.mark.auth 
@pytest.mark.smoke 
def test_login_page_loads(page): 
    page.goto(f"{BASE_URL}/login") 
    assert page.get_by_role("heading", name="Login").is_visible() 
 
 
@pytest.mark.auth 
def test_login_success(page): 
    page.goto(f"{BASE_URL}/login") 
    page.get_by_label("Username").fill("admin") 
    page.get_by_label("Password").fill("admin123") 
    page.get_by_role("button", name="Login").click() 
    page.wait_for_load_state("networkidle") 
    assert page.url.endswith("/dashboard") or page.get_by_text("Dashboard").is_visible() 
