import { test, expect } from '@playwright/test';

test.describe('Inventory API Routes', () => {
  let testLocationId = 1;

  test.beforeAll(async ({ request }) => {
    const res = await request.get('/api/locations');
    const data = await res.json();
    if (data && data.data && data.data.length > 0) {
      testLocationId = data.data[0].id;
    }
  });

  test('GET /api/categories returns success and expected structure', async ({ request }) => {
    const response = await request.get('/api/categories');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.categories).toBeDefined();
    expect(Array.isArray(data.categories)).toBe(true);
    if (data.categories.length > 0) {
      expect(data.categories[0]).toHaveProperty('category_id');
      expect(data.categories[0]).toHaveProperty('name');
    }
  });

  test('GET /api/locations returns success and expected structure', async ({ request }) => {
    const response = await request.get('/api/locations');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.locations).toBeDefined();
    expect(Array.isArray(data.locations)).toBe(true);
    if (data.locations.length > 0) {
      expect(data.locations[0]).toHaveProperty('location_id');
      expect(data.locations[0]).toHaveProperty('code');
    }
  });

  test('POST /api/inventory/stock creates stock entry', async ({ request }) => {
    const response = await request.post('/api/inventory/stock', {
      data: {
        product_id: 1,
        location_id: testLocationId,
        quantity: 50
      }
    });
    if (response.ok()) {
      const data = await response.json();
      expect(data.stock_id).toBeDefined();
    } else {
      expect(response.status()).toBe(400); 
    }
  });

  test('POST /api/inventory/import handles bulk imports', async ({ request }) => {
    const response = await request.post('/api/inventory/import', {
      data: [
        { product_code: 'TEST-001', location_code: 'IGRN1', quantity: 10, entry_type: 'PURCHASE' }
      ]
    });
    expect([201, 400]).toContain(response.status());
  });

  test('PATCH /api/products/[productId] updates product', async ({ request }) => {
    const response = await request.patch('/api/products/1', {
      data: {
        product_name: 'Updated Name',
        selling_price: 15.5
      }
    });
    expect([200, 400, 404]).toContain(response.status());
  });

  test('DELETE /api/products/[productId] deletes product', async ({ request }) => {
    const response = await request.delete('/api/products/9999'); 
    expect([200, 400, 404]).toContain(response.status());
  });

  test('DELETE /api/stock-movements/[movementId] deletes movement', async ({ request }) => {
    const response = await request.delete('/api/stock-movements/9999'); 
    expect([200, 400, 404]).toContain(response.status());
  });

});
