import { GRADES } from '../lib/srs';
import type { Grade } from '../lib/srs';
import { Icon } from '../themes/Icon';
import { objectIcon, iconTint, UI_ICONS } from '../themes/icons';
import type { PObject, Memory } from '../types';

interface Props {
  mode: 'walk' | 'review';
  roomName: string;
  obj: PObject | null;
  memory: Memory | null;
  index: number;
  total: number;
  revealed: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReveal: () => void;
  onGrade: (g: Grade) => void;
}

export default function ModeBar({
  mode,
  roomName,
  obj,
  memory,
  index,
  total,
  revealed,
  onPrev,
  onNext,
  onReveal,
  onGrade,
}: Props) {
  if (total === 0) {
    return (
      <div className="modebar fade-in">
        <div className="muted" style={{ textAlign: 'center' }}>
          This palace has no memory objects yet. Switch to Build mode to place some.
        </div>
      </div>
    );
  }

  return (
    <div className="modebar fade-in">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted row" style={{ fontSize: 12, gap: 5 }}>
          <Icon icon={mode === 'walk' ? UI_ICONS.walk : UI_ICONS.review} size={13} />
          {mode === 'walk' ? 'Walk-through' : 'Review'} · {roomName}
        </span>
        <span className="muted" style={{ fontSize: 12 }}>
          {index + 1} / {total}
        </span>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 8, alignItems: 'flex-start' }}>
        <span style={{ lineHeight: 0, marginTop: 2 }}>
          {obj && <Icon icon={objectIcon(obj.kind)} size={30} color={iconTint(obj.color)} />}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {mode === 'review' && !revealed ? (memory?.prompt || obj?.label || 'Recall this') : memory?.title || obj?.label}
          </div>

          {mode === 'walk' && (
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {memory?.prompt && <div><b>Prompt:</b> {memory.prompt}</div>}
              {memory?.answer && <div><b>Answer:</b> {memory.answer}</div>}
              {memory?.body && <div style={{ marginTop: 4 }}>{memory.body}</div>}
              {!memory?.prompt && !memory?.answer && !memory?.body && (
                <span>Empty anchor — nothing attached yet.</span>
              )}
            </div>
          )}

          {mode === 'review' && revealed && (
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {memory?.answer && <div><b>Answer:</b> {memory.answer}</div>}
              {memory?.body && <div style={{ marginTop: 4 }}>{memory.body}</div>}
              {!memory?.answer && !memory?.body && <span>(no answer recorded)</span>}
            </div>
          )}
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12, justifyContent: 'space-between' }}>
        <button onClick={onPrev} disabled={index === 0}>
          ← Prev
        </button>

        {mode === 'review' && !revealed ? (
          <button className="primary" style={{ flex: 1 }} onClick={onReveal}>
            Reveal answer
          </button>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>
            {mode === 'walk' ? 'Use ← → to move through the palace' : 'How well did you recall it?'}
          </span>
        )}

        <button onClick={onNext} disabled={index >= total - 1 && mode === 'walk'}>
          Next →
        </button>
      </div>

      {mode === 'review' && revealed && (
        <div className="grade-row">
          {GRADES.map((g) => (
            <button
              key={g.id}
              style={{ background: g.color + '22', borderColor: g.color, color: g.color }}
              onClick={() => onGrade(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
