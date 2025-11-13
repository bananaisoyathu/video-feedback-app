import { useState } from 'react'
import Head from 'next/head'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [frames, setFrames] = useState<string[]>([])
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setFeedback('')
      setError('')
      setFrames([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setProgress('動画をアップロード中...')
    setError('')

    const formData = new FormData()
    formData.append('video', file)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '分析に失敗しました')
      }

      setFrames(data.frames)
      setFeedback(data.feedback)
      setProgress('完了!')
    } catch (err: any) {
      setError(err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setFeedback('')
    setError('')
    setFrames([])
    setProgress('')
  }

  return (
    <>
      <Head>
        <title>動画フィードバックツール</title>
        <meta name="description" content="AIが動画を分析してフィードバックを提供" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.container}>
        <main style={styles.main}>
          <h1 style={styles.title}>🎬 動画フィードバックツール</h1>
          <p style={styles.description}>
            AIが動画を分析して詳細なフィードバックを提供します
          </p>

          {!feedback && (
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.uploadBox}>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  style={styles.fileInput}
                  id="video-upload"
                  disabled={loading}
                />
                <label htmlFor="video-upload" style={styles.fileLabel}>
                  {file ? (
                    <div>
                      <p style={styles.fileName}>✅ {file.name}</p>
                      <p style={styles.fileSize}>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={styles.uploadIcon}>📁</p>
                      <p>動画ファイルを選択</p>
                      <p style={styles.hint}>MP4, MOV, AVI など</p>
                    </div>
                  )}
                </label>
              </div>

              {file && !loading && (
                <button type="submit" style={styles.button}>
                  AIフィードバックを取得
                </button>
              )}

              {loading && (
                <div style={styles.loading}>
                  <div style={styles.spinner}></div>
                  <p>{progress}</p>
                </div>
              )}

              {error && (
                <div style={styles.error}>
                  <p>❌ エラー: {error}</p>
                </div>
              )}
            </form>
          )}

          {feedback && (
            <div style={styles.results}>
              <h2 style={styles.subtitle}>抽出されたフレーム</h2>
              <div style={styles.framesGrid}>
                {frames.map((frame, index) => (
                  <img
                    key={index}
                    src={frame}
                    alt={`Frame ${index + 1}`}
                    style={styles.frameImage}
                  />
                ))}
              </div>

              <h2 style={styles.subtitle}>AIフィードバック</h2>
              <div style={styles.feedback}>
                <pre style={styles.feedbackText}>{feedback}</pre>
              </div>

              <button onClick={reset} style={styles.button}>
                別の動画を分析
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #1e1b4b, #581c87, #1e1b4b)',
    padding: '2rem',
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: '1rem',
  },
  description: {
    fontSize: '1.125rem',
    color: '#c4b5fd',
    textAlign: 'center',
    marginBottom: '3rem',
  },
  form: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '1rem',
    padding: '2rem',
  },
  uploadBox: {
    marginBottom: '1.5rem',
  },
  fileInput: {
    display: 'none',
  },
  fileLabel: {
    display: 'block',
    padding: '3rem',
    border: '2px dashed #a78bfa',
    borderRadius: '0.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    color: 'white',
    transition: 'all 0.3s',
  },
  uploadIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
  },
  fileName: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  fileSize: {
    fontSize: '0.875rem',
    color: '#c4b5fd',
  },
  hint: {
    fontSize: '0.875rem',
    color: '#c4b5fd',
    marginTop: '0.5rem',
  },
  button: {
    width: '100%',
    padding: '1rem',
    background: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s',
  },
  loading: {
    textAlign: 'center',
    color: 'white',
    padding: '2rem',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    margin: '0 auto 1rem',
    animation: 'spin 1s linear infinite',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid #ef4444',
    borderRadius: '0.5rem',
    padding: '1rem',
    color: '#fecaca',
    marginTop: '1rem',
  },
  results: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '1rem',
    padding: '2rem',
  },
  subtitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '1rem',
  },
  framesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  frameImage: {
    width: '100%',
    borderRadius: '0.5rem',
  },
  feedback: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  feedbackText: {
    color: 'white',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    margin: 0,
  },
}