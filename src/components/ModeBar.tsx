import { GRADES } from '../lib/srs';
import type { Grade } from '../lib/srs';
import { ObjectMenuIcon } from '../themes/ObjectMenuIcon';
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
          This museum has no memory objects yet. Switch to Build mode to place some.
        </div>
      </div>
    );
  }

  return (
    <div className="modebar fade-in">
      <div className="modebar-header row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {mode === 'walk' ? 'Walk-through' : 'Review'} · {roomName}
        </span>
        <span className="muted" style={{ fontSize: 12 }}>
          {index + 1} / {total}
        </span>
      </div>

      <div className="modebar-content row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <span style={{ lineHeight: 0, marginTop: 2 }}>
          {obj && <ObjectMenuIcon kind={obj.kind} size={30} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
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

      <button className="modebar-prev" type="button" onClick={onPrev} disabled={index === 0}>
        ← Prev
      </button>

      {mode === 'review' && (
        <div className="modebar-center">
          {!revealed ? (
            <button className="primary modebar-center-action" type="button" onClick={onReveal}>
              Reveal answer
            </button>
          ) : (
            <span className="muted modebar-center-hint" style={{ fontSize: 12 }}>
              How well did you recall it?
            </span>
          )}
        </div>
      )}

      <button
        className="modebar-next"
        type="button"
        onClick={onNext}
        disabled={index >= total - 1 && mode === 'walk'}
      >
        Next →
      </button>

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
