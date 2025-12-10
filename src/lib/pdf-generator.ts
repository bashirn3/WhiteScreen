import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import { Response, Analytics, CallData, CustomMetricScore } from "@/types/response";
import { Interview } from "@/types/interview";

// Helper function to add header to PDF
const addHeader = (doc: jsPDF, title: string, subtitle?: string, candidateName?: string) => {
  doc.setFillColor(249, 115, 22); // Orange color (orange-500)
  doc.rect(0, 0, doc.internal.pageSize.width, 45, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  // Use candidate name in title if provided
  const headerTitle = candidateName ? `${candidateName} - ${title}` : title;
  doc.text(headerTitle, 20, 22);
  
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 20, 35);
  }
  
  doc.setTextColor(0, 0, 0);
};

// Helper function to draw circular progress chart
const drawCircularProgress = (
  doc: jsPDF,
  x: number,
  y: number,
  radius: number,
  value: number,
  maxValue: number,
  label: string
) => {
  const centerX = x + radius;
  const centerY = y + radius;
  const percentage = (value / maxValue) * 100;
  const angle = (percentage / 100) * 360;
  
  // Draw background circle (light gray)
  doc.setDrawColor(229, 231, 235); // gray-200
  doc.setLineWidth(3);
  doc.circle(centerX, centerY, radius, "S");
  
  // Draw progress arc (orange)
  if (percentage > 0) {
    doc.setDrawColor(249, 115, 22); // orange-500
    doc.setLineWidth(3);
    
    // Convert angle to radians and draw arc
    const startAngle = -90; // Start from top
    const endAngle = startAngle + angle;
    
    // Draw the arc in segments for better rendering
    const segments = Math.ceil(angle / 5);
    for (let i = 0; i <= segments; i++) {
      const currentAngle = startAngle + (angle * i / segments);
      const nextAngle = startAngle + (angle * (i + 1) / segments);
      
      const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180);
      const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180);
      const x2 = centerX + radius * Math.cos((nextAngle * Math.PI) / 180);
      const y2 = centerY + radius * Math.sin((nextAngle * Math.PI) / 180);
      
      if (i < segments) {
        doc.line(x1, y1, x2, y2);
      }
    }
  }
  
  // Draw value in center
  doc.setTextColor(249, 115, 22); // orange-500
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const valueText = maxValue === 100 ? value.toString() : `${value}/${maxValue}`;
  const textWidth = doc.getTextWidth(valueText);
  doc.text(valueText, centerX - textWidth / 2, centerY + 2);
  
  // Draw label below circle
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const labelWidth = doc.getTextWidth(label);
  doc.text(label, centerX - labelWidth / 2, centerY + radius + 8);
};

// Helper function to add footer to PDF
const addFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Add a separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
    
    // Add footer text
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}  |  Generated on ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 12,
      { align: "center" }
    );
  }
};

// Helper to check if we need a new page
const checkPageBreak = (doc: jsPDF, yPosition: number, neededSpace: number = 40): number => {
  const pageHeight = doc.internal.pageSize.height;
  if (yPosition + neededSpace > pageHeight - 30) {
    doc.addPage();
    return 20; // Reset to top of new page
  }
  return yPosition;
};

// Helper function to safely add text with word wrapping
const addWrappedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 7
): number => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

