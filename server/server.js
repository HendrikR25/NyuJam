require('dotenv').config()
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

// ── Social helpers ─────────────────────────────────────
const SOCIAL_FILE = path.join(__dirname, 'social.json')

function loadSocial() {
  if (!fs.existsSync(SOCIAL_FILE)) return { friendships: [], groups: [], messages: [] }
  return JSON.parse(fs.readFileSync(SOCIAL_FILE, 'utf-8'))
}
function saveSocial(data) {
  fs.writeFileSync(SOCIAL_FILE, JSON.stringify(data, null, 2))
}
function safeU(u) {
  if (!u) return null
  const { password, token, ...rest } = u
  return rest
}

// ── Friends ────────────────────────────────────────────
app.get('/api/friends', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { friendships } = loadSocial()
  const users = loadUsers()
  const friends = [], pending = []
  friendships.forEach(f => {
    const isA = f.userA === me.id, isB = f.userB === me.id
    if (!isA && !isB) return
    const otherId = isA ? f.userB : f.userA
    const other = safeU(users.find(u => u.id === otherId))
    if (!other) return
    if (f.status === 'accepted') friends.push(other)
    else if (f.status === 'pending' && f.userB === me.id) pending.push({ ...other, friendshipId: f.id })
  })
  res.json({ friends, pending })
})

app.post('/api/friends/request', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { username } = req.body
  const users = loadUsers()
  const target = users.find(u => u.username.toLowerCase() === username?.toLowerCase())
  if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden.' })
  if (target.id === me.id) return res.status(400).json({ error: 'Kannst du dir selbst nicht schicken.' })
  const social = loadSocial()
  const exists = social.friendships.find(f => (f.userA === me.id && f.userB === target.id) || (f.userA === target.id && f.userB === me.id))
  if (exists) return res.status(409).json({ error: 'Anfrage bereits gesendet oder bereits Freunde.' })
  social.friendships.push({ id: Date.now().toString(), userA: me.id, userB: target.id, status: 'pending', createdAt: new Date().toISOString() })
  saveSocial(social)
  res.json({ ok: true })
})

app.post('/api/friends/:friendshipId/respond', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { action } = req.body
  const social = loadSocial()
  const idx = social.friendships.findIndex(f => f.id === req.params.friendshipId && f.userB === me.id)
  if (idx === -1) return res.status(404).json({ error: 'Nicht gefunden' })
  if (action === 'accept') social.friendships[idx].status = 'accepted'
  else social.friendships.splice(idx, 1)
  saveSocial(social)
  res.json({ ok: true })
})

app.delete('/api/friends/:userId', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const social = loadSocial()
  social.friendships = social.friendships.filter(f => !((f.userA === me.id && f.userB === req.params.userId) || (f.userA === req.params.userId && f.userB === me.id)))
  saveSocial(social)
  res.json({ ok: true })
})

// ── Groups ─────────────────────────────────────────────
app.get('/api/groups', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { groups } = loadSocial()
  res.json(groups.filter(g => g.members.includes(me.id)))
})

app.post('/api/groups', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { name, icon, color } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name erforderlich' })
  const social = loadSocial()
  const group = { id: Date.now().toString(), name: name.trim(), icon: icon || '⬡', color: color || '#32c8a0', hostId: me.id, members: [me.id], createdAt: new Date().toISOString() }
  social.groups.push(group)
  saveSocial(social)
  res.status(201).json(group)
})

app.post('/api/groups/join', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { name } = req.body
  const social = loadSocial()
  const group = social.groups.find(g => g.name.toLowerCase() === name?.toLowerCase())
  if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden.' })
  if (group.members.includes(me.id)) return res.status(409).json({ error: 'Bereits Mitglied.' })
  group.members.push(me.id)
  saveSocial(social)
  res.json(group)
})

