import { jsPDF } from "jspdf";
import { CustomerWithRelations } from "@/lib/types";

/**
 * Warranty Pack — modelled exactly on the reference layout the team is
 * already familiar with. White background, green title, dark-grey section
 * header bars, 4-column key/value tables with thin grey borders, black
 * body text, centered company footer.
 *
 * Async because we load the brand logo SVG and rasterize it via the
 * canvas API before adding to the PDF.
 */

const COMPANY = {
  name: "Credit Speed Microfinance Private Limited",
  address: "Office address opening soon — Uttar Pradesh, India",
  email: "admin@creditspeed.in",
  phone: "+91 88249 20949",
} as const;

// Palette — picked to match the reference doc, not the dark cinematic UI.
const TITLE_GREEN = "#22A355";
const SECTION_BG  = "#D1D5DB"; // dark grey bar
const BORDER      = "#9CA3AF";
const TEXT        = "#111827";
const MUTED       = "#6B7280";

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

/** Fetch /logo.svg, draw it on a canvas, return base64 PNG data URL. */
async function loadLogoAsPng(size = 200): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/logo.svg");
    if (!res.ok) return null;
    const svgText = await res.text();
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    return await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          return resolve(null);
        }
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

export async function generateWarrantyPDF(customer: CustomerWithRelations) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  let y = 30;

  // ─────────────────────────────────────────────────────────────────────
  //  HEADER — centered logo
  // ─────────────────────────────────────────────────────────────────────
  const logoPng = await loadLogoAsPng(220);
  if (logoPng) {
    const logoW = 55;
    const logoH = 55;
    doc.addImage(logoPng, "PNG", pageWidth / 2 - logoW / 2, y, logoW, logoH);
    y += logoH + 6;
  } else {
    // Fallback — text wordmark if logo couldn't load
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor("#0A1628");
    doc.text("Credit", pageWidth / 2 - 4, y + 18, { align: "right" });
    doc.setTextColor("#C39236");
    doc.text("Speed", pageWidth / 2 + 4, y + 18, { align: "left" });
    y += 36;
  }

  // ─────────────────────────────────────────────────────────────────────
  //  TITLE (green, centered)
  // ─────────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(TITLE_GREEN);
  doc.text(
    "Smartphone / Consumer Durable Device Protection / Extended Warranty Pack",
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 16;

  // ─────────────────────────────────────────────────────────────────────
  //  WELCOME paragraph
  // ─────────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT);
  const intro = `We are pleased to Welcome you to the Mobile/Consumer Durable Device protection/Extended Warranty pack, provided by ${COMPANY.name}. for the benefit of the customer of Standard Protection / Extended Plan from ${COMPANY.name}.`;
  const introLines = doc.splitTextToSize(intro, pageWidth - margin * 2);
  doc.text(introLines, margin, y + 8);
  y += introLines.length * 11 + 12;

  // ─────────────────────────────────────────────────────────────────────
  //  HELPERS — section header bar + 4-column kv table
  // ─────────────────────────────────────────────────────────────────────
  const sectionHeader = (label: string) => {
    const h = 18;
    doc.setFillColor(SECTION_BG);
    doc.rect(margin, y, pageWidth - margin * 2, h, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(TEXT);
    doc.text(label, margin + 6, y + 12);
    y += h;
  };

  /**
   * Render rows of [label1, value1, label2, value2]. If a row only has
   * 2 items, the right half is left blank (still bordered).
   */
  const kvTable = (rows: Array<[string, string, string?, string?]>) => {
    const tableW = pageWidth - margin * 2;
    const colW = tableW / 4;
    const cellH = 22;

    doc.setDrawColor(BORDER);
    doc.setLineWidth(0.4);

    rows.forEach((row, i) => {
      const ry = y + i * cellH;

      // Outer border for the row
      doc.rect(margin, ry, tableW, cellH);
      // 3 vertical dividers
      for (let c = 1; c < 4; c++) {
        doc.line(margin + colW * c, ry, margin + colW * c, ry + cellH);
      }

      // Labels — bold black
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(TEXT);
      doc.text(row[0], margin + 6, ry + 14);
      if (row[2]) doc.text(row[2], margin + colW * 2 + 6, ry + 14);

      // Values — regular
      doc.setFont("helvetica", "normal");
      doc.text(row[1] || "—", margin + colW + 6, ry + 14, {
        maxWidth: colW - 10,
      });
      if (row[3] !== undefined) {
        doc.text(row[3] || "—", margin + colW * 3 + 6, ry + 14, {
          maxWidth: colW - 10,
        });
      }
    });

    y += rows.length * cellH;
  };

  // ─────────────────────────────────────────────────────────────────────
  //  CUSTOMER DETAILS
  // ─────────────────────────────────────────────────────────────────────
  sectionHeader("Customer Details");
  kvTable([
    ["Customer Id", customer.customer_code, "Contact", customer.mobile || "—"],
    ["Customer Name", customer.name, "Email", customer.email || "—"],
  ]);
  y += 8;

  // ─────────────────────────────────────────────────────────────────────
  //  PRODUCT DETAILS
  // ─────────────────────────────────────────────────────────────────────
  sectionHeader("Product Details");
  kvTable([
    ["Category", "Smartphone", "Brand", customer.brand || "—"],
    ["Model", customer.model || "—", "IMEI / Serial No.", customer.imei_serial || "—"],
    ["Product Value", `Rs. ${fmtINR(customer.product_value)}`, "", ""],
  ]);
  y += 8;

  // ─────────────────────────────────────────────────────────────────────
  //  PLAN DETAIL
  // ─────────────────────────────────────────────────────────────────────
  sectionHeader("Plan Detail");
  kvTable([
    ["Plan Type", customer.plan?.name || "—", "Plan Value", `Rs. ${fmtINR(customer.plan_amount)}`],
    ["GST", `Rs. ${fmtINR(customer.gst_amount)}`, "Total Value", `Rs. ${fmtINR(customer.total_amount)}`],
    ["Start Date", fmtDate(customer.warranty_start), "End Date", fmtDate(customer.warranty_end)],
    ["Merchant Name", customer.retailer?.shop_name || "—", "", ""],
  ]);
  y += 14;

  // ─────────────────────────────────────────────────────────────────────
  //  BODY TEXT — paragraphs + bullet list
  // ─────────────────────────────────────────────────────────────────────
  const writePara = (text: string, opts: { bold?: boolean; gap?: number } = {}) => {
    if (y > pageHeight - 80) {
      doc.addPage();
      y = margin + 10;
    }
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(TEXT);
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    lines.forEach((line: string) => {
      if (y > pageHeight - 80) {
        doc.addPage();
        y = margin + 10;
      }
      doc.text(line, margin, y);
      y += 11;
    });
    y += opts.gap ?? 6;
  };

  writePara(
    `Your Protection pack to the mobile Device brings you the benefits of Accidental & Liquid damage Protection, No Theft and Burglary is covered under this plan. For Consumer durable product a benefit for 2nd year Extended warranty as per OEM, it is important for you to know that damage or defects caused by unauthorized repair, incorrect installation, theft, burglary, accident, terrorism, abuse or misuse of the product, fire, use on an incorrect voltage, power dips, poor environmental operating conditions, thunder storm, household pets, rats, cockroaches or any other animals or insects, Force Majeure etc. are not covered. The plans also do not cover accessories, consumables, external items etc. Specific exclusions related to certain products may also apply. You must read the terms and conditions of your Service Plan very carefully before requesting for service. Those services and parts which are not covered in part or full in the Service Plan are charged extra. For any doubts or clarifications, please feel free to contact us.`
  );

  writePara(
    `In Total Loss Case Salvage and depreciation will be deducted as per aging of handset. (Refer T&C)`
  );

  writePara(
    `Excess Fee for repair to be paid by Customer Rs Five hundred or 10% of the repair cost whichever is higher. The Protection Cover is available for the one year from the date of Purchased you are advised to contact ${COMPANY.name} SERVICES. For claim processing. Note: Customer is eligible for a Maximum 1 time claim during the plan period Please note that all claims must be filed directly with ${COMPANY.name}.`
  );

  writePara(
    `No amount shall be refunded to the customer in case this protection plan cover is terminated/cancelled by the customer.`
  );

  writePara(`In case of Total Loss or BER Depreciation clause for all Mobile:`, {
    bold: true,
    gap: 2,
  });

  // Bullet list
  const bullets = [
    "(0-3 Month) 40% payable",
    "(4-6 Month) 30% payable",
    "(7-9 Month) 20% payable",
    "(10-12 Month) 10% payable",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT);
  bullets.forEach((b) => {
    if (y > pageHeight - 80) {
      doc.addPage();
      y = margin + 10;
    }
    doc.text(`•   ${b}`, margin + 14, y);
    y += 11;
  });
  y += 6;

  writePara(
    `If Device is under Total Loss criteria reimburse value will be credited in Particular Authorized Merchant only.`,
    { bold: true }
  );
  writePara(`Mobile device purchased from Outside India is not covered.`);
  writePara(
    `Plans available for only new devices and should be activated within 3 days of Purchased.`
  );
  writePara(
    `For full details on the service provided through this protection pack/EW including Terms & Conditions, you can visit our, mail on ${COMPANY.email} or call on ${COMPANY.phone}.`
  );

  // ─────────────────────────────────────────────────────────────────────
  //  FOOTER — separator + centered company block
  // ─────────────────────────────────────────────────────────────────────
  if (y > pageHeight - 110) {
    doc.addPage();
    y = margin + 10;
  } else {
    y += 6;
  }
  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text("*GST as Applicable", pageWidth / 2, y, { align: "center" });
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(TEXT);
  doc.text(`${COMPANY.name} .`, pageWidth / 2, y, { align: "center" });
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(COMPANY.address, pageWidth / 2, y, {
    align: "center",
    maxWidth: pageWidth - margin * 2,
  });
  y += 14;

  doc.text(
    `Copyright © 2024-${new Date().getFullYear()}. All rights reserved.`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  // ─────────────────────────────────────────────────────────────────────
  //  Save
  // ─────────────────────────────────────────────────────────────────────
  const safeName = (customer.name || "customer").replace(/\s+/g, "_");
  doc.save(`Warranty_${customer.customer_code}_${safeName}.pdf`);
}
