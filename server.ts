/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Shared Gemini SDK client initialization
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      console.warn('GEMINI_API_KEY is not configured or uses placeholder. Continuing with simulated AI fallback answers.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

/**
 * Downloads and extracts the doctors registry from the Mediafire document URL
 */
app.get('/api/import-mediafire-doctors', async (req, res) => {
  try {
    const url = 'https://www.mediafire.com/file/tq8388eshdvvi3r/doctors.json/file';
    console.log('Fetching main mediafire page on server...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Mediafire returned HTTP status ${response.status}`);
    }

    const html = await response.text();
    const buttonMatch = html.match(/id="downloadButton"[^>]*href="([^"]+)"/i) || html.match(/href="([^"]+)"[^>]*id="downloadButton"/i);
    
    if (!buttonMatch) {
      throw new Error('Could not find the direct download link inside Mediafire page HTML');
    }
    
    const downloadUrl = buttonMatch[1];
    console.log('Downloading actual JSON config from:', downloadUrl);
    
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      throw new Error(`Could not download the target JSON file: status ${fileRes.status}`);
    }
    
    const json = await fileRes.json() as any;
    
    // Check if json contains doctors list
    let doctorsArray: any[] = [];
    if (json && json.doctors && Array.isArray(json.doctors)) {
      doctorsArray = json.doctors;
    } else if (Array.isArray(json)) {
      doctorsArray = json;
    } else {
      throw new Error('Successfully completed download but did not find an array of doctors under "doctors" key or root');
    }

    res.json({
      success: true,
      doctors: doctorsArray,
      total: doctorsArray.length
    });
  } catch (error: any) {
    console.error('Error importing Mediafire doctors:', error);
    res.status(500).json({ success: false, error: error.message || 'Error occurred while pulling database records' });
  }
});

/**
 * Downloads and extracts monthly historical visits data from Mediafire
 */
app.get('/api/import-mediafire-month', async (req, res) => {
  const { month } = req.query;
  const urls: Record<string, string> = {
    jan: 'https://www.mediafire.com/file/2dis9oi6rvxmnvj/%25D8%25B3%25D8%25AC%25D9%2584_%25D8%25B2%25D9%258A%25D8%25A7%25D8%25B1%25D8%25A7%25D8%25AA_%25D8%25B4%25D9%2587%25D8%25B1_%25D9%258A%25D9%2586%25D8%25A7%25D9%258A%25D8%25B1.json/file',
    feb: 'https://www.mediafire.com/file/1x3i3jtn0vsib6x/%25D8%25B3%25D8%25AC%25D9%2584_%25D8%25B2%25D9%258A%25D8%25A7%25D8%25B1%25D8%25A7%25D8%25AA_%25D8%25B4%25D9%2587%25D8%25B1_%25D9%2581%25D8%25A8%25D8%25B1%25D8%25A7%25D9%258A%25D8%25B1.json/file',
    mar: 'https://www.mediafire.com/file/1kmqv010bnztsnx/%25D8%25B3%25D8%25AC%25D9%2584_%25D8%25B2%25D9%258A%25D8%25A7%25D8%25B1%25D8%25A7%25D8%25AA_%25D8%25B4%25D9%2587%25D8%25B1_%25D9%2585%25D8%25A7%25D8%25B1%25D8%25B3.json/file',
    apr: 'https://www.mediafire.com/file/2xof4y42nit683e/%25D8%25B3%25D8%25AC%25D9%2584_%25D8%25B2%25D9%258A%25D8%25A7%25D8%25B1%25D8%25A7%25D8%25AA_%25D8%25B4%25D9%2587%25D8%25B1_%25D8%25A7%25D8%25A8%25D8%25B1%25D9%258A%25D9%2584.json/file'
  };

  const url = urls[String(month)];
  if (!url) {
    return res.status(400).json({ success: false, error: 'Invalid or missing month parameter' });
  }

  try {
    console.log(`Fetching main mediafire page on server for month: ${month}...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Mediafire returned HTTP status ${response.status}`);
    }

    const html = await response.text();
    const buttonMatch = html.match(/id="downloadButton"[^>]*href="([^"]+)"/i) || html.match(/href="([^"]+)"[^>]*id="downloadButton"/i);
    
    if (!buttonMatch) {
      throw new Error('Could not find the direct download link inside Mediafire page HTML');
    }
    
    const downloadUrl = buttonMatch[1];
    console.log(`Downloading actual JSON config for ${month} from:`, downloadUrl);
    
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      throw new Error(`Could not download the target JSON file: status ${fileRes.status}`);
    }
    
    const data = await fileRes.json() as any;
    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error(`Error importing Mediafire month ${month}:`, error);
    res.status(500).json({ success: false, error: error.message || 'Error occurred while pulling month data' });
  }
});

/**
 * AI Weekly Plan Generator endpoint
 */
