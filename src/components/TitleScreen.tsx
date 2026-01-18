import { useState } from 'react';

interface TitleScreenProps {
  onStart: (time: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const TIME_OPTIONS = [
  { value: 5, label: '5秒' },
  { value: 10, label: '10秒' },
  { value: 30, label: '30秒' },
  { value: 60, label: '60秒' },
  { value: 120, label: '120秒' },
  { value: 180, label: '180秒' },
];

export function TitleScreen({ onStart, isMuted, onToggleMute }: TitleScreenProps) {
  const [selectedTime, setSelectedTime] = useState(60);

  return (
    <div className="title-screen">
      <div className="container">
        {/* AA風ロゴ */}
        <pre className="title-aa">
{`
　　　　 ＿＿＿＿＿
　　　／　　　　　 ＼
　　/　 ─　　 ─　　＼
　/　　（●） 　（●）　　＼
　|　 　 　（__人__）　 　 　|
　＼　 　 　 \`ー'´　　　 ／
　／　 　　　 　　　　 　 ＼

　━━━━━━━━━━━━━━━━━
　  おまいらタイピング
　━━━━━━━━━━━━━━━━━
`}
        </pre>

        <div style={{ marginTop: '30px' }}>
          <p style={{ color: '#006600', marginBottom: '20px' }}>
            ＞＞1　タイピング練習するスレ
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>
            制限時間内にタイプしてスコアを稼げ。<br />
            <span style={{ color: '#006600', fontWeight: 'bold' }}>単語をクリアすると+2秒延長！</span>
          </p>
        </div>

        {/* 時間選択 */}
        <div style={{ marginBottom: '25px' }}>
          <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>
            【制限時間を選択】
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            {TIME_OPTIONS.map(option => (
              <button
                key={option.value}
                className="retro-button"
                onClick={() => setSelectedTime(option.value)}
                style={{
                  padding: '8px 20px',
                  background: selectedTime === option.value ? '#A0C0E0' : '#D4D0C8',
                  fontWeight: selectedTime === option.value ? 'bold' : 'normal',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="retro-button"
          onClick={() => onStart(selectedTime)}
          style={{
            fontSize: '20px',
            padding: '15px 60px',
            marginBottom: '20px',
          }}
        >
          ▶ スタート
        </button>

        <div style={{ marginTop: '20px' }}>
          <button
            className="retro-button"
            onClick={onToggleMute}
            style={{ fontSize: '14px' }}
          >
            ♪ サウンド: {isMuted ? 'OFF' : 'ON'}
          </button>
        </div>

        <hr className="separator" />

        <div style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
          <p>【操作方法】</p>
          <p>キーボードでローマ字を入力してください</p>
          <p>「し」→ shi / si どちらでもOK</p>
        </div>

        <div
          style={{
            marginTop: '30px',
            padding: '10px',
            background: '#FFFFCC',
            border: '1px solid #CCCC00',
            fontSize: '12px',
          }}
        >
          <span className="blink" style={{ color: '#FF0000' }}>★NEW★</span>
          　半年ROMって懐かしのネットスラングを思い出せ！
        </div>
      </div>
    </div>
  );
}
