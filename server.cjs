
const express = require('express')
const path = require('path')
const fs = require('fs')
const { open } = require('sqlite')
const sqlite3 = require('sqlite3')
const cors = require('cors')

const PORT = process.env.PORT || 4000
const FRONTEND_DIR_VITE = path.join(__dirname, 'frontend', 'dist') // Vite build output
const FRONTEND_DIR_CRA = path.join(__dirname, 'frontend', 'build') // CRA build output

async function start() {
  // open sqlite database (file-based)
  const db = await open({
    filename: path.join(__dirname, 'survey.db'),
    driver: sqlite3.Database,
  })

  // create tables if not exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id TEXT NOT NULL,
      answers JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const app = express()
  app.use(cors()) // safe for local dev; remove or restrict origin in production
  app.use(express.json({ limit: '1mb' }))

  // Example survey schema — keep in sync with your SurveyWizard.tsx schema if you want
  const SURVEY = {
    id: 'demo_survey',
    title: 'Quick Health & Lifestyle Survey',
    description: 'A few short questions. Progress saves as you navigate.',
    questions: [
      { id: 'q_name', title: "What's your full name?", description: 'Please type your name as you would like it to appear.', type: 'text', required: true },
      { id: 'q_age', title: "What's your age?", type: 'number', required: true },
      { id: 'q_activity', title: 'Which activities do you do regularly?', type: 'checkbox', options: ['Walking', 'Running', 'Swimming', 'Cycling', 'Gym'] },
      { id: 'q_smoke', title: 'Do you smoke?', type: 'radio', options: ['No', 'Occasionally', 'Regularly'], required: true },
      { id: 'q_notes', title: 'Anything else you want to share?', description: 'Optional — e.g., health conditions, preferences.', type: 'textarea' },
    ],
  }

  // GET /api/survey -> return survey schema
  app.get('/api/survey', (req, res) => {
    res.json(SURVEY)
  })

  // POST /api/submit -> save a submission
  // Body: { surveyId: string, answers: object }
  app.post('/api/submit', async (req, res) => {
    try {
      const { surveyId, answers } = req.body
      if (!surveyId || answers === undefined) {
        return res.status(400).json({ error: 'surveyId and answers are required' })
      }

      // store answers JSON as string (sqlite supports JSON functions)
      const result = await db.run(
        `INSERT INTO responses (survey_id, answers) VALUES (?, ?)`,
        [surveyId, JSON.stringify(answers)]
      )

      const insertedId = result.lastID
      const row = await db.get(`SELECT id, survey_id, answers, created_at FROM responses WHERE id = ?`, [insertedId])

      // parse answers back to object before sending
      if (row && row.answers) row.answers = JSON.parse(row.answers)

      res.json({ ok: true, data: row })
    } catch (err) {
      console.error('submit error', err)
      res.status(500).json({ error: 'server error' })
    }
  })

  // GET /api/responses -> list stored responses (all)
  // For privacy you may want to add filters later
  app.get('/api/responses', async (req, res) => {
    try {
      const rows = await db.all(`SELECT id, survey_id, answers, created_at FROM responses ORDER BY created_at DESC`)
      // parse answers JSON strings into objects
      const parsed = rows.map((r) => ({ ...r, answers: r.answers ? JSON.parse(r.answers) : null }))
      res.json(parsed)
    } catch (err) {
      console.error('responses error', err)
      res.status(500).json({ error: 'server error' })
    }
  })

  // Serve frontend static build if present
  const frontendDir = fs.existsSync(FRONTEND_DIR_VITE) ? FRONTEND_DIR_VITE : (fs.existsSync(FRONTEND_DIR_CRA) ? FRONTEND_DIR_CRA : null)
  if (frontendDir) {
    console.log('Serving frontend from', frontendDir)
    app.use(express.static(frontendDir))
    // fallback to index.html for SPA routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendDir, 'index.html'))
    })
  } else {
    // No built frontend — show simple info page
    app.get('/', (req, res) => {
      res.send(`<h2>Survey backend is running.</h2>
        <p>No frontend build detected. Build your frontend into <code>frontend/dist</code> (Vite) or <code>frontend/build</code> (CRA) and restart this server.</p>
        <p>API endpoints: <code>/api/survey</code>, <code>/api/submit</code>, <code>/api/responses</code></p>`)
    })
  }

  app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Fatal error starting server', err)
  process.exit(1)
})