app.post('/api/ai/plan-generator', async (req, res) => {
  const { doctors, workplaces, visits, settings } = req.body;

  try {
    const client = getGeminiClient();
    const isMockMode = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY';

    if (isMockMode) {
      // Simulate highly customized response if no key
      return res.json({
        plan: `### 🗺️ خطة سير ذكية مقترحة (خوارزمية الذكاء الاصطناعي لحساب الجغرافيا)
1. **النوبة الصباحية - مجمع الملك فهد ومستشفى الحبيب (المنطقة الشمالية)**:
   - زيارة **د. أحمد سليمان** (الفئة أ - فحص القلب) لتقليل وقت الترانزيت.
   - زيارة **د. خالد الحربي** (الفئة ب - العظام).
   - *الهدف*: تغطية مستشفيات قريبة جغرافياً لتقليص مسافات الانتقال بنسبة 40%.

2. **النوبة المسائية - مستشفى دلة ومجمع التخصصي (المنطقة الوسطى)**:
   - زيارة **د. سارة مراد** (الفئة أ - جلدية) - *تنبيه إهمال*: لم تُزر منذ 14 يوماً!
   - زيارة **د. ياسر العتيبي** (الفئة ب - أطفال).

3. **ملاحظات توجيهية هامة**:
   - ⚠️ **تنبيه إهمال فئة أ**: الطبيبة ريما القحطاني أهملت زيارتها لأكثر من 15 يوماً، تم التوصية بضمها ليوم الأحد نوبة صباحية كأولوية قصوى.
   - 🚗 عزل المسارات: تم تجميع الأطباء بناءً على نسبة التقارب الجغرافي (Clustering) لخفض التكلفة الزائدة للرحلة وتفادي الاختناقات المروية.`,
        success: true,
        source: 'simulated'
      });
    }

    const payloadPrompt = `
You are an expert sales analyst and SFA planner assisting a Medical Representative with the "Med Rep" offline application.
Analyze the following representative data:
- Doctors: ${JSON.stringify(doctors)}
- Workplaces: ${JSON.stringify(workplaces)}
- Recent Visits: ${JSON.stringify(visits)}

Generate an optimized weekly plan in Arabic (fully RTL-friendly). It must:
1. Cluster doctors by workplace proximity to minimize transit time.
2. Prioritize Class A targets first (especially flagging any Class A who hasn't been visited in 14+ days - "Class A Neglect").
3. Recommend specific days/shifts (Morning or Evening) to target specific neighborhood clusters.
4. Flag deficiencies or gaps.

Output your plan as a clean Markdown string in beautiful Arabic language. Mention visual clusters, transit metrics, and actions clearly.
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: payloadPrompt,
      config: {
        systemInstruction: 'You are an SFA (Sales Force Automation) AI routing master who speaks Arabic fluently. Address the user respectfully.',
      }
    });

    res.json({
      plan: response.text,
      success: true,
      source: 'gemini'
    });

  } catch (error: any) {
    console.error('Gemini API Error in plan-generator:', error);
    res.status(500).json({ error: error.message || 'Error executing AI planner' });
  }
});

/**
 * AI Doctor Visit Frequency Analysis endpoint
 */
app.post('/api/ai/doctor-analysis', async (req, res) => {
  const { doctorName, visitsSorted } = req.body;

  try {
    const client = getGeminiClient();
    const isMockMode = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY';

    if (isMockMode) {
      // Return a simulated, beautifully formatted feedback analysis
      return res.json({
        analysis: `### 📈 تحليل تردد الزيارات للطبيب: ${doctorName}
* **إجمالي الزيارات المسجلة**: ${visitsSorted.length} زيارات.
* **معدل التباعد الزمني**: متوسط 12 يوماً بين كل زيارة، وهو ما يطابق النطاق الآمن لزيارات الفئة (أ).
* **تسلسل توزيع العينات**: تم تفريغ (باندول إكسترا) و(أتور) بنجاح وفق قاعدة FIFO للمخزون الأقدم.

#### 💡 توصيات الذكاء الاصطناعي لرفع الإنتاجية:
1. **ثبات المتابعة**: حافظ على وتيرة الزيارات الحالية لتجنب هبوط الفئة المعيارية.
2. **بروتوكول التفصيل الطبي**: ركز في الزيارة القادمة على شرح دراسات تماثل الإذابة الحيوية لباندول إكسترا لدعم اتخاذ القرار الطبي.
3. **تلافي الخروج الجغرافي**: تم رصد تباعد بسيط بنسبة 20% في إحداثيات الزيارة السابقة، ننصح ببدء نظام التحقق (Check-in) مباشرةً في عيادة الطبيب قبل الدخول لتجنب إنذار الـ Geofencing.`,
        success: true,
        source: 'simulated'
      });
    }

    const payloadPrompt = `
Analyze the visit history of Doctor named "${doctorName}".
Visits Data: ${JSON.stringify(visitsSorted)}

Provide a structured, insightful AI/algorithmic analysis in Arabic. Explain:
1. Average visit frequency (how many days between standard visits).
2. Continuity pattern: Is the scheduling consistent or irregular?
3. Actionable recommendation: How to detail this doctor in the next visit and how to optimize sample distribution to maintain class rating guidelines.

Output in beautiful Arabic formatted in clean Markdown.
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: payloadPrompt,
      config: {
        systemInstruction: 'You are an SFA performance evaluation assistant. Provide objective, precise feedback in Arabic.',
      }
    });

    res.json({
      analysis: response.text,
      success: true,
      source: 'gemini'
    });

  } catch (error: any) {
    console.error('Gemini API Error in doctor-analysis:', error);
    res.status(500).json({ error: error.message || 'Error executing AI analysis' });
  }
});

// Start Express + Vite Dev middleware or serve static dist
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded in DEVELOPMENT mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static build from ./dist');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
