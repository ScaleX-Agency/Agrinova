import os 
from datetime import datetime 
import pytest 
from playwright.sync_api import Playwright, sync_playwright 
 
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:3000") 
 
ARTIFACT_DIR = "artifacts" 
SCREENSHOT_DIR = os.path.join(ARTIFACT_DIR, "screenshots") 
VIDEO_DIR = os.path.join(ARTIFACT_DIR, "videos") 
 
os.makedirs(SCREENSHOT_DIR, exist_ok=True) 
os.makedirs(VIDEO_DIR, exist_ok=True) 
 
 
@pytest.fixture(scope="session") 
def playwright_instance(): 
    with sync_playwright() as p: 
        yield p 
 
 
@pytest.fixture(scope="session") 
def browser(playwright_instance: Playwright): 
    browser = playwright_instance.chromium.launch(headless=True) 
    yield browser 
    browser.close() 
 
 
@pytest.fixture 
def context(browser, request): 
    test_name = request.node.name.replace("/", "_").replace(" ", "_") 
    context = browser.new_context( 
        viewport={"width": 1440, "height": 900}, 
        record_video_dir=VIDEO_DIR, 
    ) 
    yield context 
    context.close() 
 
 
@pytest.fixture 
def page(context): 
    page = context.new_page() 
    yield page 
    page.close() 
 
 
@pytest.hookimpl(hookwrapper=True) 
def pytest_runtest_makereport(item, call): 
    outcome = yield 
    rep = outcome.get_result() 
    setattr(item, "rep_" + rep.when, rep) 
 
 
@pytest.fixture(autouse=True) 
def screenshot_on_failure(request, page): 
    yield 
    if hasattr(request.node, "rep_call") and request.node.rep_call.failed: 
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S") 
        file_name = f"{request.node.name}_{timestamp}.png".replace(" ", "_") 
        path = os.path.join(SCREENSHOT_DIR, file_name) 
        page.screenshot(path=path, full_page=True) 
 
 
def login(page, username="admin", password="admin123"): 
    page.goto(f"{BASE_URL}/login") 
    page.get_by_label("Username").fill(username) 
    page.get_by_label("Password").fill(password) 
    page.get_by_role("button", name="Login").click() 
    page.wait_for_load_state("networkidle") 
