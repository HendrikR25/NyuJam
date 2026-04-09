require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')
const fs      = require('fs')
const crypto  = require('crypto')
const multer  = require('multer')
const bcrypt  = require('bcryptjs')
const rateLimit = require('express-rate-limit')
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { Resend } = require('resend')
const { createClient } = require('@supabase/supabase-js')

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = 'noreply@nyujam.com'

async function sendEmail({ to, subject, html }) {
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html })
  } catch (e) {
    console.error('Email error:', e.message)
  }
}

const app = express()
app.set('trust proxy', 1)  // Railway läuft hinter einem Proxy
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    /\.vercel\.app$/,
    'https://nyujam.com',
    'https://www.nyujam.com',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ── Rate Limiting ──────────────────────────────────────
// Streng für Auth-Endpoints (Login/Register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 Minuten
  max: 20,                    // max 20 Versuche pro IP
  message: { error: 'Zu viele Anfragen. Bitte warte 15 Minuten.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Locker für allgemeine API-Anfragen
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 Minute
  max: 100,                   // max 100 Anfragen pro IP
  message: { error: 'Zu viele Anfragen. Bitte kurz warten.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Streng für Upload
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 Stunde
  max: 20,                    // max 20 Uploads pro Stunde
  message: { error: 'Upload-Limit erreicht. Bitte warte eine Stunde.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/auth', authLimiter)
app.use('/api/upload', uploadLimiter)
app.use('/api', apiLimiter)

// ── Supabase ───────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jodlwspmkwhparwinttz.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'YOUR_SERVICE_ROLE_KEY'
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── R2 Config ──────────────────────────────────────────
const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID    || ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_KEY    = process.env.R2_SECRET_KEY    || ''
const R2_BUCKET_NAME   = process.env.R2_BUCKET_NAME   || ''
const R2_PUBLIC_URL    = process.env.R2_PUBLIC_URL     || ''

const MUSIC_DIR = path.join(__dirname, 'music')

// ── AWS Sig V4 helpers ─────────────────────────────────
function hmac(key, data)    { return crypto.createHmac('sha256', key).update(data).digest() }
function hmacHex(key, data) { return crypto.createHmac('sha256', key).update(data).digest('hex') }
function sha256hex(data)    { return crypto.createHash('sha256').update(data).digest('hex') }

async function uploadToR2(buffer, key, contentType) {
  const host     = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const url      = `https://${host}/${R2_BUCKET_NAME}/${key}`
  const now      = new Date()
  const date     = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateOnly = date.slice(0, 8)
  const bodyHash = sha256hex(buffer)
  const hdrs = { 'content-length': String(buffer.length), 'content-type': contentType, 'host': host, 'x-amz-content-sha256': bodyHash, 'x-amz-date': date }
  const sortedKeys    = Object.keys(hdrs).sort()
  const canonicalHdrs = sortedKeys.map(k => `${k}:${hdrs[k]}`).join('\n') + '\n'
  const signedHdrs    = sortedKeys.join(';')
  const canonicalReq  = ['PUT', `/${R2_BUCKET_NAME}/${key}`, '', canonicalHdrs, signedHdrs, bodyHash].join('\n')
  const credScope     = `${dateOnly}/auto/s3/aws4_request`
  const stringToSign  = ['AWS4-HMAC-SHA256', date, credScope, sha256hex(canonicalReq)].join('\n')
  const signingKey    = hmac(hmac(hmac(hmac(`AWS4${R2_SECRET_KEY}`, dateOnly), 'auto'), 's3'), 'aws4_request')
  const signature     = hmacHex(signingKey, stringToSign)
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credScope}, SignedHeaders=${signedHdrs}, Signature=${signature}`
  const res = await fetch(url, { method: 'PUT', headers: { ...hdrs, authorization }, body: buffer })
  if (!res.ok) throw new Error(`R2 ${res.status}: ${await res.text()}`)
  return `${R2_PUBLIC_URL}/${key}`
}

async function deleteFromR2(key) {
  const host     = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const url      = `https://${host}/${R2_BUCKET_NAME}/${key}`
  const now      = new Date()
  const date     = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateOnly = date.slice(0, 8)
  const bodyHash = sha256hex('')
  const hdrs = { 'host': host, 'x-amz-content-sha256': bodyHash, 'x-amz-date': date }
  const sortedKeys    = Object.keys(hdrs).sort()
  const canonicalHdrs = sortedKeys.map(k => `${k}:${hdrs[k]}`).join('\n') + '\n'
  const signedHdrs    = sortedKeys.join(';')
  const canonicalReq  = ['DELETE', `/${R2_BUCKET_NAME}/${key}`, '', canonicalHdrs, signedHdrs, bodyHash].join('\n')
  const credScope     = `${dateOnly}/auto/s3/aws4_request`
  const stringToSign  = ['AWS4-HMAC-SHA256', date, credScope, sha256hex(canonicalReq)].join('\n')
  const signingKey    = hmac(hmac(hmac(hmac(`AWS4${R2_SECRET_KEY}`, dateOnly), 'auto'), 's3'), 'aws4_request')
  const signature     = hmacHex(signingKey, stringToSign)
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credScope}, SignedHeaders=${signedHdrs}, Signature=${signature}`
  const res = await fetch(url, { method: 'DELETE', headers: { ...hdrs, authorization } })
  if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${res.status}: ${await res.text()}`)
}

// ── Auth helpers ───────────────────────────────────────
function simpleToken(id) { return Buffer.from(`${id}:${Date.now()}`).toString('base64') }

async function getUserFromToken(req) {
  const tok = (req.headers.authorization || '').replace('Bearer ', '')
  if (!tok) return null
  const { data } = await sb.from('users').select('*').eq('token', tok).single()
  return data || null
}

function safeUser(u) {
  if (!u) return null
  const { password, token, ...rest } = u
  return rest
}

