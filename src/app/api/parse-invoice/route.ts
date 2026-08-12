import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const clientApiKey = formData.get('apiKey') as string | null;

    const apiKey = process.env.GEMINI_API_KEY || clientApiKey;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No invoice file uploaded.' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API Key is not configured.' }, { status: 500 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    let mimeType = file.type || 'image/jpeg';
    if (file.name.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    }

    const promptText = `Analyze this purchase invoice/bill document or image carefully.
Extract all relevant invoice details and output ONLY a valid JSON object strictly following this structure:
{
  "supplierName": "Name of the seller or supplier company/party",
  "supplierGstin": "GSTIN or Tax identification number of the supplier",
  "supplierAddress": "Full address of the supplier",
  "invoiceNo": "Invoice or Bill Number",
  "invoiceDate": "Date of invoice formatted as DD-MMM-YYYY (e.g. 12-Aug-2026)",
  "items": [
    {
      "itemName": "Description or Name of the item/goods",
      "hsnCode": "HSN or SAC Code if available",
      "qty": 1,
      "rate": 100,
      "unit": "Unit of measure like Kg, Pcs, Nos, Box, Mtr",
      "gstRate": 18,
      "amount": 100
    }
  ],
  "cgstAmount": 0,
  "sgstAmount": 0,
  "igstAmount": 0,
  "totalAmount": 100
}
Return ONLY valid JSON. Do not include markdown ticks or additional conversation.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API Error:', errText);
      return NextResponse.json({ success: false, error: `Gemini API Call failed: ${res.statusText}` }, { status: 500 });
    }

    const geminiRes = await res.json();
    const rawContent = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean rawContent in case markdown tags exist
    const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const invoiceData = JSON.parse(cleanJson);

    return NextResponse.json({
      success: true,
      invoiceData
    });

  } catch (err: any) {
    console.error('Error parsing invoice:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to process invoice file.'
    }, { status: 500 });
  }
}
