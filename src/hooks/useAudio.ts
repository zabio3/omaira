import { useRef, useCallback, useState, useEffect } from 'react';
import { Howl, Howler } from 'howler';

interface AudioRefs {
  bgm: Howl | null;
}

// ベースパスを取得（Viteの環境変数）
const BASE_URL = import.meta.env.BASE_URL || '/';

export function useAudio() {
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const audioRefs = useRef<AudioRefs>({
    bgm: null,
  });

  // オーディオコンテキストをアンロック
  const unlockAudio = useCallback(() => {
    if (isUnlocked) return;

    // Howlerのオーディオコンテキストを再開
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().then(() => {
        console.log('Audio context resumed');
        setIsUnlocked(true);
      });
    } else {
      setIsUnlocked(true);
    }
  }, [isUnlocked]);

  // BGMファイルを読み込み
  useEffect(() => {
    try {
      const sources = ['bgm.ogg', 'bgm.mp3'];
      const fullSrcs = sources.map(s => `${BASE_URL}sounds/${s}`);
      console.log(`Loading BGM: ${fullSrcs.join(', ')}`);

      audioRefs.current.bgm = new Howl({
        src: fullSrcs,
        preload: true,
        volume: 0.3,
        loop: true,
        html5: false,
        onload: () => {
          console.log('BGM loaded');
        },
        onloaderror: (_id, err) => {
          console.warn('Failed to load BGM:', err);
        },
        onplayerror: (_id, err) => {
          console.warn('Failed to play BGM:', err);
          if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume().then(() => {
              audioRefs.current.bgm?.play();
            });
          }
        },
      });

      setIsLoaded(true);
    } catch (e) {
      console.warn('Failed to create BGM Howl:', e);
    }

    // クリーンアップ時のstale closure問題を回避するため、ref値をキャプチャ
    const bgm = audioRefs.current.bgm;
    return () => {
      bgm?.unload();
    };
  }, []);

  // BGM開始（既に再生中なら何もしない）
  const playBgm = useCallback(() => {
    if (!isMuted && audioRefs.current.bgm) {
      if (audioRefs.current.bgm.playing()) {
        return;
      }
      unlockAudio();
      audioRefs.current.bgm.play();
    }
  }, [isMuted, unlockAudio]);

  // BGM停止
  const stopBgm = useCallback(() => {
    if (audioRefs.current.bgm) {
      audioRefs.current.bgm.stop();
    }
  }, []);

  // ミュート切り替え
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (newMuted) {
        audioRefs.current.bgm?.pause();
      } else {
        unlockAudio();
        // ミュート解除時、BGMを再開
        if (audioRefs.current.bgm && !audioRefs.current.bgm.playing()) {
          audioRefs.current.bgm.play();
        }
      }
      return newMuted;
    });
  }, [unlockAudio]);

  return {
    isMuted,
    isLoaded,
    isUnlocked,
    toggleMute,
    unlockAudio,
    playBgm,
    stopBgm,
  };
}
