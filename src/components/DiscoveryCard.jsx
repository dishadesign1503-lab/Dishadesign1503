import { LANDMARKS } from '../lib/landmarks.js'
import { Badge } from './HuntSection.jsx'

// The celebratory card when a landmark is discovered: name, category, lore and progress.
// It is see-through, so the map stays visible behind it.

export default function DiscoveryCard({ landmark, count, ordered, more, onNext, onClose }) {
  if (!landmark) return null
  return (
    <div className="discovery" role="alert" style={{ '--c': landmark.color }}>
      <button className="close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} style={{ '--i': i, '--k': LANDMARKS[i % LANDMARKS.length].color }} />
        ))}
      </div>
      <p className="discovery-kicker">
        <span className="check">✓</span> Discovered!
      </p>
      <h2>{landmark.name}</h2>
      <Badge category={landmark.category} />
      <p className="discovery-sub">You have encountered the history of Weimar.</p>
      <p className="discovery-lore">{landmark.lore}</p>
      <p className="discovery-progress">
        Landmark {count} of {LANDMARKS.length} Discovered
      </p>
      <button className="next-clue" onClick={ordered ? onNext : onClose}>
        {ordered ? (count < LANDMARKS.length ? 'Unlock the next clue →' : 'Finish the hunt →') : more ? 'Next discovery →' : 'Keep exploring →'}
      </button>
    </div>
  )
}
