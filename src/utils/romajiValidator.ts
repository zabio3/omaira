// ローマ字変換・判定ロジック
// 複数の入力パターンを許容する柔軟な判定システム

// かな→ローマ字のマッピング（複数パターン対応）
const KANA_TO_ROMAJI: Record<string, string[]> = {
  // 基本母音
  'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],

  // か行
  'か': ['ka', 'ca'], 'き': ['ki'], 'く': ['ku', 'cu', 'qu'], 'け': ['ke'], 'こ': ['ko', 'co'],

  // さ行
  'さ': ['sa'], 'し': ['shi', 'si', 'ci'], 'す': ['su'], 'せ': ['se', 'ce'], 'そ': ['so'],

  // た行
  'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],

  // な行
  'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],

  // は行
  'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],

  // ま行
  'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],

  // や行
  'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],

  // ら行
  'ら': ['ra', 'la'], 'り': ['ri', 'li'], 'る': ['ru', 'lu'], 'れ': ['re', 'le'], 'ろ': ['ro', 'lo'],

  // わ行
  'わ': ['wa'], 'を': ['wo'], 'ん': ['nn', 'n'],

  // 濁音
  'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
  'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
  'だ': ['da'], 'ぢ': ['di', 'dzi'], 'づ': ['du', 'dzu'], 'で': ['de'], 'ど': ['do'],
  'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],

  // 半濁音
  'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],

  // 拗音（2文字）
  'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
  'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'],
  'ちゃ': ['cha', 'tya', 'cya'], 'ちゅ': ['chu', 'tyu', 'cyu'], 'ちょ': ['cho', 'tyo', 'cyo'],
  'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
  'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
  'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
  'りゃ': ['rya', 'lya'], 'りゅ': ['ryu', 'lyu'], 'りょ': ['ryo', 'lyo'],
  'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
  'じゃ': ['ja', 'zya', 'jya'], 'じゅ': ['ju', 'zyu', 'jyu'], 'じょ': ['jo', 'zyo', 'jyo'],
  'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
  'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],

  // 小文字
  'ぁ': ['xa', 'la'], 'ぃ': ['xi', 'li'], 'ぅ': ['xu', 'lu'], 'ぇ': ['xe', 'le'], 'ぉ': ['xo', 'lo'],
  'ゃ': ['xya', 'lya'], 'ゅ': ['xyu', 'lyu'], 'ょ': ['xyo', 'lyo'],
  'っ': ['xtu', 'ltu', 'xtsu', 'ltsu'],

  // 特殊
  'ー': ['-'],

  // ファ行など
  'ふぁ': ['fa', 'fua', 'hua'], 'ふぃ': ['fi', 'fui', 'hui'], 'ふぇ': ['fe', 'fue', 'hue'], 'ふぉ': ['fo', 'fuo', 'huo'],
  'てぃ': ['thi', 'texi'], 'でぃ': ['dhi', 'dexi'],
  'うぃ': ['wi', 'ui'], 'うぇ': ['we', 'ue'], 'うぉ': ['who', 'uo'],
};

// 促音（っ）の次に来る文字の先頭子音を重ねるパターン
const CONSONANTS = ['k', 'c', 's', 't', 'n', 'h', 'f', 'm', 'y', 'r', 'l', 'w', 'g', 'z', 'j', 'd', 'b', 'p', 'q'];

export interface RomajiState {
  kana: string;           // 元のかな文字列
  patterns: string[][];   // 各かなに対する有効なローマ字パターン
  currentIndex: number;   // 現在処理中のかなのインデックス
  currentInput: string;   // 現在のかなに対する入力
  confirmedRomaji: string; // 確定済みのローマ字
  displayRomaji: string;  // 表示用のローマ字（デフォルトパターン）
}

// かな文字列をパースして、各文字に対応するローマ字パターンを生成
export function parseKana(kana: string): { chars: string[]; patterns: string[][] } {
  const chars: string[] = [];
  const patterns: string[][] = [];

  let i = 0;
  while (i < kana.length) {
    // 2文字の拗音をチェック
    if (i + 1 < kana.length) {
      const twoChar = kana.slice(i, i + 2);
      if (KANA_TO_ROMAJI[twoChar]) {
        chars.push(twoChar);
        patterns.push(KANA_TO_ROMAJI[twoChar]);
        i += 2;
        continue;
      }
    }

    // 1文字をチェック
    const oneChar = kana[i];
    if (KANA_TO_ROMAJI[oneChar]) {
      chars.push(oneChar);
      patterns.push(KANA_TO_ROMAJI[oneChar]);
    } else {
      // マッピングにない文字はそのまま（アルファベットなど）
      chars.push(oneChar);
      patterns.push([oneChar.toLowerCase()]);
    }
    i++;
  }

  // 促音（っ）の処理: 次の文字の先頭子音を重ねるパターンを追加
  for (let j = 0; j < chars.length; j++) {
    if (chars[j] === 'っ' && j + 1 < chars.length) {
      const nextPatterns = patterns[j + 1];
      const doubledPatterns: string[] = [];

      for (const nextPattern of nextPatterns) {
        if (nextPattern.length > 0 && CONSONANTS.includes(nextPattern[0])) {
          doubledPatterns.push(nextPattern[0]); // 子音を重ねる
        }
      }

      // 既存のパターン（xtu, ltu）に加えて、子音重ねパターンを追加
      if (doubledPatterns.length > 0) {
        patterns[j] = [...new Set([...doubledPatterns, ...patterns[j]])];
      }
    }
  }

  // 「ん」の処理: 次が母音やn以外の子音なら「n」単独でもOK
  for (let j = 0; j < chars.length; j++) {
    if (chars[j] === 'ん') {
      const nextChar = j + 1 < chars.length ? patterns[j + 1][0][0] : null;
      const vowels = ['a', 'i', 'u', 'e', 'o', 'y', 'n'];

      // 次が母音やy,nでなければ「n」単独でOK
      if (!nextChar || !vowels.includes(nextChar)) {
        // 「n」が既にあるなら、それを優先的に使える
        if (!patterns[j].includes('n')) {
          patterns[j] = ['n', ...patterns[j]];
        }
      }
    }
  }

  return { chars, patterns };
}

