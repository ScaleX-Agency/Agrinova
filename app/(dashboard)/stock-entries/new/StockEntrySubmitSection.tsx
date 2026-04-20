type StockEntrySubmitSectionProps = {
  notes: string;
  isSaving: boolean;
  submitError: string;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

const StockEntrySubmitSection = ({
  notes,
  isSaving,
  submitError,
  onNotesChange,
  onSave,
  onCancel,
}: StockEntrySubmitSectionProps) => {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 md:p-5 space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-stone-600">Notes</label>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Supplier, delivery reference, customs info (optional)..."
          className="min-h-[100px] rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 outline-none focus:border-[#1a5c2e] placeholder:text-stone-400"
        />
      </div>

      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="rounded-xl bg-[#1a5c2e] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save Stock Entry"}
        </button>
      </div>
    </section>
  );
};

export default StockEntrySubmitSection;