// Generate individual candidate PDF report (optimized for single page)
export const generateIndividualCandidatePDF = async (
  candidateName: string,
  candidateEmail: string,
  analytics: Analytics | null,
  callData: CallData | null,
  interviewName: string,
  recordingUrl?: string,
  transcriptUrl?: string
) => {
  const doc = new jsPDF();
  let yPosition = 50;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const isCVUpload = (callData as any)?.source === "cv_upload";

  // Add header with candidate name in title
  addHeader(
    doc, 
    isCVUpload ? "CV Analysis" : "Interview Report", 
    interviewName,
    candidateName || "Anonymous"
  );

  // Contact info (compact, no name since it's in header)
  yPosition = 55;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  
  let infoLine = candidateEmail ? `${candidateEmail}` : "";
  if (isCVUpload && (callData as any)?.fileName) {
    infoLine += infoLine ? `  •  ${(callData as any).fileName}` : (callData as any).fileName;
  }
  if (infoLine) {
    doc.text(infoLine, margin, yPosition);
    yPosition += 6;
  }
  
  // Recording and Transcript Links (only for interviews) - clean minimal style
  if (!isCVUpload && (recordingUrl || transcriptUrl)) {
    doc.setFontSize(10);
    let linkX = margin;
    
    if (recordingUrl) {
      doc.setTextColor(79, 70, 229);
      doc.textWithLink("[Play Recording]", linkX, yPosition, { url: recordingUrl });
      linkX += doc.getTextWidth("[Play Recording]") + 10;
    }
    
    if (transcriptUrl) {
      doc.setTextColor(34, 150, 80);
      doc.textWithLink("[View Transcript]", linkX, yPosition, { url: transcriptUrl });
    }
    yPosition += 6;
  }
  
  doc.setTextColor(0, 0, 0);
  yPosition += 6;

  // Scores Section
  if (analytics) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Evaluation Scores", margin, yPosition);
    yPosition += 10;

    // Draw circular progress charts side by side
    const chartRadius = 14;
    const chartSpacing = 55;
    const chartStartX = margin + 10;
    let chartsDrawn = 0;
    
    if (analytics.weightedOverallScore !== undefined) {
      drawCircularProgress(doc, chartStartX + (chartsDrawn * chartSpacing), yPosition, chartRadius, Math.round(analytics.weightedOverallScore), 100, "Weighted Score");
      chartsDrawn++;
    }
    
    if (analytics.overallScore !== undefined) {
      drawCircularProgress(doc, chartStartX + (chartsDrawn * chartSpacing), yPosition, chartRadius, Math.round(analytics.overallScore), 100, "Overall Score");
      chartsDrawn++;
    }
    
    if (analytics.communication?.score !== undefined) {
      drawCircularProgress(doc, chartStartX + (chartsDrawn * chartSpacing), yPosition, chartRadius, Math.round(analytics.communication.score), 10, "Skills");
      chartsDrawn++;
    }
    
    yPosition += chartRadius * 2 + 18;

    // Overall Feedback
    if (analytics.overallFeedback) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Overall Assessment", margin, yPosition);
      yPosition += 7;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      yPosition = addWrappedText(doc, analytics.overallFeedback, margin, yPosition, contentWidth, 5);
      yPosition += 5;
    }

    // Custom Metrics Section
    if (analytics.customMetrics && analytics.customMetrics.length > 0) {
      yPosition += 5;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Custom Evaluation Metrics", margin, yPosition);
      yPosition += 5;
      
      const metricsTableData = analytics.customMetrics.map((metric: CustomMetricScore) => [
        metric.title,
        `${Math.round(metric.score)}`,
        `${metric.weight}`,
        metric.feedback || "No feedback provided"
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [["Metric", "Score", "Wt.", "Reasoning"]],
        body: metricsTableData,
        theme: "striped",
        headStyles: {
          fillColor: [249, 115, 22], // Orange to match header
          textColor: 255,
          fontSize: 11,
          fontStyle: "bold",
          cellPadding: 3,
          halign: "left",
        },
        bodyStyles: {
          fontSize: 10,
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: "bold" },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 15, halign: "center" },
          3: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.column.index === 1 && data.section === "body") {
            const score = parseInt(data.cell.text[0]);
            if (score >= 7) {
              data.cell.styles.textColor = [34, 197, 94];
            } else if (score >= 4) {
              data.cell.styles.textColor = [234, 179, 8];
            } else {
              data.cell.styles.textColor = [239, 68, 68];
            }
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 12;
          }
        },
        margin: { left: margin, right: margin },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 8;
    }
    
    // Summary Section (CV Analysis or Call Summary)
    if (callData?.call_analysis?.call_summary) {
      yPosition = checkPageBreak(doc, yPosition, 50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(isCVUpload ? "CV Analysis Summary" : "Interview Summary", margin, yPosition);
      yPosition += 7;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      yPosition = addWrappedText(doc, callData.call_analysis.call_summary, margin, yPosition, contentWidth, 5);
      yPosition += 8;
    }

    // Question Summaries (only for interviews)
    if (!isCVUpload && analytics.questionSummaries && analytics.questionSummaries.length > 0) {
      yPosition = checkPageBreak(doc, yPosition, 30);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Question Analysis", margin, yPosition);
      yPosition += 8;

      analytics.questionSummaries.forEach((qs, index) => {
        // Check if we need a new page before each question
        yPosition = checkPageBreak(doc, yPosition, 40);
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const questionText = doc.splitTextToSize(`Q${index + 1}: ${qs.question}`, contentWidth);
        doc.text(questionText, margin, yPosition);
        yPosition += questionText.length * 5;

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(doc, qs.summary, margin, yPosition, contentWidth, 5);
        yPosition += 8;
      });
    }
  }

  // Add footer to all pages
  addFooter(doc);

  // Save the PDF
  doc.save(`${candidateName || "Candidate"}_Report.pdf`);
};

