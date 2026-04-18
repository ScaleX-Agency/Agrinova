import type { Metadata } from "next";
import ReceiptsClient from "./ReceiptsClient";

export const metadata: Metadata = {
  title: "Receipts",
};

const ReceiptsPage = () => {
  return <ReceiptsClient />;
};

export default ReceiptsPage;
