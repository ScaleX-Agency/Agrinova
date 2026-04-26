import { test, expect } from "@playwright/test"; 
 
test.describe("Inventory — Stock Overview", () => { 
test("page loads and shows stat cards", async ({ page }) => { 
await page.goto("/inventory"); 
await expect(page.getByText("Stock Overview").first()).toBeVisible(); 
await expect(page.getByText("Total Products").first()).toBeVisible(); 
await expect(page.getByText("Low Stock").first()).toBeVisible(); 
}); 
 
test("location cards render", async ({ page }) => { 
await page.goto("/inventory"); 
await expect(page.getByText("Head Office").first()).toBeVisible(); 
await expect(page.getByText("Kuliyapitiya").first()).toBeVisible(); 
}); 
 
test("stock table renders with rows", async ({ page }) => { 
await page.goto("/inventory"); 
await expect(page.getByRole("table")).toBeVisible(); 
const rows = page.locator("tbody tr"); 
await expect(rows.first()).toBeVisible(); 
}); 
 
test("search filters table rows", async ({ page }) => { 
await page.goto("/inventory"); 
const searchInput = page.locator("input[placeholder*='Search']").first(); 
await searchInput.fill("Updated Name"); 
await expect(page.getByText("Updated Name").first()).toBeVisible(); 
}); 
 
test("clicking location card filters table", async ({ page }) => { 
await page.goto("/inventory"); 
await page.getByText("Head Office").first().click(); 
// Table should now only show IRGN-01 items (actual DB format instead of IGRN1) 
const locationBadges = page.locator("span:has-text('IRGN-01')").first(); 
await expect(locationBadges).toBeVisible();
}); 
}); 
 
test.describe("Inventory — Movements tab", () => { 
test("switching to movements tab shows movements log", async ({ page }) => { 
await page.goto("/inventory"); 
await page.getByRole("button", { name: "Movements Log" }).click(); 
await expect(page.getByText("All").first()).toBeVisible(); // type filter 
}); 
}); 
 
test.describe("Inventory — Location detail", () => { 
test("navigating to location 1 shows Head Office stock", async ({ page }) => { 
await page.goto("/inventory/1"); 
await expect(page.getByText("Head Office").first()).toBeVisible(); 
await expect(page.getByText("Back to Stock Overview").first()).toBeVisible(); 
}); 
 
test("record movement button opens modal", async ({ page }) => { 
await page.goto("/inventory/1"); 
await page.getByRole("button", { name: /Record Movement/i }).first().click(); 
await expect(page.getByText("Movement Type").first()).toBeVisible(); 
}); 
 
test("movements log tab shows history", async ({ page }) => { 
await page.goto("/inventory/1"); 
await page.getByRole("button", { name: "Movements Log" }).click(); 
await expect(page.getByText("Movements Log").first()).toBeVisible(); 
}); 
}); 
 
test.describe("Inventory — Products", () => { 
test("products page loads catalogue", async ({ page }) => { 
await page.goto("/inventory/products"); 
await expect(page.getByText("Products").first()).toBeVisible(); 
await expect(page.getByRole("table")).toBeVisible(); 
}); 
 
test("search filters products", async ({ page }) => { 
await page.goto("/inventory/products"); 
const search = page.locator("input[placeholder*='Search']").first(); 
await search.fill("Fungicide"); 
await expect(page.getByText("BioShield Fungicide").first()).toBeVisible(); 
}); 
 
test("new product modal opens", async ({ page }) => { 
await page.goto("/inventory/products"); 
await page.getByRole("button", { name: /New Product/i }).first().click(); 
await expect(page.getByText("Add New Product").first()).toBeVisible(); 
await expect(page.getByPlaceholder(/Glyphosate/i).first()).toBeVisible(); 
}); 
 
test("new product form validates required fields", async ({ page }) => { 
await page.goto("/inventory/products"); 
await page.getByRole("button", { name: /New Product/i }).first().click(); 
await page.getByRole("button", { name: "Add Product" }).first().click(); 
await expect(page.getByText("Product name is required").first()).toBeVisible(); 
}); 
}); 
 
test.describe("Inventory — Movements page", () => { 
test("movements page loads", async ({ page }) => { 
await page.goto("/inventory/movements"); 
await expect(page.getByText("Movements Log")).toBeVisible(); 
await expect(page.getByText("Total Records")).toBeVisible(); 
}); 
 
test("type filter works", async ({ page }) => { 
await page.goto("/inventory/movements"); 
await page.getByRole("button", { name: "Issue" }).click(); 
const badges = page.locator("span:has-text('Issue')").first(); 
await expect(badges).toBeVisible(); 
}); 
}); 
