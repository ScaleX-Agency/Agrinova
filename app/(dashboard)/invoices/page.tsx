import type { Metadata } from "next";
import InvoicesClient from "./InvoicesClient";

export const metadata: Metadata = {
  title: "Invoices",
};

const InvoicesPage = () => {
  return <InvoicesClient />;
};

export default InvoicesPage;
