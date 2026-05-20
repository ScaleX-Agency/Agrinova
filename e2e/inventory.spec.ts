import { test, expect } from "@playwright/test";

test.describe("Inventory - Stock Overview", () => {
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
});

test.describe("Inventory - Location detail", () => {
  test("navigating to location 1 shows Head Office stock", async ({ page }) => {
    await page.goto("/inventory/1");
    await expect(page.getByText("Head Office").first()).toBeVisible();
    await expect(page.getByText("Back to Stock Overview").first()).toBeVisible();
  });
});

test.describe("Inventory - Products", () => {
  test("products page loads catalogue", async ({ page }) => {
    await page.goto("/inventory/products");
    await expect(page.getByText("Products").first()).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });
});
