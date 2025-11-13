import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

// Vercelではファイルアップロードの設定が必要
export const config = {
  api: {
    bodyParser: false,
  },
}

type ResponseData = {
  frames?: string[]
  feedback?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // フォームデータをパース
    const form = formidable({
      maxFileSize: 500 * 1024 * 1024, // 500MB
    })

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err)
          else resolve([fields, files])
        })
      }
    )

    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video
    
    if (!videoFile) {
      return res.status(400).json({ error: '動画ファイルがありません' })
    }

    // 一時ディレクトリ
    const tmpDir = '/tmp'
    const videoPath = videoFile.filepath
    const outputDir = path.join(tmpDir, `frames-${Date.now()}`)
    
    // 出力ディレクトリ作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // FFmpegでフレーム抽出（4フレーム）
    const timestamps = ['00:00:05', '00:01:00', '00:03:00', '00:06:00']
    const framePromises = timestamps.map(async (timestamp, index) => {
      const outputPath = path.join(outputDir, `frame${index}.jpg`)
      
      try {
        await execPromise(
          `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -vf "scale=800:-1" -q:v 2 "${outputPath}"`
        )
        
        // 画像をBase64に変換
        const imageBuffer = fs.readFileSync(outputPath)
        const base64 = imageBuffer.toString('base64')
        return `data:image/jpeg;base64,${base64}`
      } catch (err) {
        console.error(`Failed to extract frame at ${timestamp}:`, err)
        return null
      }
    })

    const frames = (await Promise.all(framePromises)).filter(f => f !== null) as string[]

    if (frames.length === 0) {
      throw new Error('フレーム抽出に失敗しました')
    }

    // Claude APIを呼び出し
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY が設定されていません')
    }

    const imageContents = frames.map(frame => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: frame.split(',')[1],
      },
    }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `動画投稿者として、以下の動画フレームをチェックしてフィードバックをお願いします。

【チェック項目】
1. **視聴者目線での第一印象**: 興味を引く内容か、テンポは良いか
2. **編集の質**: カット割り、テロップ、エフェクトの適切さ
3. **視覚的な問題**: 画質、明るさ、構図、テキストの読みやすさ
4. **潜在的な問題点**: 不適切な映り込み、プライバシー問題、著作権的に気になる要素
5. **改善提案**: より良くするためのアドバイス

フレームは動画の異なる時点から抽出されています。
各項目について、具体的で建設的なフィードバックをください。`,
              },
              ...imageContents,
            ],
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Claude API呼び出しに失敗しました')
    }

    const feedback = data.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n')

    // クリーンアップ
    fs.rmSync(outputDir, { recursive: true, force: true })

    res.status(200).json({ frames, feedback })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ error: error.message || '処理中にエラーが発生しました' })
  }
}