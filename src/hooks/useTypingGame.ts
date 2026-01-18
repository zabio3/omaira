import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { RomajiState, initRomajiState, processKeyInput, getRomajiDisplay } from '../utils/romajiValidator';
import wordsData from '../data/words.json';

export interface Word {
  text: string;
  kana: string;
  desc: string;
  romaji?: string; // 直接入力用（ggrks等）
}

export interface GameStats {
  score: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  wordsCompleted: number;
  startTime: number | null;
}

// 単語ごとのタイピング履歴
export interface WordHistory {
  word: Word;
  targetInput: string; // 期待される入力（ローマ字/直接入力）
  actualInput: string; // 実際に入力された文字列
  errors: { position: number; expected: string; actual: string }[]; // エラー箇所
  keystrokes: number;
  correctKeystrokes: number;
  completed: boolean; // クリアしたかどうか
}

export interface TypingGameState {
  currentWord: Word | null;
  romajiState: RomajiState | null;
  timeRemaining: number;
  initialTime: number;
  stats: GameStats;
  isPlaying: boolean;
  lastKeyValid: boolean | null;
  wasInterrupted: boolean; // 中断されたかどうか
  elapsedTime: number | null; // ゲーム終了時の経過時間（ミリ秒）
}

const TIME_BONUS_PER_WORD = 2; // 単語クリアごとに2秒追加

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useTypingGame(initialTime: number = 60) {
  const [state, setState] = useState<TypingGameState>({
    currentWord: null,
    romajiState: null,
    timeRemaining: initialTime,
    initialTime: initialTime,
    stats: {
      score: 0,
      totalKeystrokes: 0,
      correctKeystrokes: 0,
      wordsCompleted: 0,
      startTime: null,
    },
    isPlaying: false,
    lastKeyValid: null,
    wasInterrupted: false,
    elapsedTime: null,
  });

  const wordsQueue = useRef<Word[]>([]);
  const timerRef = useRef<number | null>(null);

  // タイピング履歴
  const [typingHistory, setTypingHistory] = useState<WordHistory[]>([]);
  const currentWordHistory = useRef<{
    word: Word;
    targetInput: string;
    actualInput: string;
    errors: { position: number; expected: string; actual: string }[];
    keystrokes: number;
    correctKeystrokes: number;
  } | null>(null);

  // 次の単語を取得
  const getNextWord = useCallback((): Word => {
    if (wordsQueue.current.length === 0) {
      wordsQueue.current = shuffleArray(wordsData as Word[]);
    }
    return wordsQueue.current.pop()!;
  }, []);

  // ゲーム開始
  const startGame = useCallback((time: number = initialTime) => {
    // 既存のタイマーをクリア
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    wordsQueue.current = shuffleArray(wordsData as Word[]);
    const firstWord = getNextWord();

    // romajiフィールドがあればそれを使用、なければkanaから生成
    const inputTarget = firstWord.romaji || firstWord.kana;

    // 履歴をリセット
    setTypingHistory([]);
    currentWordHistory.current = {
      word: firstWord,
      targetInput: inputTarget,
      actualInput: '',
      errors: [],
      keystrokes: 0,
      correctKeystrokes: 0,
    };

    setState({
      currentWord: firstWord,
      romajiState: initRomajiState(inputTarget),
      timeRemaining: time,
      initialTime: time,
      stats: {
        score: 0,
        totalKeystrokes: 0,
        correctKeystrokes: 0,
        wordsCompleted: 0,
        startTime: Date.now(),
      },
      isPlaying: true,
      lastKeyValid: null,
      wasInterrupted: false,
      elapsedTime: null,
    });
  }, [getNextWord, initialTime]);

  // ゲーム終了（中断）
  const endGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 現在の単語の履歴を保存（未完了として）
    if (currentWordHistory.current) {
      setTypingHistory(prev => [...prev, {
        ...currentWordHistory.current!,
        completed: false,
      }]);
      currentWordHistory.current = null;
    }

    setState(prev => ({
      ...prev,
      isPlaying: false,
      wasInterrupted: true, // 中断フラグを立てる
      elapsedTime: prev.stats.startTime ? Date.now() - prev.stats.startTime : null,
    }));
  }, []);

  // タイマー - isPlayingがtrueの間だけ動作
  useEffect(() => {
    if (state.isPlaying) {
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          if (!prev.isPlaying) {
            return prev;
          }
          if (prev.timeRemaining <= 1) {
            // 時間切れ - 経過時間を記録
            return {
              ...prev,
              timeRemaining: 0,
              isPlaying: false,
              elapsedTime: prev.stats.startTime ? Date.now() - prev.stats.startTime : null,
            };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [state.isPlaying]);

  // ゲーム終了時に履歴を保存（時間切れの場合）
  useEffect(() => {
    if (!state.isPlaying && state.stats.startTime !== null && state.timeRemaining === 0) {
      // 時間切れでゲーム終了 - 現在の単語の履歴を保存
      if (currentWordHistory.current) {
        setTypingHistory(prev => [...prev, {
          ...currentWordHistory.current!,
          completed: false,
        }]);
        currentWordHistory.current = null;
      }
    }
  }, [state.isPlaying, state.stats.startTime, state.timeRemaining]);

  // キー入力処理
  const handleKeyPress = useCallback((key: string) => {
    if (!state.isPlaying || !state.romajiState || !state.currentWord) return;

    // 英字と一部記号を受け付ける
    if (!/^[a-zA-Z0-9\-.]$/.test(key)) return;

    const { newState, valid, completed } = processKeyInput(state.romajiState, key);

    // 履歴に入力を記録
    if (currentWordHistory.current) {
      currentWordHistory.current.actualInput += key;
      currentWordHistory.current.keystrokes += 1;
      if (valid) {
        currentWordHistory.current.correctKeystrokes += 1;
      } else {
        // エラーを記録
        const position = currentWordHistory.current.actualInput.length - 1;
        const expectedChar = currentWordHistory.current.targetInput[position] || '?';
        currentWordHistory.current.errors.push({
          position,
          expected: expectedChar,
          actual: key,
        });
      }
    }

    if (completed) {
      // 単語クリア - 履歴を保存（setStateの外で実行）
      if (currentWordHistory.current) {
        const completedHistory = { ...currentWordHistory.current, completed: true };
        setTypingHistory(prevHistory => [...prevHistory, completedHistory]);
      }

      const nextWord = getNextWord();
      const inputTarget = nextWord.romaji || nextWord.kana;
      const wordScore = inputTarget.length * 100;

      // 次の単語の履歴を初期化
      currentWordHistory.current = {
        word: nextWord,
        targetInput: inputTarget,
        actualInput: '',
        errors: [],
        keystrokes: 0,
        correctKeystrokes: 0,
      };

      setState(prev => {
        const maxTime = prev.initialTime + 30;
        return {
          ...prev,
          currentWord: nextWord,
          romajiState: initRomajiState(inputTarget),
          timeRemaining: Math.min(prev.timeRemaining + TIME_BONUS_PER_WORD, maxTime),
          stats: {
            ...prev.stats,
            totalKeystrokes: prev.stats.totalKeystrokes + 1,
            correctKeystrokes: prev.stats.correctKeystrokes + 1,
            score: prev.stats.score + wordScore,
            wordsCompleted: prev.stats.wordsCompleted + 1,
          },
          lastKeyValid: true,
        };
      });
    } else {
      setState(prev => ({
        ...prev,
        romajiState: newState,
        stats: {
          ...prev.stats,
          totalKeystrokes: prev.stats.totalKeystrokes + 1,
          correctKeystrokes: valid ? prev.stats.correctKeystrokes + 1 : prev.stats.correctKeystrokes,
        },
        lastKeyValid: valid,
      }));
    }
  }, [state.isPlaying, state.romajiState, state.currentWord, getNextWord]);

  // キーボードイベントリスナー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isPlaying) return;

      // Escapeキーで中断
      if (e.key === 'Escape') {
        e.preventDefault();
        endGame();
        return;
      }

      // 通常のキー入力
      if (e.key.length === 1) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isPlaying, handleKeyPress, endGame]);

  // ローマ字表示を取得
  const romajiDisplay = state.romajiState
    ? getRomajiDisplay(state.romajiState)
    : { typed: '', remaining: '' };

  // タイピング速度を計算（キー/秒）
  // ゲーム終了後はelapsedTimeを使用、プレイ中はリアルタイム計算
  const typingSpeed = useMemo(() => {
    if (state.stats.correctKeystrokes === 0) return 0;

    // ゲーム終了後は保存された経過時間を使用
    if (state.elapsedTime !== null) {
      return state.stats.correctKeystrokes / (state.elapsedTime / 1000);
    }

    // プレイ中はリアルタイム計算
    if (state.stats.startTime) {
      return state.stats.correctKeystrokes / ((Date.now() - state.stats.startTime) / 1000);
    }

    return 0;
  }, [state.stats.correctKeystrokes, state.stats.startTime, state.elapsedTime]);

  // 正確率
  const accuracy = useMemo(() => {
    return state.stats.totalKeystrokes > 0
      ? (state.stats.correctKeystrokes / state.stats.totalKeystrokes) * 100
      : 100;
  }, [state.stats.correctKeystrokes, state.stats.totalKeystrokes]);

  return {
    ...state,
    romajiDisplay,
    typingSpeed,
    accuracy,
    typingHistory,
    startGame,
    endGame,
  };
}

// ランク判定
export function getRank(score: number): { rank: string; description: string } {
  if (score >= 10000) {
    return { rank: '神', description: '伝説級の古参。VIPPERの鑑。' };
  } else if (score >= 7000) {
    return { rank: '古参', description: '歴戦のネット戦士。スレ立て余裕。' };
  } else if (score >= 4000) {
    return { rank: 'ねらー', description: '立派なねらー。半年ROMった成果。' };
  } else if (score >= 2000) {
    return { rank: 'ネット民', description: 'そこそこのネット民。もっとROMれ。' };
  } else {
    return { rank: '一般人', description: '一般人乙。半年ROMれ。' };
  }
}