app.delete('/api/groups/:id/leave', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const social = loadSocial()
  const group = social.groups.find(g => g.id === req.params.id)
  if (!group) return res.status(404).json({ error: 'Nicht gefunden' })
  group.members = group.members.filter(id => id !== me.id)
  if (group.members.length === 0) social.groups = social.groups.filter(g => g.id !== req.params.id)
  saveSocial(social)
  res.json({ ok: true })
})

// ── Messages ───────────────────────────────────────────
app.get('/api/messages/:targetId', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { messages } = loadSocial()
  const { targetId } = req.params
  const conv = messages.filter(m =>
    m.groupId === targetId ||
    (m.toId === targetId && m.fromId === me.id) ||
    (m.toId === me.id && m.fromId === targetId)
  ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  res.json(conv)
})

app.post('/api/messages', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { toId, groupId, text, songId, songName, songArtist } = req.body
  if (!text && !songId) return res.status(400).json({ error: 'Text oder Song erforderlich' })
  const social = loadSocial()
  const msg = { id: Date.now().toString(), fromId: me.id, fromName: me.username, fromAvatar: me.avatar || null, toId: toId || null, groupId: groupId || null, text: text || null, songId: songId || null, songName: songName || null, songArtist: songArtist || null, createdAt: new Date().toISOString() }
  social.messages.push(msg)
  saveSocial(social)
  res.status(201).json(msg)
})

