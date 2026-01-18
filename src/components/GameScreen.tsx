import { useEffect, useRef } from 'react';

interface GameScreenProps {
  currentWord: { text: string; kana: string; desc: string } | null;
  romajiDisplay: { typed: string; remaining: string };
  timeRemaining: number;
  score: number;
  wordsCompleted: number;
  lastKeyValid: boolean | null;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function GameScreen({
  currentWord,
  romajiDisplay,
  timeRemaining,
  score,
  wordsCompleted,
  lastKeyValid,
  isMuted,
  onToggleMute,
}: GameScreenProps) {
  const wordDisplayRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // エラー時のシェイクアニメーション
  useEffect(() => {
    if (lastKeyValid === false && wordDisplayRef.current) {
      wordDisplayRef.current.classList.add('error-flash');
      timeoutRef.current = window.setTimeout(() => {
        wordDisplayRef.current?.classList.remove('error-flash');
      }, 100);
    }

    // クリーンアップ
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [lastKeyValid]);

  // 時間に応じた色を計算
  const timeColor = timeRemaining <= 10 ? '#FF0000' : timeRemaining <= 20 ? '#FF6600' : '#000000';

  return (
    <div className="game-screen">
      <div className="container">
        {/* 音量ボタン */}
        <button
          className="volume-toggle"
          onClick={onToggleMute}
          title={isMuted ? 'サウンドON' : 'サウンドOFF'}
        >
          {isMuted ? '♪OFF' : '♪ON'}
        </button>

        {/* 中断ヒント */}
        <div
          style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            fontSize: '12px',
            color: '#999',
            background: 'rgba(255,255,255,0.8)',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          [Esc] 中断
        </div>

        {/* ヘッダー */}
        <div className="game-header">
          <div>
            ⏱ 残り時間:
            <span style={{ color: timeColor, marginLeft: '5px', fontSize: '24px' }}>
              {timeRemaining}
            </span>
            秒
          </div>
          <div>
            スコア:
            <span style={{ marginLeft: '5px', fontSize: '24px' }}>
              {score}
            </span>
          </div>
          <div>
            クリア:
            <span style={{ marginLeft: '5px' }}>
              {wordsCompleted}
            </span>
            語
          </div>
        </div>

        {/* お題表示 */}
        {currentWord && (
          <>
            <div
              ref={wordDisplayRef}
              className="word-display"
              style={{
                borderColor: lastKeyValid === false ? '#FF0000' : '#000000',
              }}
            >
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                {currentWord.text}
              </div>
              <div className="word-kana">
                {currentWord.kana}
              </div>
            </div>

            {/* ローマ字ガイド */}
            <div className="romaji-guide">
              <span className="romaji-typed">{romajiDisplay.typed}</span>
              <span className="romaji-remaining">{romajiDisplay.remaining}</span>
            </div>

            {/* 説明文 */}
            <div className="word-desc">
              💬 {currentWord.desc}
            </div>
          </>
        )}

        {/* 背景装飾 */}
        <div
          style={{
            position: 'fixed',
            bottom: '10px',
            left: '0',
            right: '0',
            overflow: 'hidden',
            opacity: 0.3,
            pointerEvents: 'none',
          }}
        >
          <div className="marquee">
            <span className="marquee-content">
              ぬるぽ→ガッ　wktk　ktkr　orz　(*´∀`*)　＼(^o^)／ｵﾜﾀ
              ぬるぽ→ガッ　wktk　ktkr　orz　(*´∀`*)　＼(^o^)／ｵﾜﾀ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