// Generate individual PDFs for all candidates and zip them
export const generateAllCandidatesPDF = async (
  responses: Response[],
  interview: Interview | undefined
) => {
  const zip = new JSZip();
  
  // Generate a separate PDF for each candidate and add to zip
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    
    // Create a new PDF document for this candidate
    const doc = new jsPDF();
    let yPosition = 50;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const candidateName = response.name || "Anonymous";
    const candidateEmail = response.email || "";
    const analytics = response.analytics || null;
    const callData = response.details || null;
    const interviewName = interview?.name || "Interview";
    const recordingUrl = response.details?.recording_url;
    const transcriptUrl = response.details?.public_log_url;
    const isCVUpload = (callData as any)?.source === "cv_upload";

    // Add header with candidate name in title
    addHeader(
      doc, 
      isCVUpload ? "CV Analysis" : "Interview Report", 
      interviewName,
      candidateName
    );

    // Contact info (compact, no name since it's in header)
    yPosition = 55;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    
    let infoLine = candidateEmail || "";
    if (isCVUpload && (callData as any)?.fileName) {
      infoLine += infoLine ? `  •  ${(callData as any).fileName}` : (callData as any).fileName;
    }
    if (infoLine) {
      doc.text(infoLine, margin, yPosition);
      yPosition += 6;
    }
    
    // Recording and Transcript Links (only for interviews) - clean minimal style
    if (!isCVUpload && (recordingUrl || transcriptUrl)) {
      doc.setFontSize(10);
      let linkX = margin;
      
      if (recordingUrl) {
        doc.setTextColor(79, 70, 229);
        doc.textWithLink("[Play Recording]", linkX, yPosition, { url: recordingUrl });
        linkX += doc.getTextWidth("[Play Recording]") + 10;
      }
      
      if (transcriptUrl) {
        doc.setTextColor(34, 150, 80);
        doc.textWithLink("[View Transcript]", linkX, yPosition, { url: transcriptUrl });
      }
      yPosition += 6;
    }
    
    doc.setTextColor(0, 0, 0);
    yPosition += 6;

    // Scores Section
    if (analytics) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Evaluation Scores", margin, yPosition);
      yPosition += 10;

      // Draw circular progress charts
      const chartRadius = 14;
      const chartSpacing = 55;
      const chartStartX = margin + 10;
      let chartsDrawn = 0;
      
      if (analytics.weightedOverallScore !== undefined) {
        drawCircularProgress(doc, chartStartX + (chartsDrawn * chartSpacing), yPosition, chartRadius, Math.round(analytics.weightedOverallScore), 100, "Weighted Score");
        chartsDrawn++;
      }
      
      if (analytics.overallScore !== undefined) {
        drawCircularProgress(doc, chartStartX + (chartsDrawn * chartSpacing), yPosition, chartRadius, Math.round(analytics.overallScore), 100, "Overall Score");
        chartsDrawn++;
      }
      
      if (analytics.communication?.score !== undefined) {
        drawCircularProgress(doc, chartStartX + (chartsDrawn * chartSpacing), yPosition, chartRadius, Math.round(analytics.communication.score), 10, "Skills");
        chartsDrawn++;
      }
      
      yPosition += chartRadius * 2 + 18;

      // Overall Feedback
      if (analytics.overallFeedback) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Overall Assessment", margin, yPosition);
        yPosition += 7;
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(doc, analytics.overallFeedback, margin, yPosition, contentWidth, 5);
        yPosition += 5;
      }

      // Custom Metrics Section
      if (analytics.customMetrics && analytics.customMetrics.length > 0) {
        yPosition += 5;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Custom Evaluation Metrics", margin, yPosition);
        yPosition += 5;
        
        const metricsTableData = analytics.customMetrics.map((metric: CustomMetricScore) => [
          metric.title,
          `${Math.round(metric.score)}`,
          `${metric.weight}`,
          metric.feedback || "No feedback provided"
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [["Metric", "Score", "Wt.", "Reasoning"]],
          body: metricsTableData,
          theme: "striped",
          headStyles: {
            fillColor: [249, 115, 22], // Orange to match header
            textColor: 255,
            fontSize: 11,
            fontStyle: "bold",
            cellPadding: 3,
            halign: "left",
          },
          bodyStyles: {
            fontSize: 10,
            cellPadding: 4,
          },
          columnStyles: {
            0: { cellWidth: 45, fontStyle: "bold" },
            1: { cellWidth: 20, halign: "center" },
            2: { cellWidth: 15, halign: "center" },
            3: { cellWidth: "auto" },
          },
          didParseCell: (data) => {
            if (data.column.index === 1 && data.section === "body") {
              const score = parseInt(data.cell.text[0]);
              if (score >= 7) {
                data.cell.styles.textColor = [34, 197, 94];
              } else if (score >= 4) {
                data.cell.styles.textColor = [234, 179, 8];
              } else {
                data.cell.styles.textColor = [239, 68, 68];
              }
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fontSize = 12;
            }
          },
          margin: { left: margin, right: margin },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }
      
      // Summary Section
      if (callData?.call_analysis?.call_summary) {
        yPosition = checkPageBreak(doc, yPosition, 50);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(isCVUpload ? "CV Analysis Summary" : "Interview Summary", margin, yPosition);
        yPosition += 7;
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        yPosition = addWrappedText(doc, callData.call_analysis.call_summary, margin, yPosition, contentWidth, 5);
        yPosition += 8;
      }

      // Question Summaries (only for interviews)
      if (!isCVUpload && analytics.questionSummaries && analytics.questionSummaries.length > 0) {
        yPosition = checkPageBreak(doc, yPosition, 30);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Question Analysis", margin, yPosition);
        yPosition += 8;

        analytics.questionSummaries.forEach((qs: { question: string; summary: string }, index: number) => {
          // Check if we need a new page before each question
          yPosition = checkPageBreak(doc, yPosition, 40);
          
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          const questionText = doc.splitTextToSize(`Q${index + 1}: ${qs.question}`, contentWidth);
          doc.text(questionText, margin, yPosition);
          yPosition += questionText.length * 5;

          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          yPosition = addWrappedText(doc, qs.summary, margin, yPosition, contentWidth, 5);
          yPosition += 8;
        });
      }
    }

    // Add footer to all pages
    addFooter(doc);

    // Get PDF as blob and add to zip
    const pdfBlob = doc.output("blob");
    const fileName = `${candidateName.replace(/[^a-z0-9]/gi, '_')}_Report.pdf`;
    zip.file(fileName, pdfBlob);
  }
  
  // Generate zip and download
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${interview?.name || "Interview"}_All_Candidates_Reports.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