// 表示用のデフォルトローマ字を生成
export function getDisplayRomaji(patterns: string[][]): string {
  return patterns.map(p => p[0]).join('');
}

// 入力が有効かチェック
export function validateInput(
  input: string,
  patterns: string[][],
  currentIndex: number,
  currentInput: string
): { valid: boolean; completed: boolean; newIndex: number; newInput: string; confirmedChar: string } {
  const fullInput = currentInput + input;
  const currentPatterns = patterns[currentIndex];

  // 現在のパターンに完全一致するものがあるかチェック
  const exactMatch = currentPatterns.find(p => p === fullInput);
  if (exactMatch) {
    return {
      valid: true,
      completed: currentIndex + 1 >= patterns.length,
      newIndex: currentIndex + 1,
      newInput: '',
      confirmedChar: exactMatch,
    };
  }

  // 部分一致するものがあるかチェック
  const partialMatch = currentPatterns.some(p => p.startsWith(fullInput));
  if (partialMatch) {
    return {
      valid: true,
      completed: false,
      newIndex: currentIndex,
      newInput: fullInput,
      confirmedChar: '',
    };
  }

  // 「ん」の特殊処理: 「n」を入力した後、次の文字の先頭を入力した場合
  if (patterns[currentIndex].includes('n') && currentInput === 'n') {
    // 次のパターンがあるかチェック
    if (currentIndex + 1 < patterns.length) {
      const nextPatterns = patterns[currentIndex + 1];
      const nextPartialMatch = nextPatterns.some(p => p.startsWith(input));
      if (nextPartialMatch) {
        // 「ん」を確定して次へ
        return {
          valid: true,
          completed: false,
          newIndex: currentIndex + 1,
          newInput: input,
          confirmedChar: 'n',
        };
      }
      const nextExactMatch = nextPatterns.find(p => p === input);
      if (nextExactMatch) {
        return {
          valid: true,
          completed: currentIndex + 2 >= patterns.length,
          newIndex: currentIndex + 2,
          newInput: '',
          confirmedChar: 'n' + nextExactMatch,
        };
      }
    }
  }

  return {
    valid: false,
    completed: false,
    newIndex: currentIndex,
    newInput: currentInput,
    confirmedChar: '',
  };
}

// ローマ字状態を初期化
export function initRomajiState(kana: string): RomajiState {
  const { patterns } = parseKana(kana);
  return {
    kana,
    patterns,
    currentIndex: 0,
    currentInput: '',
    confirmedRomaji: '',
    displayRomaji: getDisplayRomaji(patterns),
  };
}

// キー入力を処理
export function processKeyInput(
  state: RomajiState,
  key: string
): { newState: RomajiState; valid: boolean; completed: boolean } {
  if (state.currentIndex >= state.patterns.length) {
    return { newState: state, valid: false, completed: true };
  }

  const result = validateInput(
    key.toLowerCase(),
    state.patterns,
    state.currentIndex,
    state.currentInput
  );

  if (result.valid) {
    const newState: RomajiState = {
      ...state,
      currentIndex: result.newIndex,
      currentInput: result.newInput,
      confirmedRomaji: state.confirmedRomaji + result.confirmedChar,
    };
    return {
      newState,
      valid: true,
      completed: result.completed,
    };
  }

  return { newState: state, valid: false, completed: false };
}

// 表示用：入力済み部分と残り部分を取得
export function getRomajiDisplay(state: RomajiState): { typed: string; remaining: string } {
  const typed = state.confirmedRomaji + state.currentInput;

  // 残りの表示を計算
  let remaining = '';

  // 現在のパターンの残り
  if (state.currentIndex < state.patterns.length) {
    const currentPatterns = state.patterns[state.currentIndex];
    // 現在の入力にマッチするパターンを探す
    const matchingPattern = currentPatterns.find(p => p.startsWith(state.currentInput)) || currentPatterns[0];
    remaining = matchingPattern.slice(state.currentInput.length);
  }

  // 残りのパターン
  for (let i = state.currentIndex + 1; i < state.patterns.length; i++) {
    remaining += state.patterns[i][0];
  }

  return { typed, remaining };
}
