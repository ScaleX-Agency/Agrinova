1. **Current System Analysis**:
   - Location is modelled via `InventoryLocation` in `prisma/schema.prisma`. It lacked `address`, `status`, `created_at` and `updated_at`.
   - APIs existed via `app/api/locations/route.ts` using hardcoded or generic database mapping.
   - Frontend `LOCATION_META` constant was hardcoded mapping. Dashboard was using it to parse through locations.
2. **Schema Changes**:
   - Added `address`, `status` (as `LocationStatus`), `created_at` and `updated_at` to `InventoryLocation`.
   - Created `LocationStatus` enum with `ACTIVE` and `INACTIVE` values.
3. **API Design**:
   - Refactored `GET /api/locations` to apply status filtering and updated response payload.
   - Designed `POST /api/locations` to create a location.
   - Designed `PATCH /api/locations/[id]` to update location.
   - Designed `DELETE /api/locations/[id]` to remove location (soft deletion fallback strategy applied).
4. **Frontend Changes**:
   - New dashboard sidebar tab added pointing to `/locations`.
   - React query hooks formulated into `hooks/useLocations.ts` with explicit type safety.
   - Built a comprehensive CRUD table under `app/(dashboard)/locations/page.tsx`.
   - Form modals for `AddLocationModal.tsx` and `EditLocationModal.tsx`.
5. **Dashboard improvements**:
   - The dashboard explicitly was updated removing the hardcoded logic (`LOCATION_META`) to natively parse out and display stock/movements/location mappings by grouping dynamically.
6. **Sorting/filtering plan**:
   - Provided via standard SQL `orderBy` in APIs and manual filtering map arrays in front-end pages.
7. **Hardcoded logic removal plan**:
   - Eliminated the local hardcoded location metadata definitions and explicitly pushed the system to only rely on either Prisma's results or extracted stock metadata groupings dynamically.
8. **Final implementation roadmap**: All implementations have been carried out via the modifications applied across this session. The full scope has been developed and pushed into the code base.
