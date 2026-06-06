/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Force Yemen Timezone for server-side timestamps
process.env.TZ = 'Asia/Aden';

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

Generate an optimized weekly plan in Arabic (fully RTL-friendly). You must adhere to the Yemen timezone constraints and apply these medical visit requirements:
- Class A requires 4 visits/month.
- Class B requires 2-3 visits/month.
- Class C requires 1 visit/month.

It must:
1. Cluster doctors by workplace proximity to minimize transit time.
2. Prioritize targets based on the class visit requirements (especially flagging any Class A neglect/under-coverage).
3. Recommend specific days/shifts (Morning or Evening) to target specific neighborhood clusters.
4. Flag deficiencies or gaps and specify if a Doctor is below their monthly frequency.

Output your plan as a clean Markdown string in beautiful Arabic language. Mention visual clusters, transit metrics, and actions clearly.
`;

    const response = await client.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: payloadPrompt,
      config: {
        systemInstruction: 'You are an SFA (Sales Force Automation) AI routing master who speaks Arabic fluently. Address the user respectfully and operate in Yemen Time (UTC+3).',
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

Provide a structured, insightful AI/algorithmic analysis in Arabic. Use Yemen Time (Asia/Aden) for any temporal inferences. Explain:
1. Average visit frequency.
2. Continuity pattern.
3. Compare against strict requirements: Class A requires 4 visits/month, Class B requires 2-3 visits/month, and Class C requires 1 visit/month. Detail how this doctor aligns with these targets.
4. Actionable recommendation to optimize sample distribution and maintain their class rating.

Output in beautiful Arabic formatted in clean Markdown.
`;

    const response = await client.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: payloadPrompt,
      config: {
        systemInstruction: 'You are an SFA performance evaluation assistant operating in Yemen Time (UTC+3). Provide objective, precise feedback in Arabic.',
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
  // sw.js endpoint for offline Service Worker
  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
      self.addEventListener('install', (e) => {
        self.skipWaiting();
      });

      self.addEventListener('activate', (e) => {
        e.waitUntil(
          caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => caches.delete(key)));
          }).then(() => self.clients.claim()).then(() => {
            return self.registration.unregister();
          })
        );
      });

      self.addEventListener('fetch', (e) => {
        // Direct pass-through to bypass any cache
        e.respondWith(fetch(e.request));
      });
    `);
  });

  // manifest.json endpoint for PWA capability
  app.get('/manifest.json', (req, res) => {
    res.json({
      "short_name": "MedRep",
      "name": "Med Rep SFA Pro",
      "icons": [
        {
          "src": "https://ai.google.dev/static/site-assets/images/share-ais-513315318.png",
          "type": "image/png",
          "sizes": "512x512"
        }
      ],
      "start_url": "/",
      "background_color": "#0f172a",
      "theme_color": "#4f46e5",
      "display": "standalone",
      "orientation": "portrait"
    });
  });

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
