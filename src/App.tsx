import { useState, useEffect, useCallback } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { GameScreen } from './components/GameScreen';
import { ResultScreen } from './components/ResultScreen';
import { useTypingGame } from './hooks/useTypingGame';
import { useAudio } from './hooks/useAudio';

type GamePhase = 'title' | 'playing' | 'result';

function App() {
  const [phase, setPhase] = useState<GamePhase>('title');
  const game = useTypingGame();
  const audio = useAudio();

  // ゲーム開始
  const handleStart = useCallback((time: number) => {
    // ユーザーインタラクションでオーディオをアンロック
    audio.unlockAudio();
    game.startGame(time);
    audio.playBgm();
    setPhase('playing');
  }, [game, audio]);

  // リトライ
  const handleRetry = useCallback(() => {
    audio.unlockAudio();
    game.startGame(game.initialTime);
    audio.playBgm();
    setPhase('playing');
  }, [game, audio]);

  // タイトルに戻る
  const handleBackToTitle = useCallback(() => {
    audio.stopBgm();
    setPhase('title');
  }, [audio]);

  // ゲーム終了検知
  useEffect(() => {
    if (phase === 'playing' && !game.isPlaying && game.stats.startTime !== null) {
      audio.stopBgm();
      setPhase('result');
    }
  }, [phase, game.isPlaying, game.stats.startTime, audio]);

  return (
    <div style={{ minHeight: '100vh' }}>
      {phase === 'title' && (
        <TitleScreen
          onStart={handleStart}
          isMuted={audio.isMuted}
          onToggleMute={audio.toggleMute}
        />
      )}

      {phase === 'playing' && (
        <GameScreen
          currentWord={game.currentWord}
          romajiDisplay={game.romajiDisplay}
          timeRemaining={game.timeRemaining}
          score={game.stats.score}
          wordsCompleted={game.stats.wordsCompleted}
          lastKeyValid={game.lastKeyValid}
          isMuted={audio.isMuted}
          onToggleMute={audio.toggleMute}
          onAbort={game.endGame}
        />
      )}

      {phase === 'result' && (
        <ResultScreen
          score={game.stats.score}
          typingSpeed={game.typingSpeed}
          accuracy={game.accuracy}
          wordsCompleted={game.stats.wordsCompleted}
          typingHistory={game.typingHistory}
          wasInterrupted={game.wasInterrupted}
          onRetry={handleRetry}
          onTitle={handleBackToTitle}
        />
      )}
    </div>
  );
}

export default App;