app.get('/api/conversations', (req, res) => {
  const me = getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { friendships, groups, messages } = loadSocial()
  const users = loadUsers()
  const myFriendIds = friendships
    .filter(f => f.status === 'accepted' && (f.userA === me.id || f.userB === me.id))
    .map(f => f.userA === me.id ? f.userB : f.userA)
  const dms = myFriendIds.map(fId => {
    const friend = safeU(users.find(u => u.id === fId))
    if (!friend) return null
    const msgs = messages.filter(m => (m.fromId === me.id && m.toId === fId) || (m.fromId === fId && m.toId === me.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const last = msgs[0] || null
    return { type: 'dm', id: fId, name: friend.username, avatar: friend.avatar, lastMessage: last, unread: msgs.filter(m => m.toId === me.id && !m.read).length }
  }).filter(Boolean)
  const myGroups = groups.filter(g => g.members.includes(me.id)).map(g => {
    const msgs = messages.filter(m => m.groupId === g.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return { type: 'group', id: g.id, name: g.name, icon: g.icon, color: g.color, members: g.members.length, lastMessage: msgs[0] || null, unread: 0 }
  })
  res.json({ dms, groups: myGroups })
})

// ── Cloudflare R2 Upload ───────────────────────────────
const multer = require('multer')
const crypto = require('crypto')

// ── R2 Configuration ───────────────────────────────────
const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID    || 'YOUR_ACCOUNT_ID'
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'YOUR_ACCESS_KEY_ID'
const R2_SECRET_KEY    = process.env.R2_SECRET_KEY    || 'YOUR_SECRET_KEY'
const R2_BUCKET_NAME   = process.env.R2_BUCKET_NAME   || 'YOUR_BUCKET_NAME'
const R2_PUBLIC_URL    = process.env.R2_PUBLIC_URL     || 'https://YOUR_CUSTOM_DOMAIN_OR_PUBLIC_URL'

console.log('R2 Config:', {
  account:   R2_ACCOUNT_ID.slice(0, 8) + '...',
  key:       R2_ACCESS_KEY_ID.slice(0, 8) + '...',
  bucket:    R2_BUCKET_NAME,
  publicUrl: R2_PUBLIC_URL,
})

// ── AWS Signature V4 — no external SDK, no TLS issues ──
function hmac(key, data)    { return crypto.createHmac('sha256', key).update(data).digest() }
function hmacHex(key, data) { return crypto.createHmac('sha256', key).update(data).digest('hex') }
function sha256hex(data)    { return crypto.createHash('sha256').update(data).digest('hex') }

async function uploadToR2(buffer, key, contentType) {
  const host      = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const url       = `https://${host}/${R2_BUCKET_NAME}/${key}`
  const now       = new Date()
  const date      = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateOnly  = date.slice(0, 8)
  const bodyHash  = sha256hex(buffer)

  const hdrs = {
    'content-length':       String(buffer.length),
    'content-type':         contentType,
    'host':                 host,
    'x-amz-content-sha256': bodyHash,
    'x-amz-date':           date,
  }

  const sortedKeys      = Object.keys(hdrs).sort()
  const canonicalHdrs   = sortedKeys.map(k => `${k}:${hdrs[k]}`).join('\n') + '\n'
  const signedHdrs      = sortedKeys.join(';')
  const canonicalReq    = ['PUT', `/${R2_BUCKET_NAME}/${key}`, '', canonicalHdrs, signedHdrs, bodyHash].join('\n')
  const credScope       = `${dateOnly}/auto/s3/aws4_request`
  const stringToSign    = ['AWS4-HMAC-SHA256', date, credScope, sha256hex(canonicalReq)].join('\n')
  const signingKey      = hmac(hmac(hmac(hmac(`AWS4${R2_SECRET_KEY}`, dateOnly), 'auto'), 's3'), 'aws4_request')
  const signature       = hmacHex(signingKey, stringToSign)
  const authorization   = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credScope}, SignedHeaders=${signedHdrs}, Signature=${signature}`

  const res = await fetch(url, {
    method:  'PUT',
    headers: { ...hdrs, authorization },
    body:    buffer,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`R2 ${res.status}: ${text}`)
  }
  return `${R2_PUBLIC_URL}/${key}`
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

const SONGS_META_FILE = path.join(__dirname, 'songs_meta.json')
function loadSongsMeta() {
  if (!fs.existsSync(SONGS_META_FILE)) return []
  return JSON.parse(fs.readFileSync(SONGS_META_FILE, 'utf-8'))
}
function saveSongsMeta(data) {
  fs.writeFileSync(SONGS_META_FILE, JSON.stringify(data, null, 2))
}

// POST /api/upload — requires multipart form with: mp3, cover, title, artist
app.post('/api/upload', upload.fields([
  { name: 'mp3',   maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]), async (req, res) => {
  const user = getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })

  const mp3File   = req.files?.mp3?.[0]
  const coverFile = req.files?.cover?.[0]
  const title     = req.body.title?.trim()
  const artist    = req.body.artist?.trim() || user.username

  if (!mp3File)  return res.status(400).json({ error: 'MP3-Datei fehlt' })
  if (!coverFile) return res.status(400).json({ error: 'Cover-Bild fehlt' })
  if (!title)    return res.status(400).json({ error: 'Titel fehlt' })

  try {
    const id        = Date.now().toString()
    const mp3Key    = `music/${id}-${mp3File.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
    const coverKey  = `covers/${id}-${coverFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`

    const [mp3Url, coverUrl] = await Promise.all([
      uploadToR2(mp3File.buffer,   mp3Key,   'audio/mpeg'),
      uploadToR2(coverFile.buffer, coverKey, coverFile.mimetype),
    ])

    const meta = loadSongsMeta()
    const song = { id, title, artist, mp3Url, coverUrl, uploadedBy: user.id, createdAt: new Date().toISOString() }
    meta.push(song)
    saveSongsMeta(meta)

    res.status(201).json(song)
  } catch (err) {
    console.error('R2 upload error:', err.message, err.Code, err.$metadata)
    res.status(500).json({ error: `Upload fehlgeschlagen: ${err.message}` })
  }
})

// GET /api/songs/uploaded — all uploaded songs (for search/player)
app.get('/api/songs/uploaded', (req, res) => {
  const meta  = loadSongsMeta()
  const songs = meta.map((s, i) => ({
    id:     `u_${s.id}`,
    artist: s.artist,
    name:   s.title,
    cover:  s.coverUrl,
    url:    s.mp3Url,
    file:   null,
  }))
  res.json(songs)
})

app.listen(3001, '0.0.0.0', () => console.log('🎵 NyuJam server running on port 3001'))