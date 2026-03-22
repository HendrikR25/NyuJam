const express = require('express')
const cors    = require('cors')
const fs      = require('fs')
const path    = require('path')

const app = express()
app.use(cors())

const MUSIC_DIR = path.join(__dirname, 'music')

// Liste aller Songs
app.get('/api/songs', (req, res) => {
  const files = fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3'))
  const songs = files.map((file, i) => {
    const name = file.replace('.mp3', '')
    const parts = name.split(' - ') // Format: "Artist - Titel.mp3"
    return {
      id:     i + 1,
      artist: parts[0] ?? 'Unbekannt',
      name:   parts[1] ?? name,
      file:   file,
      url:    `http://localhost:3001/music/${encodeURIComponent(file)}`,
    }
  })
  res.json(songs)
})

// Datei streamen
app.get('/music/:filename', (req, res) => {
  const filePath = path.join(MUSIC_DIR, req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found')

  const stat  = fs.statSync(filePath)
  const range = req.headers.range

  if (range) {
    // Unterstützt Seek (vor-/zurückspulen)
    const [start, end] = range.replace('bytes=', '').split('-').map(Number)
    const chunkEnd  = end || Math.min(start + 1_000_000, stat.size - 1)
    res.writeHead(206, {
      'Content-Range':  `bytes ${start}-${chunkEnd}/${stat.size}`,
      'Accept-Ranges':  'bytes',
      'Content-Length': chunkEnd - start + 1,
      'Content-Type':   'audio/mpeg',
    })
    fs.createReadStream(filePath, { start, end: chunkEnd }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type':   'audio/mpeg',
    })
    fs.createReadStream(filePath).pipe(res)
  }
})

app.listen(3001, () => console.log('🎵 Music server running on http://localhost:3001'))