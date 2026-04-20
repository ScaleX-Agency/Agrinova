# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory_api.spec.ts >> Inventory API Routes >> GET /api/categories returns success and expected structure
- Location: e2e/inventory_api.spec.ts:5:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Inventory API Routes', () => {
  4  | 
  5  |   test('GET /api/categories returns success and expected structure', async ({ request }) => {
  6  |     const response = await request.get('/api/categories');
> 7  |     expect(response.ok()).toBeTruthy();
     |                           ^ Error: expect(received).toBeTruthy()
  8  |     const data = await response.json();
  9  |     expect(data.categories).toBeDefined();
  10 |     expect(Array.isArray(data.categories)).toBe(true);
  11 |     if (data.categories.length > 0) {
  12 |       expect(data.categories[0]).toHaveProperty('category_id');
  13 |       expect(data.categories[0]).toHaveProperty('name');
  14 |     }
  15 |   });
  16 | 
  17 |   test('GET /api/locations returns success and expected structure', async ({ request }) => {
  18 |     const response = await request.get('/api/locations');
  19 |     expect(response.ok()).toBeTruthy();
  20 |     const data = await response.json();
  21 |     expect(data.locations).toBeDefined();
  22 |     expect(Array.isArray(data.locations)).toBe(true);
  23 |     if (data.locations.length > 0) {
  24 |       expect(data.locations[0]).toHaveProperty('location_id');
  25 |       expect(data.locations[0]).toHaveProperty('code');
  26 |     }
  27 |   });
  28 | 
  29 |   test('POST /api/inventory/stock creates stock entry', async ({ request }) => {
  30 |     const response = await request.post('/api/inventory/stock', {
  31 |       data: {
  32 |         product_id: 1,
  33 |         location_id: 1,
  34 |         quantity: 50
  35 |       }
  36 |     });
  37 |     if (response.ok()) {
  38 |       const data = await response.json();
  39 |       expect(data.stock_id).toBeDefined();
  40 |     } else {
  41 |       expect(response.status()).toBe(400); 
  42 |     }
  43 |   });
  44 | 
  45 |   test('POST /api/inventory/import handles bulk imports', async ({ request }) => {
  46 |     const response = await request.post('/api/inventory/import', {
  47 |       data: [
  48 |         { product_code: 'TEST-001', location_code: 'IGRN1', quantity: 10, entry_type: 'PURCHASE' }
  49 |       ]
  50 |     });
  51 |     expect([201, 400]).toContain(response.status());
  52 |   });
  53 | 
  54 |   test('PATCH /api/products/[productId] updates product', async ({ request }) => {
  55 |     const response = await request.patch('/api/products/1', {
  56 |       data: {
  57 |         product_name: 'Updated Name',
  58 |         selling_price: 15.5
  59 |       }
  60 |     });
  61 |     expect([200, 400, 404]).toContain(response.status());
  62 |   });
  63 | 
  64 |   test('DELETE /api/products/[productId] deletes product', async ({ request }) => {
  65 |     const response = await request.delete('/api/products/9999'); 
  66 |     expect([200, 400, 404]).toContain(response.status());
  67 |   });
  68 | 
  69 |   test('DELETE /api/stock-movements/[movementId] deletes movement', async ({ request }) => {
  70 |     const response = await request.delete('/api/stock-movements/9999'); 
  71 |     expect([200, 400, 404]).toContain(response.status());
  72 |   });
  73 | 
  74 | });
  75 | 
```