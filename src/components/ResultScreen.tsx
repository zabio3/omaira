import { useState, useMemo } from 'react';
import { getRank, WordHistory } from '../hooks/useTypingGame';

// アプリのURL（環境に応じて自動設定）
const APP_URL = `${window.location.origin}${import.meta.env.BASE_URL}`;

interface ResultScreenProps {
  score: number;
  typingSpeed: number;
  accuracy: number;
  wordsCompleted: number;
  typingHistory: WordHistory[];
  wasInterrupted: boolean;
  onRetry: () => void;
  onTitle: () => void;
}

// 分析サマリーを計算
function calculateAnalysis(history: WordHistory[] | undefined | null) {
  // 防御的チェック
  if (!history || !Array.isArray(history)) {
    return {
      completedWords: [],
      incompleteWords: [],
      wordsWithErrors: [],
      commonErrors: [],
      totalErrors: 0,
    };
  }

  const completedWords = history.filter(h => h.completed);
  const incompleteWords = history.filter(h => !h.completed);

  // ミスの多い単語を抽出
  const wordsWithErrors = history
    .filter(h => h.errors && h.errors.length > 0)
    .sort((a, b) => b.errors.length - a.errors.length);

  // よくミスするキーを集計
  const errorKeyCount: Record<string, number> = {};
  history.forEach(h => {
    if (h.errors) {
      h.errors.forEach(err => {
        const key = `${err.expected}→${err.actual}`;
        errorKeyCount[key] = (errorKeyCount[key] || 0) + 1;
      });
    }
  });

  const commonErrors = Object.entries(errorKeyCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const totalErrors = history.reduce((sum, h) => sum + (h.errors?.length || 0), 0);

  return {
    completedWords,
    incompleteWords,
    wordsWithErrors,
    commonErrors,
    totalErrors,
  };
}

export function ResultScreen({
  score,
  typingSpeed,
  accuracy,
  wordsCompleted,
  typingHistory,
  wasInterrupted,
  onRetry,
  onTitle,
}: ResultScreenProps) {
  const { rank, description } = getRank(score);
  const [showDetails, setShowDetails] = useState(false);

  const safeTypingHistory = typingHistory || [];
  const analysis = useMemo(() => calculateAnalysis(safeTypingHistory), [safeTypingHistory]);

  // X(Twitter)シェア用URL
  const shareText = `【おまいらタイピング】
スコア: ${score}点
ランク: ${rank}
${wordsCompleted}語クリア / ${typingSpeed.toFixed(1)}打/秒

おまいらもネットスラングでタイピング練習汁！

#おまいらタイピング #タイピング
${APP_URL}`;

  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="result-screen">
      <div className="container">
        <pre className="title-aa" style={{ fontSize: '10px' }}>
{`
　　　　　　　 ＿＿＿
　　　　　　／　　　 ＼
　　　　 ／　⌒　　⌒ ＼
　　　／　 （●） 　（●）＼　　結果発表だお！
　　　|　　　 （__人__）　　 |
　　　＼　　　 \`ー'´　　 ／
`}
        </pre>

        <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>
          ━━━ リザルト ━━━
        </h2>

        {wasInterrupted && (
          <div
            style={{
              background: '#FFF3CD',
              border: '1px solid #FFCC00',
              padding: '10px 20px',
              marginBottom: '20px',
              color: '#856404',
              fontWeight: 'bold',
            }}
          >
            【中断】Escキーで中断しました
          </div>
        )}

        <div className="result-score">
          {score}<span style={{ fontSize: '24px' }}>点</span>
        </div>

        <div className="result-rank">
          ランク: {rank}
        </div>

        <p style={{ color: '#006600', marginTop: '15px', fontStyle: 'italic' }}>
          「{description}」
        </p>

        <hr className="separator" />

        {/* サマリー（常に表示） */}
        <div className="result-stats">
          <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#333' }}>
            【 サマリー 】
          </h3>
          <table
            style={{
              margin: '0 auto',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: '5px 20px', borderBottom: '1px dotted #ccc' }}>
                  クリア単語数
                </td>
                <td style={{ padding: '5px 20px', borderBottom: '1px dotted #ccc', fontWeight: 'bold' }}>
                  {wordsCompleted} 語
                </td>
              </tr>
              <tr>
                <td style={{ padding: '5px 20px', borderBottom: '1px dotted #ccc' }}>
                  タイピング速度
                </td>
                <td style={{ padding: '5px 20px', borderBottom: '1px dotted #ccc', fontWeight: 'bold' }}>
                  {typingSpeed.toFixed(2)} 打/秒
                </td>
              </tr>
              <tr>
                <td style={{ padding: '5px 20px', borderBottom: '1px dotted #ccc' }}>
                  正確率
                </td>
                <td style={{ padding: '5px 20px', borderBottom: '1px dotted #ccc', fontWeight: 'bold' }}>
                  {accuracy.toFixed(1)} %
                </td>
              </tr>
              <tr>
                <td style={{ padding: '5px 20px' }}>
                  総ミス回数
                </td>
                <td style={{ padding: '5px 20px', fontWeight: 'bold', color: analysis.totalErrors > 0 ? '#CC0000' : '#009900' }}>
                  {analysis.totalErrors} 回
                </td>
              </tr>
            </tbody>
          </table>

          {/* よくあるミス（サマリーに表示） */}
          {analysis.commonErrors.length > 0 && (
            <div style={{ marginTop: '20px', padding: '10px', background: '#FFF5F5', border: '1px solid #FFCCCC' }}>
              <p style={{ fontSize: '13px', color: '#CC0000', fontWeight: 'bold', marginBottom: '8px' }}>
                苦手なキー:
              </p>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {analysis.commonErrors.slice(0, 3).map(([pattern, count], i) => (
                  <span key={i} style={{ marginRight: '12px' }}>
                    <code style={{ background: '#FFE0E0', padding: '2px 6px', borderRadius: '3px' }}>
                      {pattern}
                    </code>
                    <span style={{ marginLeft: '4px' }}>×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <hr className="separator" />

        {/* 詳細分析（折りたたみ） */}
        <div style={{ marginTop: '20px' }}>
          <button
            className="retro-button"
            onClick={() => setShowDetails(!showDetails)}
            style={{
              fontSize: '14px',
              padding: '8px 20px',
              background: showDetails ? '#A0C0E0' : '#D4D0C8',
            }}
          >
            {showDetails ? '▼ 詳細を閉じる' : '▶ 詳細分析を見る'}
          </button>

          {showDetails && (
            <div
              style={{
                marginTop: '15px',
                padding: '15px',
                background: '#F8F8F8',
                border: '1px solid #CCC',
                textAlign: 'left',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>
                【 単語ごとの詳細 】
              </h4>

              {safeTypingHistory.length === 0 ? (
                <p style={{ color: '#666', fontSize: '12px' }}>履歴がありません</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#E8E8E8' }}>
                      <th style={{ padding: '8px', borderBottom: '1px solid #CCC', textAlign: 'left' }}>単語</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #CCC', textAlign: 'left' }}>入力対象</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #CCC', textAlign: 'left' }}>実際の入力</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #CCC', textAlign: 'center' }}>状態</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid #CCC', textAlign: 'center' }}>ミス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeTypingHistory.map((item, index) => {
                      if (!item || !item.word) return null;
                      const errors = item.errors || [];
                      return (
                        <tr key={index} style={{ background: index % 2 === 0 ? '#FFF' : '#F5F5F5' }}>
                          <td style={{ padding: '8px', borderBottom: '1px solid #EEE' }}>
                            <strong>{item.word.text || '?'}</strong>
                            <br />
                            <span style={{ fontSize: '10px', color: '#666' }}>({item.word.kana || '?'})</span>
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #EEE', fontFamily: 'monospace' }}>
                            {item.targetInput || '?'}
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #EEE', fontFamily: 'monospace' }}>
                            {renderTypedInput(item)}
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #EEE', textAlign: 'center' }}>
                            {item.completed ? (
                              <span style={{ color: '#009900' }}>✓</span>
                            ) : (
                              <span style={{ color: '#999' }}>途中</span>
                            )}
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #EEE', textAlign: 'center' }}>
                            {errors.length > 0 ? (
                              <span style={{ color: '#CC0000', fontWeight: 'bold' }}>{errors.length}</span>
                            ) : (
                              <span style={{ color: '#009900' }}>0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* ミス詳細 */}
              {analysis.wordsWithErrors && analysis.wordsWithErrors.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#CC0000' }}>
                    【 ミスした箇所 】
                  </h4>
                  {analysis.wordsWithErrors.map((item, index) => {
                    if (!item || !item.word) return null;
                    const errors = item.errors || [];
                    return (
                      <div
                        key={index}
                        style={{
                          marginBottom: '10px',
                          padding: '8px',
                          background: '#FFF5F5',
                          border: '1px solid #FFCCCC',
                          borderRadius: '4px',
                        }}
                      >
                        <strong>{item.word.text || '?'}</strong>
                        <span style={{ marginLeft: '10px', color: '#666', fontSize: '11px' }}>
                          (期待: {item.targetInput || '?'})
                        </span>
                        <div style={{ marginTop: '5px', fontSize: '11px' }}>
                          {errors.map((err, errIndex) => (
                            <span
                              key={errIndex}
                              style={{
                                display: 'inline-block',
                                marginRight: '8px',
                                padding: '2px 6px',
                                background: '#FFE0E0',
                                borderRadius: '3px',
                              }}
                            >
                              位置{(err.position || 0) + 1}: <code>{err.expected || '?'}</code>→<code style={{ color: '#CC0000' }}>{err.actual || '?'}</code>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <hr className="separator" />

        <div style={{ marginTop: '30px' }}>
          <button
            className="retro-button"
            onClick={onRetry}
            style={{
              fontSize: '18px',
              padding: '12px 40px',
              marginRight: '15px',
            }}
          >
            ▶ もう一回
          </button>

          <button
            className="retro-button"
            onClick={onTitle}
            style={{
              fontSize: '18px',
              padding: '12px 40px',
            }}
          >
            🏠 タイトルへ
          </button>
        </div>

        <div style={{ marginTop: '30px' }}>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="retro-button"
            style={{
              display: 'inline-block',
              textDecoration: 'none',
              color: '#000',
              padding: '10px 30px',
            }}
          >
            𝕏 結果をシェアする
          </a>
        </div>

        <div
          style={{
            marginTop: '40px',
            padding: '15px',
            background: '#FFFFCC',
            border: '1px solid #CCCC00',
            fontSize: '12px',
          }}
        >
          {score >= 7000 ? (
            <p>＞＞1 すげぇwwwwwwwwwwマジ神wwwwwwwwww</p>
          ) : score >= 4000 ? (
            <p>＞＞1 なかなかやるじゃねーかwww</p>
          ) : score >= 2000 ? (
            <p>＞＞1 まぁまぁだな。半年ROMれ</p>
          ) : (
            <p>＞＞1 一般人乙wwwwwもっとROMれwwww</p>
          )}
        </div>
      </div>
    </div>
  );
}

// 入力結果をレンダリング（エラー箇所をハイライト）
function renderTypedInput(item: WordHistory) {
  if (!item || !item.actualInput || item.actualInput.length === 0) {
    return <span style={{ color: '#999' }}>（入力なし）</span>;
  }

  const errors = item.errors || [];
  const errorPositions = new Set(errors.map(e => e.position));
  const chars = item.actualInput.split('');

  return (
    <>
      {chars.map((char, index) => (
        <span
          key={index}
          style={{
            color: errorPositions.has(index) ? '#CC0000' : '#333',
            background: errorPositions.has(index) ? '#FFE0E0' : 'transparent',
            fontWeight: errorPositions.has(index) ? 'bold' : 'normal',
          }}
        >
          {char}
        </span>
      ))}
    </>
  );
}
