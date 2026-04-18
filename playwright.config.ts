import { defineConfig } from "@playwright/test";

export default defineConfig({ 
testDir: "./e2e", 
use: { 
baseURL: "http://localhost:3000", 
headless: true, 
screenshot: "only-on-failure", 
video: "retain-on-failure", 
}, 
projects: [{ name: "chromium", use: { browserName: "chromium" } }], 
webServer: { 
command: "npm run dev", 
url: "http://localhost:3000", 
reuseExistingServer: true, // ← reuses running dev server, saves time 
timeout: 30000, 
}, 
}); 
