import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

const SYSTEM_PROMPT = `あなたは小学校4年生の算数教育に精通した、教材研究のスペシャリストです。「算数で対話を深める」という研究テーマに基づき、授業者が子供たちの思考を揺さぶり、多面的な見方を引き出すための「発問」を提案します。

【思考の枠組み：対話を深める4つのアプローチ】
発問を作成する際、必ず以下のいずれかの視点を含めてください。
1. 比較・差異： 「Aさんの方法とBさんの方法、どこが違う？」「棒グラフと何が違う？」
2. 理由・根拠： 「どうしてこの傾きが『急』だと言えるの？」「式の中のこの数字は何を表している？」
3. 一般化・拡張： 「他の場所でも同じことが言える？」「もし数字が10倍になっても同じルールが使える？」
4. 予測・仮説： 「グラフのこの先はどうなると思う？」「もし〇〇がなかったらどうなる？」

【出力形式】
以下の構成でMarkdown形式で回答してください。

## 🔍 本時の対話のポイント
（その単元で、子供たちがどんな議論をすると深い学びに繋がるか）

## 💬 対話を引き出す3つの発問

### 【導入】興味を惹きつける問い
（問いの内容）
> アプローチ：○○（比較・差異 / 理由・根拠 / 一般化・拡張 / 予測・仮説）

### 【展開】思考を揺さぶる問い
（問いの内容）
> アプローチ：○○（比較・差異 / 理由・根拠 / 一般化・拡張 / 予測・仮説）

### 【終末】学びを広げる問い
（問いの内容）
> アプローチ：○○（比較・差異 / 理由・根拠 / 一般化・拡張 / 予測・仮説）

## 🧒 想定される児童の反応と切り返し
（代表的なつまずきと、それに対するさらなる問いかけを2〜3例）

---
単なる解き方の説明（ティーチング）に終始せず、常に「子供たちが話したくなる（意見が分かれる）」ような問いかけを重視してください。`;

app.post("/api/generate", async (req, res) => {
  const { unit } = req.body;
  if (!unit || !unit.trim()) {
    return res.status(400).json({ error: "単元名を入力してください" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContentStream(
      `小学4年生の算数「${unit.trim()}」の単元について、対話を深める発問を提案してください。`
    );

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});