// ── Songs (local MP3s) ─────────────────────────────────
app.get('/api/songs', (req, res) => {
  const host  = req.headers.host ?? 'localhost:3001'
  const proto = req.headers['x-forwarded-proto'] ?? 'http'
  const files = fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3')) : []
  const songs = files.map((file, i) => {
    const name  = file.replace('.mp3', '')
    const parts = name.split(' - ')
    return { id: `l_${i+1}`, artist: parts[0]?.trim() ?? 'Unbekannt', name: parts[1]?.trim() ?? name, file, url: `${proto}://${host}/music/${encodeURIComponent(file)}` }
  })
  res.json(songs)
})

app.get('/music/:filename', (req, res) => {
  const filePath = path.join(MUSIC_DIR, req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Range')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')
  const stat  = fs.statSync(filePath)
  const range = req.headers.range
  if (range) {
    const [start, end] = range.replace('bytes=', '').split('-').map(Number)
    const chunkEnd = end || Math.min(start + 1_000_000, stat.size - 1)
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${chunkEnd}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunkEnd - start + 1, 'Content-Type': 'audio/mpeg' })
    fs.createReadStream(filePath, { start, end: chunkEnd }).pipe(res)
  } else {
    res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': 'audio/mpeg' })
    fs.createReadStream(filePath).pipe(res)
  }
})

// ── Songs (uploaded to R2) ─────────────────────────────
app.get('/api/songs/uploaded', async (req, res) => {
  const { data } = await sb.from('songs_meta').select('*').order('created_at', { ascending: false })
  res.json((data || []).map(s => ({ id: `u_${s.id}`, artist: s.artist, name: s.title, cover: s.cover_url, url: s.mp3_url, country: s.country, city: s.city, continent: s.continent })))
})

app.get('/api/songs/all', async (req, res) => {
  const host  = req.headers.host ?? 'localhost:3001'
  const proto = req.headers['x-forwarded-proto'] ?? 'http'
  const files = fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3')) : []
  const local = files.map((file, i) => {
    const name = file.replace('.mp3', ''), parts = name.split(' - ')
    return { id: `l_${i+1}`, artist: parts[0]?.trim() ?? 'Unbekannt', name: parts[1]?.trim() ?? name, cover: null, url: `${proto}://${host}/music/${encodeURIComponent(file)}`, country: null, city: null, continent: null }
  })
  const { data } = await sb.from('songs_meta').select('*')
  const uploaded = (data || []).map(s => ({ id: `u_${s.id}`, artist: s.artist, name: s.title, cover: s.cover_url, url: s.mp3_url, country: s.country, city: s.city, continent: s.continent }))
  res.json([...uploaded, ...local])
})

// Country → Continent lookup
const countryToContinent = { DE:'europe',AT:'europe',CH:'europe',FR:'europe',GB:'europe',IT:'europe',ES:'europe',NL:'europe',BE:'europe',PL:'europe',SE:'europe',NO:'europe',DK:'europe',FI:'europe',PT:'europe',GR:'europe',RU:'europe',UA:'europe',TR:'europe',US:'namerica',CA:'namerica',MX:'namerica',BR:'samerica',AR:'samerica',CO:'samerica',CL:'samerica',JP:'asia',KR:'asia',CN:'asia',IN:'asia',TH:'asia',ID:'asia',SG:'asia',PH:'asia',NG:'africa',ZA:'africa',GH:'africa',KE:'africa',EG:'africa',AU:'oceania',NZ:'oceania' }

app.get('/api/songs/radio', async (req, res) => {
  const { continent, country } = req.query
  const host  = req.headers.host ?? 'localhost:3001'
  const proto = req.headers['x-forwarded-proto'] ?? 'http'
  const files = fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3')) : []
  const local = files.map((file, i) => {
    const name = file.replace('.mp3', ''), parts = name.split(' - ')
    return { id: `l_${i+1}`, artist: parts[0]?.trim() ?? 'Unbekannt', name: parts[1]?.trim() ?? name, cover: null, url: `${proto}://${host}/music/${encodeURIComponent(file)}`, country: null, city: null, continent: null }
  })
  const { data } = await sb.from('songs_meta').select('*')
  const uploaded = (data || []).map(s => ({ id: `u_${s.id}`, artist: s.artist, name: s.title, cover: s.cover_url, url: s.mp3_url, country: s.country, city: s.city, continent: s.continent }))
  const all = [...uploaded, ...local]
  if (!continent && !country) return res.json(all)
  const filtered = all.filter(s => {
    const sCont = s.continent || (s.country ? countryToContinent[s.country.toUpperCase()] : null)
    if (!s.country && !sCont) return true
    if (country && continent) {
      if (!s.country && !sCont) return true
      if (!s.country && sCont === continent.toLowerCase()) return true
      if (s.country?.toUpperCase() === country.toUpperCase()) return true
      return false
    }
    if (continent && !country) {
      if (!s.country && !sCont) return true
      if (sCont === continent.toLowerCase()) return true
      return false
    }
    return false
  })
  res.json(filtered)
})

// ── Upload ─────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

