import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const docsDir = join(projectRoot, 'docs');
const videoPath = join(docsDir, 'demo.webm');
const gifPath = join(docsDir, 'demo.gif');

// docs ディレクトリを作成
if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

async function recordDemo() {
  console.log('Starting dev server...');

  // dev サーバーを起動
  const devServer = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // サーバーが起動するまで待機
  await new Promise((resolve) => {
    devServer.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      if (output.includes('Local:')) {
        setTimeout(resolve, 1000); // 少し待つ
      }
    });
  });

  console.log('Launching browser...');

  const browser = await chromium.launch({
    headless: false, // 録画のためヘッドレスオフ
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
    await page.goto('http://localhost:5173/wktk/');
    await page.waitForTimeout(1000);

    // 5秒を選択
    console.log('Selecting 5 seconds...');
    await page.click('button:has-text("5秒")');
    await page.waitForTimeout(500);

    // スタートボタンをクリック
    console.log('Starting game...');
    await page.click('button:has-text("スタート")');
    await page.waitForTimeout(500);

    // タイピング（正しい入力とミスを混ぜる）
    console.log('Typing...');
    const keys = ['w', 'k', 't', 'x', 'k']; // wktk + ミス(x)
    for (const key of keys) {
      await page.keyboard.press(key);
      await page.waitForTimeout(200);
    }

    // 結果画面まで待つ
    console.log('Waiting for result...');
    await page.waitForTimeout(6000);

    // 結果画面を少し表示
    await page.waitForTimeout(2000);

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
    // ffmpeg で GIF に変換（最適化済み）
    execSync(
      `ffmpeg -y -i "${webmPath}" -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${gifPath}"`,
      { stdio: 'inherit' }
    );

    // 元の webm ファイルを削除
    unlinkSync(webmPath);

    console.log(`\nGIF created: ${gifPath}`);
  } else {
    console.error('Video file not found!');
  }
}

recordDemo().catch(console.error);
