# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory_api.spec.ts >> Inventory API Routes >> GET /api/categories returns success and expected structure
- Location: e2e/inventory_api.spec.ts:14:7

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
  4  |   let testLocationId = 1;
  5  | 
  6  |   test.beforeAll(async ({ request }) => {
  7  |     const res = await request.get('/api/locations');
  8  |     const data = await res.json();
  9  |     if (data && data.data && data.data.length > 0) {
  10 |       testLocationId = data.data[0].id;
  11 |     }
  12 |   });
  13 | 
  14 |   test('GET /api/categories returns success and expected structure', async ({ request }) => {
  15 |     const response = await request.get('/api/categories');
> 16 |     expect(response.ok()).toBeTruthy();
     |                           ^ Error: expect(received).toBeTruthy()
  17 |     const data = await response.json();
  18 |     expect(data.categories).toBeDefined();
  19 |     expect(Array.isArray(data.categories)).toBe(true);
  20 |     if (data.categories.length > 0) {
  21 |       expect(data.categories[0]).toHaveProperty('category_id');
  22 |       expect(data.categories[0]).toHaveProperty('name');
  23 |     }
  24 |   });
  25 | 
  26 |   test('GET /api/locations returns success and expected structure', async ({ request }) => {
  27 |     const response = await request.get('/api/locations');
  28 |     expect(response.ok()).toBeTruthy();
  29 |     const data = await response.json();
  30 |     expect(data.data).toBeDefined();
  31 |     expect(Array.isArray(data.data)).toBe(true);
  32 |     if (data.data.length > 0) {
  33 |       expect(data.data[0]).toHaveProperty('location_id');
  34 |       expect(data.data[0]).toHaveProperty('code');
  35 |     }
  36 |   });
  37 | 
  38 |   test('POST /api/inventory/stock creates stock entry', async ({ request }) => {
  39 |     const response = await request.post('/api/inventory/stock', {
  40 |       data: {
  41 |         date: new Date().toISOString(),
  42 |         location_id: testLocationId,
  43 |         entry_type: "LOCAL_PURCHASE",
  44 |         items: [{
  45 |           product_id: 1,
  46 |           quantity: 50
  47 |         }]
  48 |       }
  49 |     });
  50 |     if (response.ok()) {
  51 |       const data = await response.json();
  52 |       expect(data.grn_id).toBeDefined();
  53 |     } else {
  54 |       expect([400, 401]).toContain(response.status()); 
  55 |     }
  56 |   });
  57 | 
  58 |   test('POST /api/inventory/import handles bulk imports', async ({ request }) => {
  59 |     const response = await request.post('/api/inventory/import', {
  60 |       data: [
  61 |         { product_code: 'TEST-001', location_code: 'IGRN1', quantity: 10, entry_type: 'PURCHASE' }
  62 |       ]
  63 |     });
  64 |     expect([201, 400, 401]).toContain(response.status());
  65 |   });
  66 | 
  67 |   test('PATCH /api/products/[productId] updates product', async ({ request }) => {
  68 |     const response = await request.patch('/api/products/1', {
  69 |       data: {
  70 |         product_name: 'Updated Name',
  71 |         selling_price: 15.5
  72 |       }
  73 |     });
  74 |     expect([200, 400, 404]).toContain(response.status());
  75 |   });
  76 | 
  77 |   test('DELETE /api/products/[productId] deletes product', async ({ request }) => {
  78 |     const response = await request.delete('/api/products/9999'); 
  79 |     expect([200, 400, 404]).toContain(response.status());
  80 |   });
  81 | 
  82 |   test('DELETE /api/stock-movements/[movementId] deletes movement', async ({ request }) => {
  83 |     const response = await request.delete('/api/stock-movements/9999'); 
  84 |     expect([200, 400, 404]).toContain(response.status());
  85 |   });
  86 | 
  87 | });
  88 | 
```