app.post('/api/upload', upload.fields([{ name: 'mp3', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const mp3File   = req.files?.mp3?.[0]
  const coverFile = req.files?.cover?.[0]
  const title     = req.body.title?.trim()
  const artist    = req.body.artist?.trim() || user.username
  const country   = req.body.country?.trim()
  const city      = req.body.city?.trim() || null
  const continent = req.body.continent?.trim() || null
  if (!mp3File) return res.status(400).json({ error: 'MP3-Datei fehlt' })
  if (!title)   return res.status(400).json({ error: 'Titel fehlt' })
  if (!country) return res.status(400).json({ error: 'Land fehlt' })
  try {
    const id     = Date.now().toString()
    const mp3Key = `music/${id}-${mp3File.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
    let coverUrl = null
    if (coverFile) {
      const coverKey = `covers/${id}-${coverFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
      coverUrl = await uploadToR2(coverFile.buffer, coverKey, coverFile.mimetype)
    }
    const mp3Url = await uploadToR2(mp3File.buffer, mp3Key, 'audio/mpeg')
    const { data, error } = await sb.from('songs_meta').insert({ id, title, artist, mp3_url: mp3Url, cover_url: coverUrl, country, city, continent, uploaded_by: user.id }).select().single()
    if (error) throw new Error(error.message)
    res.status(201).json(data)
  } catch (err) {
    console.error('Upload error:', err.message)
    res.status(500).json({ error: `Upload fehlgeschlagen: ${err.message}` })
  }
})

// PATCH /api/songs/:id — update title and/or cover
app.patch('/api/songs/:id', upload.fields([{ name: 'cover', maxCount: 1 }]), async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const rawId = req.params.id.replace(/^u_/, '')
  const { data: song } = await sb.from('songs_meta').select('*').eq('id', rawId).single()
  if (!song) return res.status(404).json({ error: 'Song nicht gefunden' })
  if (!user.is_admin && user.username.toLowerCase() !== song.artist.toLowerCase())
    return res.status(403).json({ error: 'Keine Berechtigung' })
  const updates = {}
  if (req.body.title?.trim()) updates.title = req.body.title.trim()
  if (req.files?.cover?.[0]) {
    const coverFile = req.files.cover[0]
    const coverKey  = `covers/${rawId}-${Date.now()}-${coverFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
    updates.cover_url = await uploadToR2(coverFile.buffer, coverKey, coverFile.mimetype)
    if (song.cover_url) deleteFromR2(decodeURIComponent(song.cover_url.replace(`${R2_PUBLIC_URL}/`, ''))).catch(() => {})
  }
  const { data } = await sb.from('songs_meta').update(updates).eq('id', rawId).select().single()
  res.json(data)
})

// PATCH /api/albums/:id — update title and/or cover
app.patch('/api/albums/:id', upload.fields([{ name: 'cover', maxCount: 1 }]), async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: album } = await sb.from('albums').select('*').eq('id', req.params.id).single()
  if (!album) return res.status(404).json({ error: 'Album nicht gefunden' })
  if (!user.is_admin && user.username.toLowerCase() !== album.artist.toLowerCase())
    return res.status(403).json({ error: 'Keine Berechtigung' })
  const updates = {}
  if (req.body.title?.trim()) updates.title = req.body.title.trim()
  if (req.files?.cover?.[0]) {
    const coverFile = req.files.cover[0]
    const coverKey  = `covers/album-${req.params.id}-${Date.now()}-${coverFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
    updates.cover_url = await uploadToR2(coverFile.buffer, coverKey, coverFile.mimetype)
    if (album.cover_url) deleteFromR2(decodeURIComponent(album.cover_url.replace(`${R2_PUBLIC_URL}/`, ''))).catch(() => {})
    const { data: albumSongs } = await sb.from('album_songs').select('song_id').eq('album_id', req.params.id)
    for (const as of albumSongs || []) {
      await sb.from('songs_meta').update({ cover_url: updates.cover_url }).eq('id', as.song_id)
    }
  }
  const { data } = await sb.from('albums').update(updates).eq('id', req.params.id).select().single()
  res.json(data)
})

// GET /api/my-uploads — songs and albums uploaded by current user
app.get('/api/my-uploads', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: songs }  = await sb.from('songs_meta').select('*').eq('uploaded_by', user.id).order('created_at', { ascending: false })
  const { data: albums } = await sb.from('albums').select('*, album_songs(count)').eq('uploaded_by', user.id).order('created_at', { ascending: false })
  res.json({
    songs:  (songs  || []).map(s => ({ id: s.id, title: s.title, artist: s.artist, coverUrl: s.cover_url, createdAt: s.created_at })),
    albums: (albums || []).map(a => ({ id: a.id, title: a.title, artist: a.artist, coverUrl: a.cover_url, tracks: a.album_songs?.[0]?.count || 0, createdAt: a.created_at })),
  })
})

app.delete('/api/songs/:id', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const rawId = req.params.id.replace(/^u_/, '')
  const { data: song } = await sb.from('songs_meta').select('*').eq('id', rawId).single()
  if (!song) return res.status(404).json({ error: 'Song nicht gefunden' })
  if (!user.is_admin && user.username.toLowerCase() !== song.artist.toLowerCase())
    return res.status(403).json({ error: 'Keine Berechtigung.' })
  const deletePromises = []
  if (song.mp3_url)   deletePromises.push(deleteFromR2(decodeURIComponent(song.mp3_url.replace(`${R2_PUBLIC_URL}/`, ''))).catch(e => console.error('R2 MP3 delete:', e.message)))
  if (song.cover_url) deletePromises.push(deleteFromR2(decodeURIComponent(song.cover_url.replace(`${R2_PUBLIC_URL}/`, ''))).catch(e => console.error('R2 Cover delete:', e.message)))
  await Promise.all(deletePromises)
  await sb.from('songs_meta').delete().eq('id', rawId)
  res.json({ ok: true, deleted: song.title })
})

// ── Playlists ──────────────────────────────────────────
app.get('/api/playlists', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.json([])
  const { data: playlists } = await sb.from('playlists').select('*, playlist_songs(*)').eq('user_id', user.id).order('created_at')
  res.json((playlists || []).map(p => ({ ...p, songs: p.playlist_songs || [] })))
})

app.get('/api/playlists/:id', async (req, res) => {
  const { data } = await sb.from('playlists').select('*, playlist_songs(*)').eq('id', req.params.id).single()
  if (!data) return res.status(404).json({ error: 'Not found' })
  res.json({ ...data, songs: data.playlist_songs || [] })
})

app.post('/api/playlists', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { name, icon, color } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })
  const { data, error } = await sb.from('playlists').insert({ id: Date.now().toString(), user_id: user.id, name: name.trim(), icon: icon || '▤', color: color || '#5b6aff' }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ ...data, songs: [] })
})

app.delete('/api/playlists/:id', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  await sb.from('playlists').delete().eq('id', req.params.id).eq('user_id', user.id)
  res.json({ ok: true })
})

