import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Claim } from '@/types';

/**
 * Generate a filled CMS 1500 PDF from claim data
 */
export async function generateCMS1500PDF(
  claim: Claim,
  claimId: string
): Promise<string> {
  try {
    // Create a new PDF document from scratch
    const pdfDoc = await PDFDocument.create();
    
    // Add a page (standard US Letter size: 8.5" x 11" = 612 x 792 points)
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
    
    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 10;
    
    // Helper to draw text at specific position
    const drawText = (text: string, x: number, y: number, bold = false, size = fontSize) => {
      page.drawText(text, {
        x,
        y: height - y, // PDF coordinates start from bottom
        size,
        font: bold ? fontBold : font,
        color: rgb(0, 0, 0),
      });
    };
    
    // Create a structured layout
    let currentY = 80;
    
    // Section 1: Patient Information
    drawText('PATIENT INFORMATION', 50, currentY, true, 12);
    currentY += 25;
    
    const patientName = `${claim.patient.last_name.toUpperCase()}, ${claim.patient.first_name.toUpperCase()}`;
    drawText(`Patient Name: ${patientName}`, 50, currentY);
    currentY += 20;
    drawText(`Date of Birth: ${claim.patient.date_of_birth}`, 50, currentY);
    drawText(`Gender: ${claim.patient.gender === 'M' ? 'Male' : claim.patient.gender === 'F' ? 'Female' : 'Unknown'}`, 300, currentY);
    currentY += 30;
    
    // Section 2: Provider Information
    drawText('PROVIDER INFORMATION', 50, currentY, true, 12);
    currentY += 25;
    drawText(`Provider: ${claim.provider.name}`, 50, currentY);
    currentY += 20;
    drawText(`NPI: ${claim.provider.npi}`, 50, currentY);
    drawText(`Taxonomy: ${claim.provider.taxonomy}`, 300, currentY);
    currentY += 20;
    drawText(`Address: ${claim.provider.address || ''}`, 50, currentY);
    currentY += 20;
    drawText(`City, State, ZIP: ${claim.provider.city || ''}, ${claim.provider.state || ''} ${claim.provider.zip || ''}`, 50, currentY);
    currentY += 30;
    
    // Section 3: Service Information
    drawText('SERVICE INFORMATION', 50, currentY, true, 12);
    currentY += 25;
    drawText(`Service Date: ${claim.service_date}`, 50, currentY);
    drawText(`Place of Service: ${claim.place_of_service}`, 300, currentY);
    currentY += 30;
    
    // Section 4: Diagnosis Codes
    drawText('DIAGNOSIS CODES (ICD-10)', 50, currentY, true, 12);
    currentY += 25;
    claim.diagnosis_codes.forEach((code, idx) => {
      drawText(`${String.fromCharCode(65 + idx)}. ${code}`, 50 + (idx % 2) * 250, currentY + Math.floor(idx / 2) * 20);
    });
    currentY += Math.ceil(claim.diagnosis_codes.length / 2) * 20 + 20;
    
    // Section 5: Procedure Codes and Charges
    drawText('PROCEDURE CODES (CPT/HCPCS)', 50, currentY, true, 12);
    currentY += 25;
    
    // Table header
    drawText('CPT', 50, currentY, true);
    drawText('Description', 120, currentY, true);
    drawText('Units', 380, currentY, true);
    drawText('Charge', 440, currentY, true);
    currentY += 20;
    
    // Draw a line
    page.drawLine({
      start: { x: 50, y: height - currentY },
      end: { x: width - 50, y: height - currentY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    currentY += 10;
    
    // Procedure lines
    let totalCharge = 0;
    claim.procedures.forEach((procedure) => {
      drawText(procedure.code, 50, currentY, true);
      // Truncate description if too long
      const desc = procedure.description.length > 40 
        ? procedure.description.substring(0, 37) + '...' 
        : procedure.description;
      drawText(desc, 120, currentY);
      drawText(procedure.units.toString(), 380, currentY);
      drawText(`$${procedure.charge.toFixed(2)}`, 440, currentY);
      totalCharge += procedure.charge;
      currentY += 20;
    });
    
    currentY += 10;
    
    // Draw another line
    page.drawLine({
      start: { x: 380, y: height - currentY },
      end: { x: width - 50, y: height - currentY },
      thickness: 2,
      color: rgb(0, 0, 0),
    });
    currentY += 10;
    
    // Total
    drawText('TOTAL CHARGE:', 300, currentY, true);
    drawText(`$${totalCharge.toFixed(2)}`, 440, currentY, true, 12);
    currentY += 40;
    
    // Section 6: Signatures and Certification
    drawText('CERTIFICATION', 50, currentY, true, 12);
    currentY += 25;
    drawText('Provider Signature: SIGNATURE ON FILE', 50, currentY);
    drawText(`Date: ${new Date().toLocaleDateString()}`, 350, currentY);
    currentY += 20;
    drawText('Patient/Authorized Signature: SIGNATURE ON FILE', 50, currentY);
    
    // Footer
    page.drawText('This is a computer-generated claim form for demonstration purposes.', {
      x: 50,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Save the filled PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create output directory if it doesn't exist
    const outputDir = join(process.cwd(), 'public', 'claims');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Save to public folder
    const filename = `${claimId}.pdf`;
    const outputPath = join(outputDir, filename);
    writeFileSync(outputPath, pdfBytes);
    
    // Return the public URL
    return `/claims/${filename}`;
  } catch (error) {
    console.error('Error generating CMS 1500 PDF:', error);
    throw new Error(`Failed to generate PDF: ${error}`);
  }
}

