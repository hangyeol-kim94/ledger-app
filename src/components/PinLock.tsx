import { useState } from 'react'
import { CORRECT_PIN, setPinUnlocked } from '../lib/pin'

export default function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)

  function press(digit: string) {
    if (input.length >= 4) return
    const next = input + digit
    setInput(next)
    if (next.length === 4) {
      if (next === CORRECT_PIN) {
        setPinUnlocked()
        onUnlock()
      } else {
        setShake(true)
        setTimeout(() => {
          setInput('')
          setShake(false)
        }, 600)
      }
    }
  }

  function del() {
    setInput(v => v.slice(0, -1))
  }

  const dots = Array.from({ length: 4 }, (_, i) => i < input.length)

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.icon}>🔒</div>
        <p style={styles.title}>PIN 입력</p>
        <p style={styles.sub}>4자리 PIN을 입력하세요</p>

        <div style={{ ...styles.dots, animation: shake ? 'shake 0.5s ease' : 'none' }}>
          {dots.map((filled, i) => (
            <div key={i} style={{ ...styles.dot, background: filled ? 'var(--primary)' : 'var(--border)' }} />
          ))}
        </div>

        <div style={styles.pad}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            <button
              key={i}
              style={{ ...styles.key, opacity: k === '' ? 0 : 1, cursor: k === '' ? 'default' : 'pointer' }}
              onClick={() => k === '⌫' ? del() : k !== '' ? press(k) : undefined}
              disabled={k === ''}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)',
    zIndex: 9999,
  },
  card: {
    background: 'var(--card)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-lg)',
    padding: '40px 32px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    width: '100%', maxWidth: '340px',
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  sub: { fontSize: 14, color: 'var(--muted)', marginBottom: 32 },
  dots: {
    display: 'flex', gap: 16, marginBottom: 36,
  },
  dot: {
    width: 14, height: 14, borderRadius: '50%',
    transition: 'background 0.15s',
  },
  pad: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12, width: '100%',
  },
  key: {
    background: 'var(--bg)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 22, fontWeight: 600,
    color: 'var(--text)',
    padding: '18px 0',
    transition: 'background 0.1s, transform 0.1s',
  },
}
