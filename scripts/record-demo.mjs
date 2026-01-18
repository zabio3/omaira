import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const docsDir = join(projectRoot, 'docs');
const gifPath = join(docsDir, 'demo.gif');

// docs ディレクトリを作成
if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

// ローマ字ガイドから残りの文字を取得してタイプする
async function typeWord(page, addError = false) {
  const remaining = await page.$eval('.romaji-remaining', el => el.textContent || '');
  if (!remaining) return false;

  console.log(`  Typing: ${remaining}`);

  for (let i = 0; i < remaining.length; i++) {
    // 途中でミスを入れる
    if (addError && i === 2) {
      await page.keyboard.press('x'); // 間違いキー
      await page.waitForTimeout(150);
    }
    await page.keyboard.press(remaining[i]);
    await page.waitForTimeout(100);
  }
  return true;
}

async function recordDemo() {
  console.log('Starting dev server...');

  // dev サーバーを起動
  const devServer = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverUrl = 'http://localhost:5173/wktk/';

  // サーバーが起動するまで待機
  await new Promise((resolve) => {
    devServer.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      // ポート番号を取得
      const match = output.match(/Local:\s+http:\/\/localhost:(\d+)/);
      if (match) {
        serverUrl = `http://localhost:${match[1]}/wktk/`;
        setTimeout(resolve, 1000);
      }
    });
  });

  console.log(`Using server: ${serverUrl}`);
  console.log('Launching browser...');

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    recordVideo: {
      dir: docsDir,
      size: { width: 800, height: 600 },
    },
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to app...');
    await page.goto(serverUrl);
    await page.waitForTimeout(1500);

    // 10秒を選択
    console.log('Selecting 10 seconds...');
    await page.click('button:has-text("10秒")');
    await page.waitForTimeout(500);

    // スタートボタンをクリック
    console.log('Starting game...');
    await page.click('button:has-text("スタート")');
    await page.waitForTimeout(800);

    // 1語目：正確に入力
    console.log('Word 1 (correct):');
    await typeWord(page, false);
    await page.waitForTimeout(500);

    // 2語目：正確に入力
    console.log('Word 2 (correct):');
    await typeWord(page, false);
    await page.waitForTimeout(500);

    // 3語目：ミスを入れる
    console.log('Word 3 (with error):');
    await typeWord(page, true);
    await page.waitForTimeout(500);

    // 結果画面まで待つ
    console.log('Waiting for result...');
    await page.waitForSelector('.result-screen', { timeout: 15000 });
    await page.waitForTimeout(2500);

    console.log('Recording complete!');
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    devServer.kill();
  }

  // 動画ファイルを探す
  const { readdirSync } = await import('fs');
  const files = readdirSync(docsDir);
  const webmFile = files.find(f => f.endsWith('.webm'));

  if (webmFile) {
    const webmPath = join(docsDir, webmFile);

    console.log('Converting to GIF...');
    execSync(
      `ffmpeg -y -i "${webmPath}" -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${gifPath}"`,
      { stdio: 'inherit' }
    );

    unlinkSync(webmPath);
    console.log(`\nGIF created: ${gifPath}`);
  } else {
    console.error('Video file not found!');
  }
}

recordDemo().catch(console.error);
