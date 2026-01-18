/**
 * Merge generated words into words.json
 * Handles deduplication and validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GENERATED_FILE = path.join(__dirname, '../../.context/generated-words.json');
const WORDS_FILE = path.join(__dirname, '../../src/data/words.json');

function loadJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function validateWord(word) {
  // Required fields
  if (!word.text || typeof word.text !== 'string') return false;
  if (!word.kana || typeof word.kana !== 'string') return false;
  if (!word.desc || typeof word.desc !== 'string') return false;

  // Kana should only contain hiragana
  if (!/^[\u3040-\u309F\u30FC]+$/.test(word.kana)) {
    console.warn(`Invalid kana for "${word.text}": ${word.kana}`);
    // Try to continue anyway
  }

  return true;
}

function main() {
  console.log('Merging generated words into words.json...');

  // Load existing words
  const existingWords = loadJSON(WORDS_FILE);
  if (!existingWords || !Array.isArray(existingWords)) {
    console.error('Failed to load existing words.json');
    process.exit(1);
  }

  console.log(`Existing words: ${existingWords.length}`);

  // Load generated words
  const generated = loadJSON(GENERATED_FILE);
  if (!generated || !generated.words || !Array.isArray(generated.words)) {
    console.log('No generated words to merge');
    return;
  }

  console.log(`Generated words to merge: ${generated.words.length}`);

  // Create a set of existing texts for deduplication
  const existingTexts = new Set(existingWords.map(w => w.text));

  // Filter and validate new words
  const newWords = generated.words.filter(word => {
    if (!validateWord(word)) {
      console.warn(`Skipping invalid word: ${JSON.stringify(word)}`);
      return false;
    }
    if (existingTexts.has(word.text)) {
      console.warn(`Skipping duplicate: ${word.text}`);
      return false;
    }
    return true;
  });

  if (newWords.length === 0) {
    console.log('No new words to add');
    return;
  }

  // Clean up words (remove undefined romaji)
  const cleanedWords = newWords.map(word => {
    const cleaned = {
      text: word.text,
      kana: word.kana,
      desc: word.desc,
    };
    if (word.romaji) {
      cleaned.romaji = word.romaji;
    }
    return cleaned;
  });

  // Merge
  const mergedWords = [...existingWords, ...cleanedWords];

  // Save
  fs.writeFileSync(WORDS_FILE, JSON.stringify(mergedWords, null, 2));

  console.log(`Added ${cleanedWords.length} new words`);
  console.log(`Total words: ${mergedWords.length}`);

  // Log added words
  cleanedWords.forEach(w => console.log(`  + ${w.text}`));

  // Clean up generated file
  try {
    fs.unlinkSync(GENERATED_FILE);
  } catch {
    // Ignore
  }
}

main();