app.post('/api/playlists/:id/songs', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { songId, name, artist } = req.body
  const { data: existing } = await sb.from('playlist_songs').select('id').eq('playlist_id', req.params.id).eq('song_id', songId).single()
  if (existing) return res.status(409).json({ error: 'Song already in playlist' })
  await sb.from('playlist_songs').insert({ id: Date.now().toString(), playlist_id: req.params.id, song_id: songId, song_name: name, song_artist: artist })
  const { data } = await sb.from('playlists').select('*, playlist_songs(*)').eq('id', req.params.id).single()
  res.json({ ...data, songs: data.playlist_songs || [] })
})

app.delete('/api/playlists/:id/songs/:songId', async (req, res) => {
  await sb.from('playlist_songs').delete().eq('playlist_id', req.params.id).eq('song_id', req.params.songId)
  res.json({ ok: true })
})

// ── Favorites ──────────────────────────────────────────
app.get('/api/favorites', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.json([])
  const { data } = await sb.from('favorites').select('*').eq('user_id', user.id).order('added_at')
  res.json((data || []).map(f => ({ id: f.song_id, name: f.song_name, artist: f.song_artist })))
})

app.post('/api/favorites', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { id, name, artist } = req.body
  const { error } = await sb.from('favorites').insert({ user_id: user.id, song_id: String(id), song_name: name, song_artist: artist })
  if (error) return res.status(409).json({ error: 'Already in favorites' })
  res.status(201).json({ ok: true })
})

app.delete('/api/favorites/:id', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  await sb.from('favorites').delete().eq('user_id', user.id).eq('song_id', req.params.id)
  res.json({ ok: true })
})

// ── Auth ───────────────────────────────────────────────
app.get('/api/auth/me', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  res.json({ user: safeUser(user) })
})

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body
  if (!username?.trim() || !email?.trim() || !password) return res.status(400).json({ error: 'Alle Felder sind erforderlich.' })
  if (username.trim().toLowerCase() === 'admin') return res.status(400).json({ error: 'Benutzername nicht erlaubt.' })
  const { data: existU } = await sb.from('users').select('id').eq('username', username.trim()).single()
  if (existU) return res.status(409).json({ error: 'Benutzername bereits vergeben.' })
  const { data: existE } = await sb.from('users').select('id').eq('email', email.trim().toLowerCase()).single()
  if (existE) return res.status(409).json({ error: 'E-Mail bereits registriert.' })
  const id             = Date.now().toString()
  const token          = simpleToken(id)
  const verify_token   = simpleToken(id + 'verify' + Math.random())
  const hashedPassword = await bcrypt.hash(password, 10)
  const { data, error } = await sb.from('users').insert({
    id, username: username.trim(), email: email.trim().toLowerCase(),
    password: hashedPassword, bio: '', is_public: true, is_admin: false,
    token, is_verified: false, verify_token,
  }).select().single()
  if (error) return res.status(500).json({ error: error.message })

  // Send verification email
  const verifyUrl = `${process.env.FRONTEND_URL || 'https://nyujam.com'}/verify-email?token=${verify_token}`
  await sendEmail({
    to: email.trim(),
    subject: 'NyuJam — E-Mail bestätigen',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0f;color:#f0ede6;padding:2rem;border-radius:8px">
        <h1 style="font-size:1.5rem;letter-spacing:0.1em;margin-bottom:0.5rem">◈ NYUJAM</h1>
        <p style="color:rgba(240,237,230,0.6);margin-bottom:1.5rem">Willkommen, <strong>${username.trim()}</strong>!</p>
        <p style="margin-bottom:1.5rem">Bitte bestätige deine E-Mail-Adresse um deinen Account zu aktivieren:</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#5b6aff;color:white;padding:0.75rem 2rem;border-radius:4px;text-decoration:none;font-weight:600">E-Mail bestätigen</a>
        <p style="margin-top:1.5rem;font-size:0.75rem;color:rgba(240,237,230,0.3)">Dieser Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, ignoriere diese E-Mail.</p>
      </div>
    `,
  })

  res.status(201).json({ user: safeUser(data), token, needsVerification: true })
})

// GET /api/auth/verify-email?token=...
app.get('/api/auth/verify-email', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token fehlt' })
  const { data: user } = await sb.from('users').select('*').eq('verify_token', token).single()
  if (!user) return res.status(400).json({ error: 'Ungültiger oder abgelaufener Link.' })
  await sb.from('users').update({ is_verified: true, verify_token: null }).eq('id', user.id)
  res.json({ ok: true, message: 'E-Mail bestätigt! Du kannst dich jetzt anmelden.' })
})

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'E-Mail fehlt' })
  const { data: user } = await sb.from('users').select('*').ilike('email', email.trim()).single()
  // Always return success to prevent email enumeration
  if (!user) return res.json({ ok: true })
  const reset_token         = simpleToken(user.id + 'reset' + Math.random())
  const reset_token_expires = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
  await sb.from('users').update({ reset_token, reset_token_expires }).eq('id', user.id)
  const resetUrl = `${process.env.FRONTEND_URL || 'https://nyujam.com'}/reset-password?token=${reset_token}`
  await sendEmail({
    to: user.email,
    subject: 'NyuJam — Passwort zurücksetzen',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0f;color:#f0ede6;padding:2rem;border-radius:8px">
        <h1 style="font-size:1.5rem;letter-spacing:0.1em;margin-bottom:0.5rem">◈ NYUJAM</h1>
        <p style="margin-bottom:1.5rem">Du hast eine Passwort-Zurücksetzung angefordert. Klicke auf den Link:</p>
        <a href="${resetUrl}" style="display:inline-block;background:#f0c832;color:#0a0a0f;padding:0.75rem 2rem;border-radius:4px;text-decoration:none;font-weight:600">Passwort zurücksetzen</a>
        <p style="margin-top:1.5rem;font-size:0.75rem;color:rgba(240,237,230,0.3)">Dieser Link ist 1 Stunde gültig. Falls du kein Zurücksetzen angefordert hast, ignoriere diese E-Mail.</p>
      </div>
    `,
  })
  res.json({ ok: true })
})

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Token und Passwort erforderlich' })
  if (password.length < 6) return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben.' })
  const { data: user } = await sb.from('users').select('*').eq('reset_token', token).single()
  if (!user) return res.status(400).json({ error: 'Ungültiger oder abgelaufener Link.' })
  if (new Date(user.reset_token_expires) < new Date()) return res.status(400).json({ error: 'Link abgelaufen. Bitte erneut anfordern.' })
  const hashedPassword = await bcrypt.hash(password, 10)
  await sb.from('users').update({ password: hashedPassword, reset_token: null, reset_token_expires: null }).eq('id', user.id)
  res.json({ ok: true, message: 'Passwort erfolgreich geändert.' })
})

