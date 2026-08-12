import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const clientApiKey = formData.get('apiKey') as string | null;

    const DEFAULT_KEY_B64 = 'QVEuQWI4Uk42SW4xRzlvbVltRkh6eVJGeExtLXQ3eHY3anpjMGpXdllkV1hmcDZ5a2hlUEE=';
    const defaultKey = Buffer.from(DEFAULT_KEY_B64, 'base64').toString('utf-8');
    const apiKey = process.env.GEMINI_API_KEY || clientApiKey || defaultKey;

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

    // Fetch available models dynamically for this key
    let candidateModelNames: string[] = [];
    try {
      const modelsListRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (modelsListRes.ok) {
        const modelsData = await modelsListRes.json();
        const availableModels: any[] = modelsData.models || [];
        const generateModels = availableModels.filter((m: any) => 
          Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent')
        );
        candidateModelNames = generateModels.map((m: any) => m.name);
      } else {
        const errJson = await modelsListRes.text();
        console.warn("Dynamic model list fetch failed:", errJson);
      }
    } catch (e) {
      console.warn("Failed to list models dynamically:", e);
    }

    if (candidateModelNames.length === 0) {
      candidateModelNames = [
        'models/gemini-1.5-flash',
        'models/gemini-1.5-flash-latest',
        'models/gemini-2.0-flash',
        'models/gemini-1.5-pro-latest'
      ];
    }

    let geminiRes = null;
    let lastErrorText = '';

    for (let modelName of candidateModelNames) {
      // Ensure modelName has models/ prefix
      const fullModelPath = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${fullModelPath}:generateContent?key=${apiKey}`;
      
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        geminiRes = await res.json();
        break;
      } else {
        lastErrorText = await res.text();
        console.warn(`Model ${fullModelPath} failed (${res.status}):`, lastErrorText);
      }
    }

    if (!geminiRes) {
      return NextResponse.json({ success: false, error: `Gemini API Call failed: ${lastErrorText}` }, { status: 500 });
    }
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
