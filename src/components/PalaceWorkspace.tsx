import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { useUI } from '../state/useUI';
import RoomCanvas from '../render/RoomCanvas';
import ObjectLibrary from './ObjectLibrary';
import RoomStylePanel from './RoomStylePanel';
import MemoryEditor from './MemoryEditor';
import MapView from './MapView';
import ModeBar from './ModeBar';
import { roomTypeIcon } from '../themes/styles';
import type { Grade } from '../lib/srs';

export default function PalaceWorkspace() {
  const { palaceId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const palace = useStore((s) => s.palaces.find((p) => p.id === palaceId && !p.deleted));
  const allRooms = useStore((s) => s.rooms);
  const allObjects = useStore((s) => s.objects);
  const allMemories = useStore((s) => s.memories);

  const rooms = useMemo(
    () =>
      allRooms
        .filter((r) => r.palaceId === palaceId && !r.deleted)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [allRooms, palaceId],
  );
  const createRoom = useStore((s) => s.createRoom);
  const deleteRoom = useStore((s) => s.deleteRoom);
  const duplicateRoom = useStore((s) => s.duplicateRoom);
  const addObject = useStore((s) => s.addObject);
  const updateObject = useStore((s) => s.updateObject);
  const gradeMemory = useStore((s) => s.gradeMemory);

  const mode = useUI((s) => s.mode);
  const setMode = useUI((s) => s.setMode);
  const placingKind = useUI((s) => s.placingKind);
  const setPlacingKind = useUI((s) => s.setPlacingKind);
  const selectedId = useUI((s) => s.selectedObjectId);
  const setSelected = useUI((s) => s.setSelected);

  const [view, setView] = useState<'room' | 'map'>('room');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Ensure a current room is selected.
  useEffect(() => {
    if (rooms.length === 0) {
      setCurrentRoomId(null);
      return;
    }
    if (!currentRoomId || !rooms.find((r) => r.id === currentRoomId)) {
      setCurrentRoomId(rooms[0].id);
    }
  }, [rooms, currentRoomId]);

  // Handle deep-links from search (?room=..&obj=..).
  useEffect(() => {
    const roomParam = searchParams.get('room');
    const objParam = searchParams.get('obj');
    if (roomParam) {
      setCurrentRoomId(roomParam);
      setView('room');
      if (objParam) {
        setMode('build');
        setSelected(objParam);
      }
      const next = new URLSearchParams(searchParams);
      next.delete('room');
      next.delete('obj');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Build the spatial walk/review sequence.
  const sequence = useMemo(() => {
    const seq: { roomId: string; objectId: string }[] = [];
    for (const r of rooms) {
      const objs = allObjects
        .filter((o) => o.roomId === r.id && !o.deleted)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      for (const o of objs) seq.push({ roomId: r.id, objectId: o.id });
    }
    return seq;
  }, [rooms, allObjects]);

  // When switching into walk/review, reset to the start.
  useEffect(() => {
    if (mode === 'walk' || mode === 'review') {
      setStepIndex(0);
      setRevealed(false);
      setView('room');
      setSelected(null);
      if (sequence[0]) setCurrentRoomId(sequence[0].roomId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const goToStep = (i: number) => {
    const clamped = Math.max(0, Math.min(sequence.length - 1, i));
    setStepIndex(clamped);
    setRevealed(false);
    const step = sequence[clamped];
    if (step) setCurrentRoomId(step.roomId);
  };

  // Keyboard navigation for walk/review.
  useEffect(() => {
    if (mode === 'build') return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') goToStep(stepIndex + 1);
      if (e.key === 'ArrowLeft') goToStep(stepIndex - 1);
      if (e.key === ' ' && mode === 'review') {
        e.preventDefault();
        setRevealed((r) => !r);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stepIndex, sequence.length]);

  // Esc cancels placing / deselects.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (placingKind) setPlacingKind(null);
        else if (selectedId) setSelected(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [placingKind, selectedId, setPlacingKind, setSelected]);

  if (!palace) {
    return (
      <div className="page">
        <div className="empty">
          Palace not found. <a onClick={() => navigate('/')}>Back to dashboard</a>
        </div>
      </div>
    );
  }

  const currentRoom = rooms.find((r) => r.id === currentRoomId) ?? null;
  const roomObjects = currentRoom
    ? allObjects.filter((o) => o.roomId === currentRoom.id && !o.deleted)
    : [];
  const roomMemories = allMemories.filter((m) =>
    roomObjects.some((o) => o.id === m.objectId),
  );
  const selectedObject = roomObjects.find((o) => o.id === selectedId) ?? null;

  const step = sequence[stepIndex] ?? null;
  const highlightId = mode !== 'build' && step ? step.objectId : null;
  const stepObject = step ? allObjects.find((o) => o.id === step.objectId) ?? null : null;
  const stepMemory = step
    ? allMemories.find((m) => m.objectId === step.objectId) ?? null
    : null;
  const stepRoom = step ? rooms.find((r) => r.id === step.roomId) : null;

  const handlePlace = (gx: number, gy: number) => {
    if (!currentRoom || !placingKind) return;
    const obj = addObject(currentRoom.id, placingKind, gx, gy);
    setPlacingKind(null);
    setSelected(obj.id);
    setMode('build');
  };

  const handleGrade = (g: Grade) => {
    if (stepMemory) gradeMemory(stepMemory.id, g);
    setTimeout(() => goToStep(stepIndex + 1), 180);
  };

  return (
    <div className="content">
      {/* Left sidebar */}
      <div className="side left">
        <div className="side-head">
          <span style={{ fontSize: 18 }}>🏛️</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {palace.name}
          </span>
        </div>
        <div className="side-body">
          <button
            className={view === 'map' ? 'primary' : ''}
            style={{ width: '100%', marginBottom: 12 }}
            onClick={() => setView('map')}
          >
            🗺️ Overview Map
          </button>

          <div className="section-title" style={{ marginTop: 0 }}>
            Rooms ({rooms.length})
          </div>
          {rooms.map((r) => (
            <div
              key={r.id}
              className={`room-list-item ${view === 'room' && currentRoomId === r.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentRoomId(r.id);
                setView('room');
                setSelected(null);
              }}
            >
              <span>{roomTypeIcon(r.type)}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              {currentRoomId === r.id && mode === 'build' && (
                <>
                  <button
                    className="icon-btn ghost"
                    title="Duplicate"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nr = duplicateRoom(r.id);
                      if (nr) setCurrentRoomId(nr.id);
                    }}
                  >
                    ⧉
                  </button>
                  <button
                    className="icon-btn ghost"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete room "${r.name}"?`)) deleteRoom(r.id);
                    }}
                  >
                    🗑
                  </button>
                </>
              )}
            </div>
          ))}

          <button
            style={{ width: '100%', marginTop: 12 }}
            onClick={() => {
              const nr = createRoom(palaceId);
              setCurrentRoomId(nr.id);
              setView('room');
            }}
          >
            + Add room
          </button>
        </div>
      </div>

      {/* Center */}
      {view === 'map' ? (
        <MapView
          palaceId={palaceId}
          onEnterRoom={(roomId) => {
            setCurrentRoomId(roomId);
            setView('room');
          }}
        />
      ) : currentRoom ? (
        <div className="canvas-wrap fade-in" key={`room-${currentRoom.id}`}>
          <div className="canvas-overlay">
            <span className="pill">
              {roomTypeIcon(currentRoom.type)} {currentRoom.name}
            </span>
            {mode === 'build' && (
              <span className="pill muted">{roomObjects.length} objects</span>
            )}
          </div>

          <RoomCanvas
            key={currentRoom.id}
            room={currentRoom}
            objects={roomObjects}
            memories={roomMemories}
            mode={mode}
            placingKind={placingKind}
            selectedId={selectedId}
            highlightId={highlightId}
            focusHighlight={mode !== 'build'}
            onSelect={(id) => {
              if (mode === 'build') setSelected(id);
            }}
            onPlace={handlePlace}
            onMove={(id, gx, gy) => updateObject(id, { gridX: gx, gridY: gy })}
          />

          {(mode === 'walk' || mode === 'review') && (
            <ModeBar
              mode={mode}
              roomName={stepRoom?.name ?? currentRoom.name}
              obj={stepObject}
              memory={stepMemory}
              index={stepIndex}
              total={sequence.length}
              revealed={revealed}
              onPrev={() => goToStep(stepIndex - 1)}
              onNext={() => goToStep(stepIndex + 1)}
              onReveal={() => setRevealed(true)}
              onGrade={handleGrade}
            />
          )}
        </div>
      ) : (
        <div className="canvas-wrap">
          <div className="empty" style={{ position: 'absolute', inset: 0 }}>
            No rooms yet. Add one from the left to start building.
          </div>
        </div>
      )}

      {/* Right inspector (build mode only) */}
      {view === 'room' && mode === 'build' && currentRoom && (
        <div className="side">
          {selectedObject ? (
            <>
              <div className="side-head">🧷 Memory Anchor</div>
              <div className="side-body">
                <MemoryEditor obj={selectedObject} />
              </div>
            </>
          ) : (
            <>
              <div className="side-head">🎨 Build</div>
              <div className="side-body">
                <div className="section-title" style={{ marginTop: 0 }}>
                  Object Library
                </div>
                <ObjectLibrary />
                <div className="section-title">Room Customization</div>
                <RoomStylePanel room={currentRoom} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
