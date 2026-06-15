import { useStore } from '../state/useStore';
import { useUI } from '../state/useUI';
import { getStyle, ROOM_STYLES, ROOM_TYPES } from '../themes/styles';
import { Icon } from '../themes/Icon';
import { roomIcon, UI_ICONS } from '../themes/icons';
import { getRoomTiles, roomTileSet } from '../lib/floor';
import { autoWallKeys } from '../lib/wallAttach';
import type { Room } from '../types';

export default function RoomStylePanel({ room }: { room: Room }) {
  const updateRoom = useStore((s) => s.updateRoom);
  const floorEditing = useUI((s) => s.floorEditing);
  const setFloorEditing = useUI((s) => s.setFloorEditing);
  const wallEditing = useUI((s) => s.wallEditing);
  const setWallEditing = useUI((s) => s.setWallEditing);

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
        <div className="row" style={{ gap: 8 }}>
          <span style={{ lineHeight: 0, color: 'var(--text-dim)' }}>
            <Icon icon={roomIcon(room.type)} size={20} className="room-type-icon" />
          </span>
          <select
            style={{ flex: 1 }}
            value={room.type}
            onChange={(e) => updateRoom(room.id, { type: e.target.value })}
          >
            {ROOM_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Floor plan</label>
        <button
          className={`edit-floor-plan-btn${floorEditing ? ' primary' : ''}`}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          onClick={() => setFloorEditing(!floorEditing)}
        >
          {floorEditing ? (
            '✓ Done editing floor'
          ) : (
            <>
              <Icon icon={UI_ICONS.puzzle} size={18} className="side-head-icon" />
              Edit floor plan
            </>
          )}
        </button>
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          Add or remove tiles to shape the room. Objects can only sit on flooring.
        </div>
      </div>

      <div className="field">
        <label>Walls</label>
        <button
          className={`edit-floor-plan-btn${wallEditing ? ' primary' : ''}`}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          onClick={() => {
            // When entering wall editing for the first time, pre-populate from auto-detected edges
            if (!wallEditing && (!room.walls || room.walls.length === 0)) {
              const tileKeys = getRoomTiles(room);
              const present = roomTileSet(room);
              const walls = autoWallKeys(tileKeys, present);
              updateRoom(room.id, { walls });
            }
            setWallEditing(!wallEditing);
          }}
        >
          {wallEditing ? (
            '✓ Done editing walls'
          ) : (
            <>
              <Icon icon={UI_ICONS.puzzle} size={18} className="side-head-icon" />
              Edit walls
            </>
          )}
        </button>
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          Add or remove walls on any tile edge. Each tile has a left (NW) and right (NE) wall face.
        </div>
      </div>

        <div className="field" style={{ opacity: (room.tiles?.length ?? 0) > 0 ? 0.5 : 1 }}>
          <label>Starter rectangle{(room.tiles?.length ?? 0) > 0 ? ' (custom floor active)' : ''}</label>
        <div className="row">
          <select
            value={room.gridW}
            disabled={(room.tiles?.length ?? 0) > 0}
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
            disabled={(room.tiles?.length ?? 0) > 0}
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
              className={`style-chip ${getStyle(room.style).id === st.id ? 'active' : ''}`}
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
