/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './index.css'

// --- Types ---
type QType = 'text' | 'number' | 'radio' | 'textarea' | 'checkbox'

type Question = {
  id: string
  title: string
  description?: string
  type: QType
  required?: boolean
  options?: string[]
}

// --- Example survey schema ---
const SURVEY: { id: string; title: string; description?: string; questions: Question[] } = {
  id: 'demo_survey',
  title: 'Quick Health & Lifestyle Survey',
  description: 'A few short questions. Progress saves as you navigate.',
  questions: [
    {
      id: 'q_name',
      title: "What's your full name?",
      description: 'Please type your name as you would like it to appear.',
      type: 'text',
      required: true,
    },
    {
      id: 'q_age',
      title: "What's your age?",
      type: 'number',
      required: true,
    },
    {
      id: 'q_activity',
      title: 'Which activities do you do regularly?',
      type: 'checkbox',
      options: ['Walking', 'Running', 'Swimming', 'Cycling', 'Gym'],
    },
    {
      id: 'q_smoke',
      title: 'Do you smoke?',
      type: 'radio',
      options: ['No', 'Occasionally', 'Regularly'],
      required: true,
    },
    {
      id: 'q_notes',
      title: 'Anything else you want to share?',
      description: 'Optional — e.g., health conditions, preferences.',
      type: 'textarea',
    },
  ],
}

// --- Progress calculation ---
const calcProgress = (index: number, total: number) =>
  Math.round(((index + 1) / total) * 100)

// --- ProgressBar ---
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-full h-2 overflow-hidden border rounded-full bg-white/30 border-white/10">
      <div
        className="h-full transition-all rounded-full shadow-sm"
        style={{
          width: progress + '%',
          background: 'linear-gradient(90deg,#7c3aed,#06b6d4)',
        }}
      />
    </div>
  )
}