// POST /api/auth/change-password (logged in)
app.post('/api/auth/change-password', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt.' })
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Alle Felder erforderlich.' })
  if (newPassword.length < 6) return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben.' })
  const match = await bcrypt.compare(currentPassword, user.password)
  if (!match) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' })
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await sb.from('users').update({ password: hashedPassword }).eq('id', user.id)
  res.json({ ok: true })
})

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body
  if (!identifier || !password) return res.status(400).json({ error: 'Benutzername/E-Mail und Passwort erforderlich.' })
  const { data: byUsername } = await sb.from('users').select('*').ilike('username', identifier).single()
  const { data: byEmail }    = await sb.from('users').select('*').ilike('email', identifier).single()
  const user = byUsername || byEmail
  if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten.' })
  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) return res.status(401).json({ error: 'Ungültige Anmeldedaten.' })
  if (user.is_verified === false) return res.status(403).json({ error: 'Bitte bestätige zuerst deine E-Mail-Adresse.', needsVerification: true })
  const token = simpleToken(user.id)
  await sb.from('users').update({ token }).eq('id', user.id)
  user.token = token
  res.json({ user: safeUser(user), token })
})

app.patch('/api/auth/profile', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt.' })
  const { bio, isPublic, avatar } = req.body
  const updates = {}
  if (bio      !== undefined) updates.bio       = bio
  if (isPublic !== undefined) updates.is_public = isPublic
  if (avatar   !== undefined) updates.avatar    = avatar
  const { data, error } = await sb.from('users').update(updates).eq('id', user.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ user: safeUser(data) })
})

app.get('/api/users/:id', async (req, res) => {
  const { data } = await sb.from('users').select('id,username,avatar').eq('id', req.params.id).single()
  if (!data) return res.status(404).json({ error: 'Not found' })
  res.json(data)
})

// ── Friends ────────────────────────────────────────────
app.get('/api/friends', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: fs_ } = await sb.from('friendships').select('*').or(`user_a.eq.${me.id},user_b.eq.${me.id}`)
  const { data: users } = await sb.from('users').select('id,username,avatar,bio')
  const friends = [], pending = []
  for (const f of fs_ || []) {
    const otherId = f.user_a === me.id ? f.user_b : f.user_a
    const other   = users?.find(u => u.id === otherId)
    if (!other) continue
    if (f.status === 'accepted') friends.push(other)
    else if (f.status === 'pending' && f.user_b === me.id) pending.push({ ...other, friendshipId: f.id })
  }
  res.json({ friends, pending })
})

app.post('/api/friends/request', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { username } = req.body
  const { data: target } = await sb.from('users').select('id').ilike('username', username).single()
  if (!target) return res.status(404).json({ error: 'Benutzer nicht gefunden.' })
  if (target.id === me.id) return res.status(400).json({ error: 'Kannst dir selbst nicht schicken.' })
  const { error } = await sb.from('friendships').insert({ id: Date.now().toString(), user_a: me.id, user_b: target.id, status: 'pending' })
  if (error) return res.status(409).json({ error: 'Anfrage bereits gesendet oder bereits Freunde.' })
  res.json({ ok: true })
})

app.post('/api/friends/:friendshipId/respond', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { action } = req.body
  if (action === 'accept') await sb.from('friendships').update({ status: 'accepted' }).eq('id', req.params.friendshipId).eq('user_b', me.id)
  else                     await sb.from('friendships').delete().eq('id', req.params.friendshipId).eq('user_b', me.id)
  res.json({ ok: true })
})

app.delete('/api/friends/:userId', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  await sb.from('friendships').delete().or(`and(user_a.eq.${me.id},user_b.eq.${req.params.userId}),and(user_a.eq.${req.params.userId},user_b.eq.${me.id})`)
  res.json({ ok: true })
})

// ── Groups ─────────────────────────────────────────────
app.get('/api/groups', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: memberships } = await sb.from('group_members').select('group_id').eq('user_id', me.id)
  const groupIds = (memberships || []).map(m => m.group_id)
  if (!groupIds.length) return res.json([])
  const { data: groups } = await sb.from('groups').select('*, group_members(count)').in('id', groupIds)
  res.json((groups || []).map(g => ({ ...g, members: g.group_members?.[0]?.count || 1 })))
})

app.post('/api/groups', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { name, icon, color } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name erforderlich' })
  const id = Date.now().toString()
  const { data: group } = await sb.from('groups').insert({ id, name: name.trim(), icon: icon || '⬡', color: color || '#32c8a0', host_id: me.id }).select().single()
  await sb.from('group_members').insert({ group_id: id, user_id: me.id })
  res.status(201).json({ ...group, members: 1 })
})

app.post('/api/groups/join', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { name } = req.body
  const { data: group } = await sb.from('groups').select('*').ilike('name', name).single()
  if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden.' })
  const { error } = await sb.from('group_members').insert({ group_id: group.id, user_id: me.id })
  if (error) return res.status(409).json({ error: 'Bereits Mitglied.' })
  res.json(group)
})

app.delete('/api/groups/:id/leave', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  await sb.from('group_members').delete().eq('group_id', req.params.id).eq('user_id', me.id)
  res.json({ ok: true })
})

