/**
 * Generate new words using AI (GitHub Models)
 * Uses GPT-4o-mini via GitHub Models API (free: 150 requests/day)
 *
 * Required environment variable:
 * - GITHUB_TOKEN: GitHub token (automatically available in Actions)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions';
const TRENDING_FILE = path.join(__dirname, '../../.context/trending-candidates.json');
const OUTPUT_FILE = path.join(__dirname, '../../.context/generated-words.json');
const WORDS_FILE = path.join(__dirname, '../../src/data/words.json');

async function callGitHubModels(prompt, systemPrompt) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN environment variable is not set');
    return null;
  }

  try {
    const response = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub Models API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content;
  } catch (error) {
    console.error('API call failed:', error.message);
    return null;
  }
}

function getExistingWords() {
  try {
    const content = fs.readFileSync(WORDS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function getTrendingContext() {
  try {
    if (fs.existsSync(TRENDING_FILE)) {
      const content = fs.readFileSync(TRENDING_FILE, 'utf-8');
      const data = JSON.parse(content);
      return data.searches?.map(s => s.content).join('\n\n') || '';
    }
  } catch {
    // Ignore errors
  }
  return '';
}

async function main() {
  console.log('Generating new words using AI...');

  const existingWords = getExistingWords();
  const existingTexts = existingWords.map(w => w.text);
  const trendingContext = getTrendingContext();

  const systemPrompt = `あなたは日本のインターネット文化とスラングの専門家です。
タイピングゲーム用の新しいワードを生成してください。

出力は必ず有効なJSON配列形式で、以下の構造に従ってください:
[
  {
    "text": "表示テキスト（漢字・ひらがな・カタカナ・英字可）",
    "kana": "読み仮名（ひらがなのみ）",
    "desc": "説明（50文字以内）",
    "romaji": "ローマ字入力（英字略語の場合のみ、省略可）"
  }
]

重要なルール:
- 各ワードは実際に使われているスラングや流行語であること
- "kana"フィールドは必ずひらがなのみで記載
- "romaji"は英字略語（例: ggrks, wktk）の場合のみ設定
- "desc"は簡潔に、50文字以内で
- JSON以外のテキストは出力しないでください`;

  const userPrompt = `最新のXやSNSで流行っている日本のインターネットスラング、ミーム、流行語を5つ生成してください。

以下のワードは既に登録済みなので、これらと重複しないものを生成してください:
${existingTexts.slice(0, 100).join('、')}

${trendingContext ? `参考情報（Web検索結果）:\n${trendingContext.slice(0, 2000)}` : ''}

2024年〜2025年に流行したもの、特にZ世代やSNSで使われる新しい表現を優先してください。`;

  const result = await callGitHubModels(userPrompt, systemPrompt);

  if (!result) {
    console.error('Failed to generate words');
    process.exit(1);
  }

  // Parse JSON from response
  let generatedWords;
  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in response');
      console.error('Response:', result);
      process.exit(1);
    }
    generatedWords = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error.message);
    console.error('Response:', result);
    process.exit(1);
  }

  // Validate and filter words
  const validWords = generatedWords.filter(word => {
    if (!word.text || !word.kana || !word.desc) {
      console.warn(`Skipping invalid word: ${JSON.stringify(word)}`);
      return false;
    }
    if (existingTexts.includes(word.text)) {
      console.warn(`Skipping duplicate word: ${word.text}`);
      return false;
    }
    return true;
  });

  console.log(`Generated ${validWords.length} valid words`);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save generated words
  const output = {
    timestamp: new Date().toISOString(),
    words: validWords,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Generated words saved to ${OUTPUT_FILE}`);

  // Output for debugging
  validWords.forEach(w => console.log(`  - ${w.text} (${w.kana}): ${w.desc}`));
}

main().catch(console.error);
