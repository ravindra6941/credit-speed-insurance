import { jsPDF } from "jspdf";
import { CustomerWithRelations } from "@/lib/types";

/**
 * Generates a 2-page A4 warranty document for a customer using jsPDF.
 *
 * Layout closely mirrors the reference Credit Kuber warranty pack but uses
 * Credit Speed branding (navy/gold) and is generated entirely client-side
 * — no server roundtrip, no PDF storage, just a download.
 */

const COMPANY = {
  name: "Credit Speed Microfinance Private Limited",
  address: "Office address opening soon — Uttar Pradesh, India",
  email: "ravindrasingh258241@gmail.com",
  phone: "+91 88249 20949",
} as const;

const NAVY = "#0A1628";
const GOLD = "#C39236";
const TEXT = "#1a1a1a";
const MUTED = "#6b7280";

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export function generateWarrantyPDF(customer: CustomerWithRelations) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  let y = margin;

  // ─────────────────────────────────────────────────────────────────────
  //  HEADER — gold band with brand wordmark
  // ─────────────────────────────────────────────────────────────────────
  doc.setFillColor(NAVY);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setFillColor(GOLD);
  doc.rect(0, 68, pageWidth, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#FFFFFF");
  doc.text("Credit", pageWidth / 2 - 50, 38, { align: "left" });
  doc.setTextColor(GOLD);
  doc.text("Speed", pageWidth / 2 + 5, 38, { align: "left" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#FFFFFF");
  doc.text("INSURANCE", pageWidth / 2 - 23, 52, { align: "left" });

  y = 100;

  // ─────────────────────────────────────────────────────────────────────
  //  TITLE
  // ─────────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(TEXT);
  doc.text(
    "Smartphone / Consumer Durable Device Protection / Extended Warranty Pack",
    pageWidth / 2,
    y,
    { align: "center", maxWidth: pageWidth - margin * 2 }
  );
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  const intro = `We are pleased to welcome you to the Mobile/Consumer Durable Device protection/Extended Warranty pack, provided by ${COMPANY.name}, for the benefit of the customer of Standard Protection / Extended Plan from Credit Speed Insurance.`;
  const introLines = doc.splitTextToSize(intro, pageWidth - margin * 2);
  doc.text(introLines, margin, y);
  y += introLines.length * 12 + 14;

  // ─────────────────────────────────────────────────────────────────────
  //  HELPER — section heading
  // ─────────────────────────────────────────────────────────────────────
  const sectionHeading = (label: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(NAVY);
    doc.text(label, margin, y);
    y += 6;
    doc.setDrawColor(GOLD);
    doc.setLineWidth(1.5);
    doc.line(margin, y, margin + 60, y);
    y += 12;
  };

  // ─────────────────────────────────────────────────────────────────────
  //  HELPER — 2-column key/value table
  // ─────────────────────────────────────────────────────────────────────
  const kvTable = (rows: [string, string][]) => {
    const colWidth = (pageWidth - margin * 2) / 2;
    const cellHeight = 22;

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);

    rows.forEach((pair, i) => {
      const rowY = y + i * cellHeight;

      // Border around the whole row
      doc.rect(margin, rowY, pageWidth - margin * 2, cellHeight);
      // Vertical divider in the middle
      doc.line(margin + colWidth, rowY, margin + colWidth, rowY + cellHeight);

      // Key cell — gray background
      doc.setFillColor(245, 245, 247);
      doc.rect(margin, rowY, 90, cellHeight, "F");
      doc.rect(margin + colWidth, rowY, 90, cellHeight, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(NAVY);
      doc.text(pair[0], margin + 6, rowY + 14);

      // Value
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(TEXT);
      doc.text(pair[1] || "—", margin + 96, rowY + 14, {
        maxWidth: colWidth - 100,
      });
    });

    y += rows.length * cellHeight + 18;
  };

  // ─────────────────────────────────────────────────────────────────────
  //  CUSTOMER DETAILS
  // ─────────────────────────────────────────────────────────────────────
  sectionHeading("Customer Details");
  kvTable([
    ["Customer ID", customer.customer_code],
    ["Contact", customer.mobile || "—"],
    ["Customer Name", customer.name],
    ["Email", customer.email || "—"],
  ]);

  // ─────────────────────────────────────────────────────────────────────
  //  PRODUCT DETAILS
  // ─────────────────────────────────────────────────────────────────────
  sectionHeading("Product Details");
  kvTable([
    ["Category", "Smartphone"],
    ["Brand", customer.brand || "—"],
    ["Model", customer.model || "—"],
    ["IMEI 1", customer.imei_serial || "—"],
    ["IMEI 2", customer.imei2_serial || "—"],
    ["Product Value", `₹${fmtINR(customer.product_value)}`],
  ]);

  // ─────────────────────────────────────────────────────────────────────
  //  PLAN DETAILS
  // ─────────────────────────────────────────────────────────────────────
  sectionHeading("Plan Details");
  kvTable([
    ["Plan Type", customer.plan?.name || "—"],
    ["Plan Value", `₹${fmtINR(customer.plan_amount)}`],
    ["GST", `₹${fmtINR(customer.gst_amount)}`],
    ["Total Value", `₹${fmtINR(customer.total_amount)}`],
    ["Start Date", fmtDate(customer.warranty_start)],
    ["End Date", fmtDate(customer.warranty_end)],
  ]);

  // Merchant — full row at the bottom
  const mWidth = pageWidth - margin * 2;
  const mHeight = 22;
  doc.setDrawColor(220, 220, 220);
  doc.rect(margin, y, mWidth, mHeight);
  doc.setFillColor(245, 245, 247);
  doc.rect(margin, y, 110, mHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(NAVY);
  doc.text("Merchant Name", margin + 6, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(TEXT);
  doc.text(customer.retailer?.shop_name || "—", margin + 116, y + 14, {
    maxWidth: mWidth - 120,
  });
  y += mHeight + 20;

  // ─────────────────────────────────────────────────────────────────────
  //  TERMS & CONDITIONS — wraps onto page 2 if needed
  // ─────────────────────────────────────────────────────────────────────
  const terms = `Your Protection pack to the mobile Device brings you the benefits of Accidental & Liquid damage Protection, No Theft and Burglary is covered under this plan. For Consumer durable product a benefit for 2nd year Extended warranty as per OEM, it is important to you to know that damage or defects caused by unauthorized repair, incorrect installation, theft, burglary, accident, terrorism, abuse or misuse of the product, fire, use on an incorrect voltage, power dips, poor environmental operating conditions, thunder storm, household pets, rats, cockroaches or any other animals or insects, Force Majeure etc. are not covered. The plan does not cover accessories, consumables, external items etc. Specific exclusions related to certain products may also apply. You must read the terms and conditions of your Service Plan very carefully before requesting for service. Those services and parts which are not covered in part or full in the Service Plan are charged extra. For any doubts or clarifications, please feel free to contact us.

In Total Loss Case Salvage and depreciation will be deducted as per aging of handset. (Refer T&C)

Excess Fee for repair to be paid by Customer Rs Five hundred in 10% of the repair cost whichever is higher. The Protection Cover is available for the one year from the date of Purchased you are advised to contact Credit Speed Insurance Services Limited. For claim processing. Note: Customer is eligible for a Maximum 1 time claim during the plan period Please note that all claims must be filed directly with Credit Speed Insurance Services Limited.

No amount shall be refunded to the customer in case this protection plan cover is terminated/cancelled by the customer.

In case of Total Loss or BER Depreciation clause for all Mobile:
  • (0-3 Month) 40% payable
  • (4-6 Month) 30% payable
  • (7-9 Month) 20% payable
  • (10-12 Month) 10% payable

If Device is under Total Loss criteria reimburse value will be credited in Particular Authorized Merchant only.

Mobile device purchased from Outside India is not covered.

Plans available for only new devices and should be activated within 3 days of Purchased.

For full details on the service provided through this protection pack/EW including Terms & Conditions, you can visit our, mail on ${COMPANY.email} or call on ${COMPANY.phone}.`;

  // Page break check
  if (y > 700) {
    doc.addPage();
    y = margin + 20;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT);
  const termLines = doc.splitTextToSize(terms, pageWidth - margin * 2);

  termLines.forEach((line: string) => {
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = margin + 20;
    }
    doc.text(line, margin, y);
    y += 11;
  });

  // ─────────────────────────────────────────────────────────────────────
  //  FOOTER on the last page
  // ─────────────────────────────────────────────────────────────────────
  if (y > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage();
    y = margin + 20;
  } else {
    y += 14;
  }

  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text("*GST as Applicable", pageWidth / 2, y, { align: "center" });
  y += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text(COMPANY.name, pageWidth / 2, y, { align: "center" });
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text(COMPANY.address, pageWidth / 2, y, {
    align: "center",
    maxWidth: pageWidth - margin * 2,
  });
  y += 14;
  doc.text(
    `${COMPANY.email}  •  ${COMPANY.phone}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 18;

  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(
    `Copyright © 2024-${new Date().getFullYear()}. All rights reserved.`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  // Trigger download
  const filename = `Warranty_${customer.customer_code}_${
    customer.name?.replace(/\s+/g, "_") || "customer"
  }.pdf`;
  doc.save(filename);
}