// ── Messages ───────────────────────────────────────────
app.get('/api/messages/:targetId', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { targetId } = req.params
  const { data } = await sb.from('messages').select('*')
    .or(`group_id.eq.${targetId},and(to_id.eq.${targetId},from_id.eq.${me.id}),and(to_id.eq.${me.id},from_id.eq.${targetId})`)
    .order('created_at')
  res.json(data || [])
})

app.post('/api/messages', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { toId, groupId, text, songId, songName, songArtist } = req.body
  if (!text && !songId) return res.status(400).json({ error: 'Text oder Song erforderlich' })
  const { data } = await sb.from('messages').insert({ id: Date.now().toString(), from_id: me.id, from_name: me.username, from_avatar: me.avatar || null, to_id: toId || null, group_id: groupId || null, text: text || null, song_id: songId || null, song_name: songName || null, song_artist: songArtist || null }).select().single()
  res.status(201).json(data)
})

app.get('/api/conversations', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: fships } = await sb.from('friendships').select('*').or(`user_a.eq.${me.id},user_b.eq.${me.id}`).eq('status', 'accepted')
  const { data: allUsers } = await sb.from('users').select('id,username,avatar')
  const { data: allMsgs }  = await sb.from('messages').select('*').order('created_at', { ascending: false })
  const { data: memberships } = await sb.from('group_members').select('group_id').eq('user_id', me.id)
  const groupIds = (memberships || []).map(m => m.group_id)
  const { data: groups } = groupIds.length ? await sb.from('groups').select('*, group_members(count)').in('id', groupIds) : { data: [] }

  const dms = (fships || []).map(f => {
    const fId   = f.user_a === me.id ? f.user_b : f.user_a
    const friend = allUsers?.find(u => u.id === fId)
    if (!friend) return null
    const msgs  = (allMsgs || []).filter(m => (m.from_id === me.id && m.to_id === fId) || (m.from_id === fId && m.to_id === me.id))
    const last  = msgs[0] || null
    const unread = msgs.filter(m => m.to_id === me.id).length
    return { type: 'dm', id: fId, name: friend.username, avatar: friend.avatar, lastMessage: last, unread }
  }).filter(Boolean)

  const grps = (groups || []).map(g => {
    const msgs = (allMsgs || []).filter(m => m.group_id === g.id)
    return { type: 'group', id: g.id, name: g.name, icon: g.icon, color: g.color, members: g.group_members?.[0]?.count || 1, lastMessage: msgs[0] || null, unread: 0 }
  })

  res.json({ dms, groups: grps })
})

// ── Search History ─────────────────────────────────────
app.get('/api/search/history', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.json([])
  const { data } = await sb.from('search_history').select('id,query,searched_at').eq('user_id', user.id).order('searched_at', { ascending: false }).limit(10)
  res.json(data || [])
})

app.post('/api/search/history', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const query = req.body.query?.trim()
  if (!query) return res.status(400).json({ error: 'Query fehlt' })
  // Delete duplicate if exists
  await sb.from('search_history').delete().eq('user_id', user.id).ilike('query', query)
  // Insert new entry
  await sb.from('search_history').insert({ user_id: user.id, query })
  // Keep only last 10
  const { data: all } = await sb.from('search_history').select('id').eq('user_id', user.id).order('searched_at', { ascending: false })
  if (all && all.length > 10) {
    const toDelete = all.slice(10).map(r => r.id)
    await sb.from('search_history').delete().in('id', toDelete)
  }
  res.json({ ok: true })
})

app.delete('/api/search/history/:id', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  await sb.from('search_history').delete().eq('id', req.params.id).eq('user_id', user.id)
  res.json({ ok: true })
})

app.delete('/api/search/history', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  await sb.from('search_history').delete().eq('user_id', user.id)
  res.json({ ok: true })
})

// ── Albums ─────────────────────────────────────────────
// GET /api/albums/artist/:name — all albums for an artist with their songs
app.get('/api/albums/artist/:name', async (req, res) => {
  const artist = decodeURIComponent(req.params.name)
  const { data: albums } = await sb.from('albums').select('*, album_songs(track_nr, songs_meta(*))').ilike('artist', artist).order('released_at', { ascending: false })
  if (!albums) return res.json([])
  const result = albums.map(a => ({
    id:          a.id,
    title:       a.title,
    artist:      a.artist,
    coverUrl:    a.cover_url,
    country:     a.country,
    releasedAt:  a.released_at,
    songs:       (a.album_songs || [])
      .sort((x, y) => x.track_nr - y.track_nr)
      .map(as => ({
        id:       `u_${as.songs_meta.id}`,
        name:     as.songs_meta.title,
        artist:   as.songs_meta.artist,
        cover:    as.songs_meta.cover_url,
        url:      as.songs_meta.mp3_url,
        trackNr:  as.track_nr,
      })),
  }))
  res.json(result)
})