// --- QuestionRenderer ---
const QuestionRenderer: React.FC<{
  q: Question
  value: any
  onChange: (val: any) => void
}> = ({ q, value, onChange }) => {
  if (q.type === 'text' || q.type === 'number') {
    return (
      <input
        value={value ?? ''}
        onChange={(e) =>
          onChange(
            q.type === 'number'
              ? e.target.value === ''
                ? ''
                : Number(e.target.value)
              : e.target.value
          )
        }
        className="w-full p-3 border outline-none bg-white/5 backdrop-blur-sm placeholder:text-white/60 border-white/10 rounded-xl focus:ring-2 focus:ring-white/20"
        type={q.type === 'number' ? 'number' : 'text'}
        placeholder={q.description ?? q.title}
      />
    )
  }

  if (q.type === 'textarea') {
    return (
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border outline-none bg-white/5 backdrop-blur-sm placeholder:text-white/60 border-white/10 rounded-xl focus:ring-2 focus:ring-white/20"
        rows={4}
        placeholder={q.description}
      />
    )
  }

  if (q.type === 'radio') {
    return (
      <div className="grid gap-3">
        {q.options?.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-shadow hover:shadow-md ${
              value === opt ? 'bg-white/6' : 'bg-white/3'
            }`}
          >
            <input
              type="radio"
              name={q.id}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="w-4 h-4"
            />
            <span className="select-none">{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (q.type === 'checkbox') {
    return (
      <div className="grid gap-3">
        {q.options?.map((opt) => {
          const checked = Array.isArray(value) && value.includes(opt)
          return (
            <label
              key={opt}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-shadow hover:shadow-md ${
                checked ? 'bg-white/6' : 'bg-white/3'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const set = new Set(Array.isArray(value) ? value : [])
                  if (set.has(opt)) set.delete(opt)
                  else set.add(opt)
                  onChange(Array.from(set))
                }}
                className="w-4 h-4"
              />
              <span className="select-none">{opt}</span>
            </label>
          )
        })}
      </div>
    )
  }

  return null
}

// --- PreviewItem ---
const PreviewItem: React.FC<{
  title: string
  value: any
  onEdit: () => void
}> = ({ title, value, onEdit }) => {
  const display = useMemo(() => {
    if (value === undefined || value === null || value === '') return '—'
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }, [value])

  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white/4">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-1 text-xs text-white/70">{display}</div>
      </div>
      <div>
        <button onClick={onEdit} className="text-xs underline">
          Edit
        </button>
      </div>
    </div>
  )
}

// --- SurveyWizard ---
export default function SurveyWizard() {
  const questions = SURVEY.questions
  const total = questions.length

  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const obj: Record<string, any> = {}
    for (const q of questions) {
      if (q.type === 'checkbox') obj[q.id] = []
      else obj[q.id] = ''
    }
    return obj
  })

  const [index, setIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const q = questions[index]
  const progress = calcProgress(index, total)

  const setAnswer = (qid: string, value: any) => {
    setAnswers((s) => ({ ...s, [qid]: value }))
  }

  const canProceed = (qi: Question) => {
    if (!qi.required) return true
    const v = answers[qi.id]
    if (v === undefined || v === null) return false
    if (typeof v === 'string') return v.trim() !== ''
    if (Array.isArray(v)) return v.length > 0
    return true
  }

  const handleNext = () => {
    setError(null)
    if (!canProceed(q)) return setError('This question is required.')
    if (index < total - 1) setIndex((i) => i + 1)
    else setShowPreview(true)
  }

  const handlePrev = () => {
    setError(null)
    if (index > 0) setIndex((i) => i - 1)
  }

  const goToQuestion = (i: number) => {
    setShowPreview(false)
    setIndex(i)
  }

  const handleSubmit = async () => {
  // validation unchanged
  for (const qq of questions) {
    if (qq.required && !canProceed(qq)) {
      setShowPreview(false)
      setIndex(questions.indexOf(qq))
      setError('Please complete required fields.')
      return
    }
  }

  try {
    setError(null)
    const resp = await fetch('/api/submit', { // same-origin when server serves static build
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surveyId: SURVEY.id, answers })
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error || 'Submit failed')
    console.log('Saved:', data)
    alert('Survey submitted! ✅')
    // optionally reset
    // setAnswers(initialState...)
  } catch (err: any) {
    console.error('submit failed', err)
    setError(err.message || 'Submission failed')
  }
}


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNext()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6 text-white bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="w-full max-w-2xl mx-auto">
        <div className="p-8 border shadow-xl rounded-3xl bg-white/6 backdrop-blur-md border-white/10">
          {/* Header */}
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{SURVEY.title}</h1>
              <p className="mt-1 text-sm text-white/70">{SURVEY.description}</p>
            </div>
            <div className="w-40">
              <div className="mb-2 text-xs text-right text-white/70">Progress</div>
              <ProgressBar progress={progress} />
              <div className="mt-2 text-xs text-right text-white/60">{progress}%</div>
            </div>
          </div>

          {/* Card area */}
          <div>
            <AnimatePresence mode="wait">
              {!showPreview ? (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.28 }}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">{q.title}</h2>
                        {q.description && (
                          <p className="mt-1 text-sm text-white/70">
                            {q.description}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-white/60">
                        Step {index + 1} of {total}
                      </div>
                    </div>
                  </div>

                  <div onKeyDown={handleKeyDown}>
                    <QuestionRenderer
                      q={q}
                      value={answers[q.id]}
                      onChange={(v) => setAnswer(q.id, v)}
                    />

                    {error && (
                      <div className="mt-3 text-xs text-rose-300">{error}</div>
                    )}

                    <div className="flex items-center justify-between mt-6">
                      <button
                        onClick={handlePrev}
                        disabled={index === 0}
                        className={`px-4 py-2 rounded-xl text-sm border ${
                          index === 0 ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      >
                        ← Previous
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowPreview(true)}
                          className="px-3 py-2 text-sm border rounded-xl"
                        >
                          Preview
                        </button>
                        <button
                          onClick={handleNext}
                          className="px-4 py-2 text-sm font-semibold text-black rounded-xl bg-gradient-to-r from-violet-600 to-cyan-400"
                        >
                          {index < total - 1
                            ? 'Next →'
                            : 'Review & Submit'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={'preview'}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.28 }}
                >
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">
                          Preview your answers
                        </h2>
                        <p className="mt-1 text-sm text-white/70">
                          Review before you submit. Click Edit to jump back to
                          a question.
                        </p>
                      </div>
                      <div className="text-sm text-white/60">
                        {Object.values(answers).filter(Boolean).length} answered
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 mb-4">
                    {questions.map((qq, i) => (
                      <PreviewItem
                        key={qq.id}
                        title={qq.title}
                        value={answers[qq.id]}
                        onEdit={() => goToQuestion(i)}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <button
                      onClick={() => setShowPreview(false)}
                      className="px-4 py-2 text-sm border rounded-xl"
                    >
                      Back to questions
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setIndex(Math.max(0, total - 1))
                          setShowPreview(false)
                        }}
                        className="px-3 py-2 text-sm border rounded-xl"
                      >
                        Edit last
                      </button>
                      <button
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm font-semibold text-black rounded-xl bg-gradient-to-r from-green-400 to-emerald-500"
                      >
                        Submit survey
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer quick jump */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-white/70">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => {
                setIndex(i)
                setShowPreview(false)
              }}
              className={`px-2 py-1 rounded-md ${
                i === index && !showPreview ? 'bg-white/8' : 'bg-white/4'
              } hover:bg-white/10`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
