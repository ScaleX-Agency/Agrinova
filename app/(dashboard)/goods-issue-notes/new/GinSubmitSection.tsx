import BackNavigationLink from "@/components/ui/BackNavigationLink";

type GinSubmitSectionProps = {
  submitError: string;
  successMessage: string;
  isSaving: boolean;
};

const GinSubmitSection = ({
  submitError,
  successMessage,
  isSaving,
}: GinSubmitSectionProps) => {
  return (
    <>
      {submitError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {submitError}
        </p>
      )}

      {successMessage && (
        <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[13px] text-green-700">
          <p>{successMessage}</p>
          <BackNavigationLink
            href="/goods-issue-notes"
            label="Back to Goods Issue Notes"
            showIcon={false}
            className="inline-flex text-[12px] font-semibold text-green-800 underline"
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1a5c2e] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2d7a42]"
        >
          {isSaving ? "Saving..." : "Save Goods Issue Note"}
        </button>
      </div>
    </>
  );
};

export default GinSubmitSection;