// POST /api/albums — create album with multiple songs
app.post('/api/albums', upload.fields([
  { name: 'cover',     maxCount: 1 },
  ...Array.from({ length: 20 }, (_, i) => ({ name: `mp3_${i}`, maxCount: 1 })),
]), async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })

  const title      = req.body.title?.trim()
  const artist     = req.body.artist?.trim() || user.username
  const country    = req.body.country?.trim()
  const city       = req.body.city?.trim() || null
  const continent  = req.body.continent?.trim() || null
  const releasedAt = req.body.releasedAt?.trim() || new Date().toISOString().split('T')[0]

  if (!title)   return res.status(400).json({ error: 'Albumtitel fehlt' })
  if (!country) return res.status(400).json({ error: 'Land fehlt' })

  // Parse track titles & artists
  let tracks = []
  try { tracks = JSON.parse(req.body.tracks || '[]') } catch {}
  if (!tracks.length) return res.status(400).json({ error: 'Keine Songs angegeben' })

  try {
    const albumId = Date.now().toString()

    // Upload cover if provided
    let coverUrl = null
    if (req.files?.cover?.[0]) {
      const coverFile = req.files.cover[0]
      const coverKey  = `covers/${albumId}-${coverFile.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
      coverUrl = await uploadToR2(coverFile.buffer, coverKey, coverFile.mimetype)
    }

    // Create album
    await sb.from('albums').insert({ id: albumId, title, artist, cover_url: coverUrl, country, city, continent, released_at: releasedAt, uploaded_by: user.id })

    // Upload each track
    const songIds = []
    for (let i = 0; i < tracks.length; i++) {
      const mp3File = req.files?.[`mp3_${i}`]?.[0]
      if (!mp3File) continue
      const songId  = `${Date.now()}_${i}`
      const mp3Key  = `music/${songId}-${mp3File.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
      const mp3Url  = await uploadToR2(mp3File.buffer, mp3Key, 'audio/mpeg')
      const trackTitle  = tracks[i].title?.trim() || mp3File.originalname.replace('.mp3', '')
      const trackArtist = tracks[i].artist?.trim() || artist
      await sb.from('songs_meta').insert({ id: songId, title: trackTitle, artist: trackArtist, mp3_url: mp3Url, cover_url: coverUrl, country, city, continent, uploaded_by: user.id })
      await sb.from('album_songs').insert({ id: `${albumId}_${i}`, album_id: albumId, song_id: songId, track_nr: i + 1 })
      songIds.push(songId)
    }

    res.status(201).json({ id: albumId, title, artist, coverUrl, tracks: songIds.length })
  } catch (err) {
    console.error('Album upload error:', err.message)
    res.status(500).json({ error: `Upload fehlgeschlagen: ${err.message}` })
  }
})

// DELETE /api/albums/:id
app.delete('/api/albums/:id', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: album } = await sb.from('albums').select('*').eq('id', req.params.id).single()
  if (!album) return res.status(404).json({ error: 'Album nicht gefunden' })
  if (!user.is_admin && user.username.toLowerCase() !== album.artist.toLowerCase())
    return res.status(403).json({ error: 'Keine Berechtigung.' })
  // Delete all songs in album from R2 + songs_meta
  const { data: albumSongs } = await sb.from('album_songs').select('songs_meta(*)').eq('album_id', req.params.id)
  for (const as of albumSongs || []) {
    const s = as.songs_meta
    if (s?.mp3_url)   await deleteFromR2(decodeURIComponent(s.mp3_url.replace(`${R2_PUBLIC_URL}/`, ''))).catch(() => {})
    if (s?.cover_url) await deleteFromR2(decodeURIComponent(s.cover_url.replace(`${R2_PUBLIC_URL}/`, ''))).catch(() => {})
    await sb.from('songs_meta').delete().eq('id', s.id)
  }
  if (album.cover_url) await deleteFromR2(decodeURIComponent(album.cover_url.replace(`${R2_PUBLIC_URL}/`, ''))).catch(() => {})
  await sb.from('albums').delete().eq('id', req.params.id)
  res.json({ ok: true })
})

// ── Streams ────────────────────────────────────────────
// POST /api/streams — log a play
app.post('/api/streams', async (req, res) => {
  const { songId, songName, artist } = req.body
  if (!songId) return res.status(400).json({ error: 'songId fehlt' })
  await sb.from('streams').insert({ song_id: String(songId), song_name: songName || null, artist: artist || null })
  res.json({ ok: true })
})

// GET /api/streams/song/:songId — stream count for one song
app.get('/api/streams/song/:songId', async (req, res) => {
  const { count } = await sb.from('streams').select('*', { count: 'exact', head: true }).eq('song_id', req.params.songId)
  res.json({ songId: req.params.songId, streams: count || 0 })
})

// GET /api/streams/artist/:name — total streams for artist
app.get('/api/streams/artist/:name', async (req, res) => {
  const name = decodeURIComponent(req.params.name)
  const { count } = await sb.from('streams').select('*', { count: 'exact', head: true }).ilike('artist', name)
  res.json({ artist: name, streams: count || 0 })
})

// GET /api/streams/artist/:name/songs — per-song stream counts for artist
app.get('/api/streams/artist/:name/songs', async (req, res) => {
  const name = decodeURIComponent(req.params.name)
  const { data } = await sb.from('streams').select('song_id, song_name').ilike('artist', name)
  const counts = {}
  for (const row of data || []) {
    counts[row.song_id] = (counts[row.song_id] || 0) + 1
  }
  res.json(counts)
})

// ── Donations (Stripe) ────────────────────────────────
app.post('/api/donations/create-payment-intent', async (req, res) => {
  const { amount, message, artistName } = req.body
  if (!amount || amount < 1) return res.status(400).json({ error: 'Ungültiger Betrag' })
  if (amount > 999) return res.status(400).json({ error: 'Maximalbetrag: 999€' })

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),  // Stripe erwartet Cents
      currency: 'eur',
      metadata: {
        message:    message?.slice(0, 500) || '',
        artistName: artistName || 'NyuJam',
        type:       artistName ? 'artist' : 'platform',
      },
      automatic_payment_methods: { enabled: true },
    })
    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('Stripe error:', err.message)
    res.status(500).json({ error: 'Zahlung konnte nicht erstellt werden.' })
  }
})

// Stripe Webhook — bestätigt erfolgreiche Zahlung
app.post('/api/donations/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig    = req.headers['stripe-signature']
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return res.json({ received: true })
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, secret)
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object
      console.log(`✅ Donation: ${pi.amount / 100}€ für ${pi.metadata.artistName}`)
    }
    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
})

// ── Radio Sessions ─────────────────────────────────────
async function getAllSongs(req) {
  const host  = req.headers.host ?? 'localhost:3001'
  const proto = req.headers['x-forwarded-proto'] ?? 'http'
  const files = fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3')) : []
  const local = files.map((file, i) => {
    const name = file.replace('.mp3', ''), parts = name.split(' - ')
    return { id: `l_${i+1}`, artist: parts[0]?.trim() ?? 'Unbekannt', name: parts[1]?.trim() ?? name, cover: null, url: `${proto}://${host}/music/${encodeURIComponent(file)}` }
  })
  const { data } = await sb.from('songs_meta').select('*')
  const uploaded = (data || []).map(s => ({ id: `u_${s.id}`, artist: s.artist, name: s.title, cover: s.cover_url, url: s.mp3_url }))
  return [...uploaded, ...local]
}

