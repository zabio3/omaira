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

// ランダムな待機時間（人間っぽく）
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ローマ字ガイドから残りの文字を取得して1文字タイプする
async function typeOneChar(page) {
  try {
    const remaining = await page.$eval('.romaji-remaining', el => el.textContent || '');
    if (!remaining || remaining.length === 0) return null;

    const char = remaining[0];
    await page.keyboard.press(char);
    return char;
  } catch {
    return null;
  }
}

// ミスタイプ
async function typeMistake(page) {
  const wrongKeys = ['x', 'z', 'q', 'v'];
  const key = wrongKeys[Math.floor(Math.random() * wrongKeys.length)];
  await page.keyboard.press(key);
  return key;
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

    // 5秒を選択
    console.log('Selecting 5 seconds...');
    await page.click('button:has-text("5秒")');
    await page.waitForTimeout(500);

    // スタートボタンをクリック
    console.log('Starting game...');
    await page.click('button:has-text("スタート")');
    await page.waitForTimeout(300);

    // 人間っぽく入力し続ける（結果画面が出るまで、最大30秒）
    console.log('Typing like a human...');
    let charCount = 0;
    let wordCount = 0;
    let mistakeCount = 0;
    const startTime = Date.now();
    const maxDuration = 15000; // 15秒

    while (true) {
      // 30秒経過したらEscで終了
      if (Date.now() - startTime > maxDuration) {
        console.log('\n30s timeout - pressing Escape...');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        break;
      }

      // 結果画面が出たら終了
      const isResult = await page.$('.result-screen');
      if (isResult) break;

      // ゲーム画面があるか確認
      const isPlaying = await page.$('.game-screen');
      if (!isPlaying) {
        await page.waitForTimeout(100);
        continue;
      }

      // たまにミスを入れる（15%の確率）
      if (Math.random() < 0.12) {
        const key = await typeMistake(page);
        console.log(`[Miss: ${key}]`);
        mistakeCount++;
        await page.waitForTimeout(randomDelay(150, 300));
        continue;
      }

      // 正しい文字を入力
      const char = await typeOneChar(page);
      if (char) {
        charCount++;
        process.stdout.write(char);

        // 単語が完了したかチェック（remainingが空になったら次の単語）
        try {
          const remaining = await page.$eval('.romaji-remaining', el => el.textContent || '');
          if (remaining.length === 0) {
            wordCount++;
            console.log(` (word ${wordCount} complete)`);
          }
        } catch {}
      }

      // 人間っぽいランダムな間隔（遅め）
      await page.waitForTimeout(randomDelay(150, 350));
    }

    console.log(`\nTyping done: ${charCount} chars, ${wordCount} words, ${mistakeCount} mistakes`);

    // 結果画面を少し表示
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
