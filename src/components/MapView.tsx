import { useMemo, useRef, useState } from 'react';
import { useStore } from '../state/useStore';
import { getStyle } from '../themes/styles';
import { Icon } from '../themes/Icon';
import { roomIcon, UI_ICONS } from '../themes/icons';

const NODE_W = 150;
const NODE_H = 78;

function rectEdgePoint(
  cx: number,
  cy: number,
  w: number,
  h: number,
  tx: number,
  ty: number,
) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const halfW = w / 2;
  const halfH = h / 2;
  const t = Math.min(
    dx !== 0 ? halfW / Math.abs(dx) : Infinity,
    dy !== 0 ? halfH / Math.abs(dy) : Infinity,
  );
  return { x: cx + dx * t, y: cy + dy * t };
}

function connectionLine(
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const acx = ax + NODE_W / 2;
  const acy = ay + NODE_H / 2;
  const bcx = bx + NODE_W / 2;
  const bcy = by + NODE_H / 2;
  const start = rectEdgePoint(acx, acy, NODE_W, NODE_H, bcx, bcy);
  const end = rectEdgePoint(bcx, bcy, NODE_W, NODE_H, acx, acy);
  return { start, end };
}

export default function MapView({
  palaceId,
  onEnterRoom,
}: {
  palaceId: string;
  onEnterRoom: (roomId: string) => void;
}) {
  const allRooms = useStore((s) => s.rooms);
  const allConnections = useStore((s) => s.connections);
  const objects = useStore((s) => s.objects);

  const rooms = useMemo(
    () => allRooms.filter((r) => r.palaceId === palaceId && !r.deleted),
    [allRooms, palaceId],
  );
  const connections = useMemo(
    () => allConnections.filter((c) => c.palaceId === palaceId && !c.deleted),
    [allConnections, palaceId],
  );
  const updateRoom = useStore((s) => s.updateRoom);
  const toggleConnection = useStore((s) => s.toggleConnection);
  const createRoom = useStore((s) => s.createRoom);

  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const roomById = (id: string) => rooms.find((r) => r.id === id);
  const objectCount = (roomId: string) =>
    objects.filter((o) => o.roomId === roomId && !o.deleted).length;

  const onPointerDown = (e: React.PointerEvent, roomId: string) => {
    const room = roomById(roomId);
    if (!room) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { id: roomId, dx: e.clientX - room.mapX, dy: e.clientY - room.mapY, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current.moved = true;
    const { id, dx, dy } = dragRef.current;
    updateRoom(id, { mapX: Math.max(0, e.clientX - dx), mapY: Math.max(0, e.clientY - dy) });
  };

  const onPointerUp = () => {
    if (dragRef.current?.moved) suppressClickRef.current = true;
    dragRef.current = null;
  };

  const handleNodeClick = (roomId: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (connectFrom) {
      if (connectFrom === '__pick__') {
        setConnectFrom(roomId);
      } else {
        if (connectFrom !== roomId) toggleConnection(palaceId, connectFrom, roomId);
        setConnectFrom(null);
      }
    } else {
      onEnterRoom(roomId);
    }
  };

  return (
    <div className="canvas-wrap" style={{ background: 'var(--bg)' }}>
      <div className="canvas-overlay">
        <span className="pill row" style={{ gap: 6 }}>
          <Icon icon={UI_ICONS.map} size={15} /> Overview Map
        </span>
        <button
          className={connectFrom ? 'primary' : ''}
          onClick={() => setConnectFrom(connectFrom ? null : '__pick__')}
        >
          {connectFrom ? (
            'Pick rooms to connect…'
          ) : (
            <>
              <Icon icon={UI_ICONS.connect} size={15} /> Connect rooms
            </>
          )}
        </button>
        <button onClick={() => createRoom(palaceId)}>
          <Icon icon={UI_ICONS.add} size={15} /> Add room
        </button>
        <span className="pill muted">
          {connectFrom ? 'Click two rooms to connect' : 'Drag rooms · click to enter'}
        </span>
      </div>

      <div
        style={{ position: 'absolute', inset: 0, overflow: 'auto' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <svg
          className="map-connections"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {connections.map((c) => {
            const a = roomById(c.fromRoomId);
            const b = roomById(c.toRoomId);
            if (!a || !b) return null;
            const { start, end } = connectionLine(a.mapX, a.mapY, b.mapX, b.mapY);
            return (
              <line
                key={c.id}
                className="map-connection-line"
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="var(--map-connection-stroke, #3a4470)"
                strokeWidth={3}
                strokeDasharray="2 6"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {rooms.map((r) => {
          const style = getStyle(r.style);
          const picking = connectFrom && connectFrom !== '__pick__';
          const isConnected = connections.some((c) => c.fromRoomId === r.id || c.toRoomId === r.id);
          
          return (
            <div
              key={r.id}
              className={`card map-room-card ${picking ? 'picking' : ''} ${isConnected ? 'connected' : 'unconnected'}`}
              style={{
                position: 'absolute',
                left: r.mapX,
                top: r.mapY,
                width: NODE_W,
                minHeight: NODE_H,
                padding: 12,
                cursor: 'grab',
                userSelect: 'none',
                zIndex: 1,
                borderColor: connectFrom === r.id ? 'var(--gold)' : undefined,
                '--room-color-1': style.wallRight,
                '--room-color-2': style.bg,
              } as React.CSSProperties}
              onPointerDown={(e) => onPointerDown(e, r.id)}
              onClick={() => handleNodeClick(r.id)}
              title={picking ? 'Click to connect' : 'Click to enter'}
            >
              <div className="map-room-icon">
                <Icon icon={roomIcon(r.type)} size={22} />
              </div>
              <div className="map-room-title">{r.name}</div>
              <div className="meta">{objectCount(r.id)} objects</div>
            </div>
          );
        })}

        {rooms.length === 0 && (
          <div className="empty" style={{ position: 'absolute', inset: 0 }}>
            No rooms yet — add one to begin.
          </div>
        )}
      </div>
    </div>
  );
}
