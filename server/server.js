const express = require('express')
const cors    = require('cors')
const fs      = require('fs')
const path    = require('path')

const app = express()
app.use(cors())
app.use(express.json())

const MUSIC_DIR     = path.join(__dirname, 'music')
const PLAYLISTS_FILE = path.join(__dirname, 'playlists.json')

// ── Helper: load/save playlists ────────────────────────
function loadPlaylists() {
  if (!fs.existsSync(PLAYLISTS_FILE)) return []
  return JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf-8'))
}
function savePlaylists(data) {
  fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(data, null, 2))
}

// ── Songs ──────────────────────────────────────────────
app.get('/api/songs', (req, res) => {
  const files = fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3'))
  const songs = files.map((file, i) => {
    const name  = file.replace('.mp3', '')
    const parts = name.split(' - ')
    return {
      id:     i + 1,
      artist: parts[0]?.trim() ?? 'Unbekannt',
      name:   parts[1]?.trim() ?? name,
      file,
      url: `http://localhost:3001/music/${encodeURIComponent(file)}`,
    }
  })
  res.json(songs)
})

// Stream audio with seek support
app.get('/music/:filename', (req, res) => {
  const filePath = path.join(MUSIC_DIR, req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found')

  const stat  = fs.statSync(filePath)
  const range = req.headers.range

  if (range) {
    const [start, end] = range.replace('bytes=', '').split('-').map(Number)
    const chunkEnd = end || Math.min(start + 1_000_000, stat.size - 1)
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

// ── Playlists ──────────────────────────────────────────

// GET all playlists
app.get('/api/playlists', (req, res) => {
  res.json(loadPlaylists())
})

// GET single playlist
app.get('/api/playlists/:id', (req, res) => {
  const playlists = loadPlaylists()
  const pl = playlists.find(p => p.id === req.params.id)
  if (!pl) return res.status(404).json({ error: 'Not found' })
  res.json(pl)
})

// POST create playlist
app.post('/api/playlists', (req, res) => {
  const { name, icon, color } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })

  const playlists = loadPlaylists()
  const newPl = {
    id:        Date.now().toString(),
    name:      name.trim(),
    icon:      icon  || '▤',
    color:     color || '#5b6aff',
    songs:     [],
    createdAt: new Date().toISOString(),
  }
  playlists.push(newPl)
  savePlaylists(playlists)
  res.status(201).json(newPl)
})

// PATCH rename playlist
app.patch('/api/playlists/:id', (req, res) => {
  const playlists = loadPlaylists()
  const idx = playlists.findIndex(p => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })

  const { name, icon, color } = req.body
  if (name)  playlists[idx].name  = name.trim()
  if (icon)  playlists[idx].icon  = icon
  if (color) playlists[idx].color = color
  savePlaylists(playlists)
  res.json(playlists[idx])
})

// DELETE playlist
app.delete('/api/playlists/:id', (req, res) => {
  const playlists = loadPlaylists()
  const filtered  = playlists.filter(p => p.id !== req.params.id)
  if (filtered.length === playlists.length) return res.status(404).json({ error: 'Not found' })
  savePlaylists(filtered)
  res.json({ ok: true })
})

// POST add song to playlist
app.post('/api/playlists/:id/songs', (req, res) => {
  const playlists = loadPlaylists()
  const pl = playlists.find(p => p.id === req.params.id)
  if (!pl) return res.status(404).json({ error: 'Not found' })

  const { songId, name, artist } = req.body
  if (pl.songs.find(s => s.id === songId))
    return res.status(409).json({ error: 'Song already in playlist' })

  pl.songs.push({ id: songId, name, artist, addedAt: new Date().toISOString() })
  savePlaylists(playlists)
  res.json(pl)
})

// DELETE song from playlist
app.delete('/api/playlists/:id/songs/:songId', (req, res) => {
  const playlists = loadPlaylists()
  const pl = playlists.find(p => p.id === req.params.id)
  if (!pl) return res.status(404).json({ error: 'Not found' })

  pl.songs = pl.songs.filter(s => s.id !== req.params.songId)
  savePlaylists(playlists)
  res.json(pl)
})

app.listen(3001, () => console.log('🎵 NyuJam server running on http://localhost:3001'))