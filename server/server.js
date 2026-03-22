const express = require('express')
const cors    = require('cors')
const fs      = require('fs')
const path    = require('path')

const app = express()
app.use(cors())
app.use(express.json())

const MUSIC_DIR      = path.join(__dirname, 'music')
const PLAYLISTS_FILE = path.join(__dirname, 'playlists.json')
const FAVORITES_FILE = path.join(__dirname, 'favorites.json')

// ── Helper: load/save playlists ────────────────────────
function loadPlaylists() {
  if (!fs.existsSync(PLAYLISTS_FILE)) return []
  return JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf-8'))
}
function savePlaylists(data) {
  fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(data, null, 2))
}

// ── Helper: load/save favorites ────────────────────────
function loadFavorites() {
  if (!fs.existsSync(FAVORITES_FILE)) return []
  return JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf-8'))
}
function saveFavorites(data) {
  fs.writeFileSync(FAVORITES_FILE, JSON.stringify(data, null, 2))
}

// ── Songs ──────────────────────────────────────────────
app.get('/api/songs', (req, res) => {
  const files = fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3'))
  const host  = `${req.protocol}://${req.headers.host}`
  const songs = files.map((file, i) => {
    const name  = file.replace('.mp3', '')
    const parts = name.split(' - ')
    return {
      id:     i + 1,
      artist: parts[0]?.trim() ?? 'Unbekannt',
      name:   parts[1]?.trim() ?? name,
      file,
      url: `${host}/music/${encodeURIComponent(file)}`,
    }
  })
  res.json(songs)
})

// Stream audio with seek support
app.get('/music/:filename', (req, res) => {
  const filePath = path.join(MUSIC_DIR, req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found')

  // Explicit CORS for audio streaming
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Range')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')

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

// ── Playlists (per user) ───────────────────────────────

function getUserPlaylists(userId) {
  const all = loadPlaylists()
  return all.filter(p => p.userId === userId)
}

// GET all playlists for current user
app.get('/api/playlists', (req, res) => {
  const user = getUserFromToken(req)
  if (!user) return res.json([])
  res.json(getUserPlaylists(user.id))
})

// GET single playlist
app.get('/api/playlists/:id', (req, res) => {
  const user = getUserFromToken(req)
  const playlists = loadPlaylists()
  const pl = playlists.find(p => p.id === req.params.id && (!p.userId || p.userId === user?.id))
  if (!pl) return res.status(404).json({ error: 'Not found' })
  res.json(pl)
})

// POST create playlist
app.post('/api/playlists', (req, res) => {
  const user = getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { name, icon, color } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })

  const playlists = loadPlaylists()
  const newPl = {
    id:        Date.now().toString(),
    userId:    user.id,
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

// PATCH playlist
app.patch('/api/playlists/:id', (req, res) => {
  const user = getUserFromToken(req)
  const playlists = loadPlaylists()
  const idx = playlists.findIndex(p => p.id === req.params.id && p.userId === user?.id)
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
  const user = getUserFromToken(req)
  const playlists = loadPlaylists()
  const filtered = playlists.filter(p => !(p.id === req.params.id && p.userId === user?.id))
  savePlaylists(filtered)
  res.json({ ok: true })
})

// POST add song to playlist
app.post('/api/playlists/:id/songs', (req, res) => {
  const user = getUserFromToken(req)
  const playlists = loadPlaylists()
  const pl = playlists.find(p => p.id === req.params.id && p.userId === user?.id)
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
  const user = getUserFromToken(req)
  const playlists = loadPlaylists()
  const pl = playlists.find(p => p.id === req.params.id && p.userId === user?.id)
  if (!pl) return res.status(404).json({ error: 'Not found' })

  pl.songs = pl.songs.filter(s => s.id !== req.params.songId)
  savePlaylists(playlists)
  res.json(pl)
})

// ── Favorites (per user) ───────────────────────────────

function getUserFavorites(userId) {
  const all = loadFavorites()
  return all.filter(f => f.userId === userId)
}

app.get('/api/favorites', (req, res) => {
  const user = getUserFromToken(req)
  if (!user) return res.json([])
  res.json(getUserFavorites(user.id))
})

app.post('/api/favorites', (req, res) => {
  const user = getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { id, name, artist } = req.body
  if (!id) return res.status(400).json({ error: 'id required' })
  const favs = loadFavorites()
  if (favs.find(f => String(f.id) === String(id) && f.userId === user.id))
    return res.status(409).json({ error: 'Already in favorites' })
  favs.push({ id: String(id), name, artist, userId: user.id, addedAt: new Date().toISOString() })
  saveFavorites(favs)
  res.status(201).json({ ok: true })
})

app.delete('/api/favorites/:id', (req, res) => {
  const user = getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const favs = loadFavorites().filter(f => !(String(f.id) === String(req.params.id) && f.userId === user.id))
  saveFavorites(favs)
  res.json({ ok: true })
})

// ── Auth ───────────────────────────────────────────────
const USERS_FILE = path.join(__dirname, 'users.json')

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return []
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
}
function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2))
}
function simpleToken(id) {
  return Buffer.from(`${id}:${Date.now()}`).toString('base64')
}
function getUserFromToken(req) {
  const auth = req.headers.authorization ?? ''
  const tok  = auth.replace('Bearer ', '')
  if (!tok) return null
  const users = loadUsers()
  return users.find(u => u.token === tok) ?? null
}

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body
  if (!username?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: 'Alle Felder sind erforderlich.' })

  const users = loadUsers()
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    return res.status(409).json({ error: 'Benutzername bereits vergeben.' })
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ error: 'E-Mail bereits registriert.' })

  const newUser = {
    id:        Date.now().toString(),
    username:  username.trim(),
    email:     email.trim().toLowerCase(),
    password,  // plain text for prototype — use bcrypt in production
    bio:       '',
    isPublic:  true,
    avatar:    null,
    createdAt: new Date().toISOString(),
    token:     '',
  }
  newUser.token = simpleToken(newUser.id)
  users.push(newUser)
  saveUsers(users)

  const { password: _, ...safeUser } = newUser
  res.status(201).json({ user: safeUser, token: newUser.token })
})

// Login
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body
  if (!identifier || !password)
    return res.status(400).json({ error: 'Benutzername/E-Mail und Passwort erforderlich.' })

  const users = loadUsers()
  const user  = users.find(u =>
    (u.username.toLowerCase() === identifier.toLowerCase() ||
     u.email.toLowerCase()    === identifier.toLowerCase()) &&
    u.password === password
  )
  if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten.' })

  user.token = simpleToken(user.id)
  saveUsers(users)

  const { password: _, ...safeUser } = user
  res.json({ user: safeUser, token: user.token })
})

// Update profile
app.patch('/api/auth/profile', (req, res) => {
  const user = getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt.' })

  const users = loadUsers()
  const idx   = users.findIndex(u => u.id === user.id)
  if (idx === -1) return res.status(404).json({ error: 'User nicht gefunden.' })

  const { bio, isPublic, avatar } = req.body
  if (bio      !== undefined) users[idx].bio      = bio
  if (isPublic !== undefined) users[idx].isPublic = isPublic
  if (avatar   !== undefined) users[idx].avatar   = avatar
  saveUsers(users)

  const { password: _, ...safeUser } = users[idx]
  res.json({ user: safeUser })
})

app.listen(3001, '0.0.0.0', () => console.log('🎵 NyuJam server running on http://192.168.178.58:3001'))