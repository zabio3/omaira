/**
 * Fetch trending Japanese slang/memes from web search
 * Uses Brave Search API (free tier: 2000 queries/month)
 *
 * Required environment variable:
 * - BRAVE_API_KEY: Brave Search API key
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
const OUTPUT_FILE = path.join(__dirname, '../../.context/trending-candidates.json');

// Search queries to find trending Japanese internet slang
const SEARCH_QUERIES = [
  '最新 ネットスラング 2024 2025',
  'X Twitter 流行語 最新',
  'Z世代 流行り言葉',
  'インターネット 新語 トレンド',
  'SNS 若者言葉 最新',
];

async function searchBrave(query) {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    console.error('BRAVE_API_KEY environment variable is not set');
    return null;
  }

  const url = new URL(BRAVE_API_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('count', '10');
  url.searchParams.set('search_lang', 'ja');
  url.searchParams.set('country', 'jp');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      console.error(`Brave API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Search failed for query "${query}":`, error.message);
    return null;
  }
}

function extractTextContent(results) {
  const texts = [];

  if (results?.web?.results) {
    for (const result of results.web.results) {
      if (result.title) texts.push(result.title);
      if (result.description) texts.push(result.description);
    }
  }

  return texts.join('\n');
}

async function main() {
  console.log('Fetching trending words from web search...');

  const allContent = [];

  for (const query of SEARCH_QUERIES) {
    console.log(`Searching: ${query}`);
    const results = await searchBrave(query);
    if (results) {
      const content = extractTextContent(results);
      allContent.push({ query, content });
    }
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save search results for AI processing
  const output = {
    timestamp: new Date().toISOString(),
    searches: allContent,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Search results saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
