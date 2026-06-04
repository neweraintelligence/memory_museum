import { useStore } from '../state/useStore';
import { ROOM_STYLES, ROOM_TYPES } from '../themes/styles';
import type { Room } from '../types';

export default function RoomStylePanel({ room }: { room: Room }) {
  const updateRoom = useStore((s) => s.updateRoom);

  return (
    <div>
      <div className="field">
        <label>Room name</label>
        <input
          value={room.name}
          onChange={(e) => updateRoom(room.id, { name: e.target.value })}
        />
      </div>

      <div className="field">
        <label>Room type</label>
        <select value={room.type} onChange={(e) => updateRoom(room.id, { type: e.target.value })}>
          {ROOM_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Room size</label>
        <div className="row">
          <select
            value={room.gridW}
            onChange={(e) => updateRoom(room.id, { gridW: Number(e.target.value) })}
          >
            {[4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                W {n}
              </option>
            ))}
          </select>
          <select
            value={room.gridH}
            onChange={(e) => updateRoom(room.id, { gridH: Number(e.target.value) })}
          >
            {[4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                H {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Architectural style</label>
        <div className="style-grid">
          {ROOM_STYLES.map((st) => (
            <div
              key={st.id}
              className={`style-chip ${room.style === st.id ? 'active' : ''}`}
              onClick={() => updateRoom(room.id, { style: st.id })}
              title={st.mood}
            >
              <div className="row" style={{ gap: 4 }}>
                <div className="swatch" style={{ flex: 1, background: st.floorA }} />
                <div className="swatch" style={{ flex: 1, background: st.wallRight }} />
                <div className="swatch" style={{ flex: 1, background: st.accent }} />
              </div>
              {st.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
