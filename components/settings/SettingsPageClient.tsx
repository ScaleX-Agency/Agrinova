"use client";

   
   
   
  // eslint-disable-next-line
import { Building2, Shield, Bell, MapPin } from "lucide-react";

export default function SettingsPageClient() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-stone-400 [font-family:var(--font-dmsans)] mb-1">
            Configuration
          </p>
          <h1 className="text-[26px] font-semibold text-stone-900 [font-family:var(--font-dmsans)] leading-tight">
            Settings
          </h1>
          <p className="text-[13px] text-stone-400 mt-1 [font-family:var(--font-dmsans)]">
            Manage your company profile, locations, and system preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* <div className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                Company Information
              </h3>
              <p className="text-[12.5px] text-stone-500 mt-0.5 [font-family:var(--font-dmsans)]">
                Update company name, address, and contact details.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                Locations
              </h3>
              <p className="text-[12.5px] text-stone-500 mt-0.5 [font-family:var(--font-dmsans)]">
                Manage inventory locations and warehouses.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                Security & Backup
              </h3>
              <p className="text-[12.5px] text-stone-500 mt-0.5 [font-family:var(--font-dmsans)]">
                Configure data backups and security policies.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-stone-900 [font-family:var(--font-dmsans)]">
                Notifications
              </h3>
              <p className="text-[12.5px] text-stone-500 mt-0.5 [font-family:var(--font-dmsans)]">
                Manage email and system alert preferences.
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
