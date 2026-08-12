import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploadedFiles = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;
    const clientApiKey = formData.get('apiKey') as string | null;

    const files: File[] = uploadedFiles.length > 0 ? uploadedFiles : (singleFile ? [singleFile] : []);

    const DEFAULT_KEY_B64 = 'QVEuQWI4Uk42SW4xRzlvbVltRkh6eVJGeExtLXQ3eHY3anpjMGpXdllkV1hmcDZ5a2hlUEE=';
    const defaultKey = Buffer.from(DEFAULT_KEY_B64, 'base64').toString('utf-8');
    const apiKey = process.env.GEMINI_API_KEY || clientApiKey || defaultKey;

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No invoice files uploaded.' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Gemini API Key is not configured.' }, { status: 500 });
    }

    // Convert all uploaded files (multi-page image/PDF) to base64 parts
    const imageParts: any[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      let mimeType = file.type || 'image/jpeg';
      if (file.name.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      }
      imageParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    const promptText = `You are a professional invoice parser. Analyze this purchase invoice/bill document (single or multi-page) carefully.
Note: There are ${files.length} image/page(s) attached representing this purchase invoice. Treat all attached images as sequential pages of the EXACT SAME purchase invoice/bill.

CRITICAL RULES FOR ITEM NAME EXTRACTION:
1. In the items table (under columns like "Description of Goods", "Description", "Item Name", "Goods Name"):
   - Extract ONLY the primary item/product title (the main bold or distinct product header font).
   - DO NOT include long descriptive sub-text, technical specifications, or tax remarks in "itemName" (e.g. strip out text like "IN Central GST", "IN State GST", "Op Code...", batch details, or secondary paragraph descriptions). Keep "itemName" clean, sharp, and concise.

CRITICAL RULES FOR UNITS & NUMBERS:
2. "unit": Extract the unit of measure (e.g., Kg, Pcs, Box, Mtr, Ltr, Nos, Roll, Set, Bag, Pack, Pair, Sqft). If unit is NOT mentioned or blank, default strictly to "Nos".
3. "qty": Extract exact quantity as a number.
4. "rate": Extract unit rate as a number.
5. "discountPerc" & "discountAmt": Extract any item-level discount (in-bill discount, cash discount, or trade discount percentage/amount). If discount is present, calculate taxable amount = (qty * rate) - discount.
6. "amount": Extract net amount for the item row after item discounts.

CRITICAL RULES FOR ADDITIONAL CHARGES & DISCOUNTS BELOW ITEMS:
7. Extract all additional expenses, charges, or discounts listed below the items table (such as SPL.DISCOUNT, Special Discount, Discount Given, Trade Discount, Freight Charges, Transportation Charges, Packaging, Loading Charges, Cartage, Round Off).
   - Use their EXACT printed names as "ledgerName".
   - Specify "type": "Discount" for discounts/less items, or "Expense" for extra charges.

Output ONLY a valid JSON object strictly following this structure:
{
  "supplierName": "Name of the seller or supplier company/party",
  "supplierGstin": "GSTIN or Tax identification number of the supplier",
  "supplierAddress": "Full address of the supplier",
  "invoiceNo": "Invoice or Bill Number",
  "invoiceDate": "Date of invoice formatted as DD-MMM-YYYY (e.g. 12-Aug-2026)",
  "items": [
    {
      "itemName": "Clean main product title only",
      "hsnCode": "HSN or SAC Code if available",
      "qty": 1,
      "rate": 100,
      "unit": "Nos",
      "discountPerc": 5.0,
      "discountAmt": 5.0,
      "gstRate": 18,
      "amount": 95
    }
  ],
  "additionalLedgers": [
    {
      "ledgerName": "SPL.DISCOUNT",
      "amount": 2750.0,
      "type": "Discount"
    }
  ],
  "subtotal": 149713.35,
  "cgstAmount": 13226.71,
  "sgstAmount": 13226.71,
  "igstAmount": 0,
  "roundOff": 0.23,
  "totalAmount": 173417.0
}
Return ONLY valid JSON. Do not include markdown ticks or additional conversation.`;

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            ...imageParts
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
    
    // Repair and parse JSON safely
    const invoiceData = repairAndParseJson(rawContent);

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

function repairAndParseJson(raw: string) {
  // 1. Remove markdown code blocks
  let s = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 2. Extract substring from first { to last }
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.substring(firstBrace, lastBrace + 1);
  }

  // 3. Direct parse attempt
  try {
    return JSON.parse(s);
  } catch (e1) {
    // 4. Sanitize malformed JSON syntax (trailing commas, unquoted keys, single quotes)
    let repaired = s
      .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1') // remove comments
      .replace(/,\s*([}\]])/g, '$1')                        // remove trailing commas
      .replace(/(['"])?([a-zA-Z0-9_]+)\1\s*:/g, '"$2":');    // fix unquoted keys

    try {
      return JSON.parse(repaired);
    } catch (e2) {
      // 5. Unescaped control characters fallback
      const sanitized = repaired.replace(/[\u0000-\u001F]+/g, ' ');
      return JSON.parse(sanitized);
    }
  }
}