app.get('/api/radio/sessions', async (req, res) => {
  const me = await getUserFromToken(req)
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  await sb.from('radio_sessions').delete().lt('updated_at', cutoff)
  const { data } = await sb.from('radio_sessions').select('*').eq('is_public', true)
  res.json(data || [])
})

app.post('/api/radio/sessions', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const allSongs = await getAllSongs(req)
  const queue    = [...allSongs].sort(() => Math.random() - 0.5)
  await sb.from('radio_sessions').delete().eq('host_id', me.id)
  const { data } = await sb.from('radio_sessions').insert({
    id: Date.now().toString(), host_id: me.id, host_name: me.username, host_avatar: me.avatar || null,
    is_public: req.body.isPublic !== false, current_song: queue[0] || null,
    queue: queue.slice(1, 20), listeners: [me.id], votes: [], chat_messages: [],
  }).select().single()
  res.status(201).json(data)
})

app.get('/api/radio/sessions/:id', async (req, res) => {
  const { data } = await sb.from('radio_sessions').select('*').eq('id', req.params.id).single()
  if (!data) return res.status(404).json({ error: 'Session nicht gefunden' })
  res.json(data)
})

app.post('/api/radio/sessions/:id/join', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: s } = await sb.from('radio_sessions').select('*').eq('id', req.params.id).single()
  if (!s) return res.status(404).json({ error: 'Nicht gefunden' })
  const listeners = [...new Set([...(s.listeners || []), me.id])]
  const { data } = await sb.from('radio_sessions').update({ listeners, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
  res.json(data)
})

app.post('/api/radio/sessions/:id/leave', async (req, res) => {
  const me = await getUserFromToken(req)
  const { data: s } = await sb.from('radio_sessions').select('*').eq('id', req.params.id).single()
  if (!s) return res.json({ ok: true })
  const listeners = (s.listeners || []).filter(id => id !== me?.id)
  if (listeners.length === 0 || s.host_id === me?.id) await sb.from('radio_sessions').delete().eq('id', req.params.id)
  else await sb.from('radio_sessions').update({ listeners, updated_at: new Date().toISOString() }).eq('id', req.params.id)
  res.json({ ok: true })
})

app.post('/api/radio/sessions/:id/vote', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: s } = await sb.from('radio_sessions').select('*').eq('id', req.params.id).single()
  if (!s) return res.status(404).json({ error: 'Nicht gefunden' })
  const votes  = [...new Set([...(s.votes || []), me.id])]
  const needed = Math.ceil((s.listeners || []).length / 2)
  let current_song = s.current_song, queue = s.queue || [], skipped = false
  let chat_messages = s.chat_messages || []
  if (votes.length >= needed) {
    if (queue.length > 0) { current_song = queue[0]; queue = queue.slice(1) }
    chat_messages = [...chat_messages, { id: Date.now().toString(), system: true, text: `⏭ Song übersprungen (${needed}/${s.listeners.length} Stimmen)`, createdAt: new Date().toISOString() }].slice(-100)
    skipped = true
  }
  const song_started_at = skipped ? new Date().toISOString() : (s.song_started_at || new Date().toISOString())
  const { data } = await sb.from('radio_sessions').update({ votes: skipped ? [] : votes, current_song, queue, chat_messages, song_started_at, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
  res.json({ ...data, skipped })
})

app.post('/api/radio/sessions/:id/chat', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: s } = await sb.from('radio_sessions').select('chat_messages').eq('id', req.params.id).single()
  if (!s) return res.status(404).json({ error: 'Nicht gefunden' })
  const msg = { id: Date.now().toString(), fromId: me.id, fromName: me.username, fromAvatar: me.avatar || null, text: req.body.text?.slice(0, 500) || '', createdAt: new Date().toISOString() }
  const chat_messages = [...(s.chat_messages || []), msg].slice(-100)
  await sb.from('radio_sessions').update({ chat_messages, updated_at: new Date().toISOString() }).eq('id', req.params.id)
  res.json(msg)
})

app.post('/api/radio/sessions/:id/queue', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: s } = await sb.from('radio_sessions').select('*').eq('id', req.params.id).single()
  if (!s) return res.status(404).json({ error: 'Nicht gefunden' })
  const song  = req.body.song
  if (!song)  return res.status(400).json({ error: 'Song fehlt' })
  const queue = [...(s.queue || []), song]
  let current_song = s.current_song
  let newQueue     = queue
  let song_started_at = s.song_started_at || null
  if (!current_song) {
    current_song    = queue[0]
    newQueue        = queue.slice(1)
    song_started_at = new Date().toISOString()
  }
  const { data } = await sb.from('radio_sessions').update({ queue: newQueue, current_song, song_started_at, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
  res.json(data)
})

app.post('/api/radio/sessions/:id/next', async (req, res) => {
  const me = await getUserFromToken(req)
  if (!me) return res.status(401).json({ error: 'Nicht eingeloggt' })
  const { data: s } = await sb.from('radio_sessions').select('*').eq('id', req.params.id).single()
  if (!s || s.host_id !== me.id) return res.status(403).json({ error: 'Nur der Host kann skippen' })
  const queue        = s.queue || []
  const current_song = queue.length > 0 ? queue[0] : s.current_song
  const newQueue     = queue.length > 0 ? queue.slice(1) : []
  const song_started_at = new Date().toISOString()
  const { data } = await sb.from('radio_sessions').update({ current_song, queue: newQueue, votes: [], song_started_at, updated_at: song_started_at }).eq('id', req.params.id).select().single()
  res.json(data)
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => console.log(`🎵 NyuJam server running on port ${PORT}`))