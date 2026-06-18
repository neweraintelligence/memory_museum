import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '../state/useStore';
import { useUI } from '../state/useUI';
import { useTheme } from '../state/useTheme';
import RoomCanvas from '../render/RoomCanvas';
import ObjectLibrary from './ObjectLibrary';
import RoomStylePanel from './RoomStylePanel';
import MemoryEditor from './MemoryEditor';
import MapView from './MapView';
import ModeBar from './ModeBar';
import EditorSidePanel from './EditorSidePanel';
import { useEditorPanelInsets } from '../hooks/useEditorPanelInsets';
import { getStyle, roomTypeIcon } from '../themes/styles';
import { isLightBackground } from '../lib/color';
import { Icon } from '../themes/Icon';
import { roomIcon, UI_ICONS } from '../themes/icons';
import { canPlaceObject, nextRotation } from '../lib/objectPlacement';
import type { Grade } from '../lib/srs';
import type { WallSide } from '../types';

export default function MuseumWorkspace() {
  const { museumId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const museum = useStore((s) => s.museums.find((p) => p.id === museumId && !p.deleted));
  const allRooms = useStore((s) => s.rooms);
  const allObjects = useStore((s) => s.objects);
  const allMemories = useStore((s) => s.memories);

  const rooms = useMemo(
    () =>
      allRooms
        .filter((r) => r.museumId === museumId && !r.deleted)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [allRooms, museumId],
  );
  const createRoom = useStore((s) => s.createRoom);
  const updateRoom = useStore((s) => s.updateRoom);
  const deleteRoom = useStore((s) => s.deleteRoom);
  const duplicateRoom = useStore((s) => s.duplicateRoom);
  const addObject = useStore((s) => s.addObject);
  const updateObject = useStore((s) => s.updateObject);
  const deleteObject = useStore((s) => s.deleteObject);
  const gradeMemory = useStore((s) => s.gradeMemory);
  const addFloorTile = useStore((s) => s.addFloorTile);
  const removeFloorTile = useStore((s) => s.removeFloorTile);
  const addWall = useStore((s) => s.addWall);
  const removeWall = useStore((s) => s.removeWall);

  const mode = useUI((s) => s.mode);
  const setMode = useUI((s) => s.setMode);
  const placingKind = useUI((s) => s.placingKind);
  const setPlacingKind = useUI((s) => s.setPlacingKind);
  const placingRotation = useUI((s) => s.placingRotation);
  const cyclePlacingRotation = useUI((s) => s.cyclePlacingRotation);
  const selectedId = useUI((s) => s.selectedObjectId);
  const setSelected = useUI((s) => s.setSelected);
  const floorEditing = useUI((s) => s.floorEditing);
  const setFloorEditing = useUI((s) => s.setFloorEditing);
  const wallEditing = useUI((s) => s.wallEditing);
  const xrayWalls = useUI((s) => s.xrayWalls);
  const toggleXrayWalls = useUI((s) => s.toggleXrayWalls);
  const leftPanelOpen = useUI((s) => s.leftPanelOpen);
  const rightPanelOpen = useUI((s) => s.rightPanelOpen);
  const toggleLeftPanel = useUI((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUI((s) => s.toggleRightPanel);

  const [view, setView] = useState<'room' | 'map'>('room');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [renamingRoomId, setRenamingRoomId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const commitRoomRename = (roomId: string) => {
    const trimmed = renameDraft.trim();
    if (trimmed) updateRoom(roomId, { name: trimmed });
    setRenamingRoomId(null);
  };

  const startRoomRename = (roomId: string, name: string) => {
    setRenamingRoomId(roomId);
    setRenameDraft(name);
  };

  // On mobile, start with side panels collapsed so the canvas stays usable.
  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    const { leftPanelOpen, rightPanelOpen, toggleLeftPanel, toggleRightPanel } =
      useUI.getState();
    if (leftPanelOpen) toggleLeftPanel();
    if (rightPanelOpen) toggleRightPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [museumId]);

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

  // Leave floor-edit mode whenever the active room changes.
  useEffect(() => {
    setFloorEditing(false);
  }, [currentRoomId, setFloorEditing]);

  useEffect(() => {
    if (renamingRoomId) renameInputRef.current?.select();
  }, [renamingRoomId]);

  useEffect(() => {
    if (mode !== 'build') setRenamingRoomId(null);
  }, [mode]);

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

  const currentRoom = useMemo(
    () => rooms.find((r) => r.id === currentRoomId) ?? null,
    [rooms, currentRoomId],
  );
  const roomObjects = useMemo(
    () =>
      currentRoom
        ? allObjects.filter((o) => o.roomId === currentRoom.id && !o.deleted)
        : [],
    [currentRoom, allObjects],
  );

  // Neighbouring rooms shown as faded snapshots beside the current one.
  // SW = previous room in order, SE = next. They needn't be directly connected.
  const neighbors = useMemo(() => {
    if (!currentRoom || rooms.length < 2) return { sw: null, se: null };
    const idx = rooms.findIndex((r) => r.id === currentRoom.id);
    if (idx < 0) return { sw: null, se: null };
    const len = rooms.length;
    const se = rooms[(idx + 1) % len];
    const prev = rooms[(idx - 1 + len) % len];
    // With only two rooms, prev === next; show it once on the SE side only.
    const sw = prev.id === se.id ? null : prev;
    return { sw, se };
  }, [rooms, currentRoom]);

  const objectsByRoom = useMemo(() => {
    const map = new Map<string, typeof allObjects>();
    for (const o of allObjects) {
      if (o.deleted) continue;
      const arr = map.get(o.roomId);
      if (arr) arr.push(o);
      else map.set(o.roomId, [o]);
    }
    return map;
  }, [allObjects]);

  // Esc cancels placing / floor editing / deselects. R rotates while placing or when selected. Delete removes selection.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (placingKind) setPlacingKind(null);
        else if (floorEditing) setFloorEditing(false);
        else if (wallEditing) useUI.getState().setWallEditing(false);
        else if (selectedId) setSelected(null);
      }
      if (e.key === 'Delete') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (mode !== 'build' || !selectedId) return;
        e.preventDefault();
        deleteObject(selectedId);
        setSelected(null);
      }
      if (e.key === 'r' || e.key === 'R') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (mode !== 'build') return;
        if (placingKind) {
          e.preventDefault();
          cyclePlacingRotation();
        } else if (selectedId && currentRoom) {
          const obj = roomObjects.find((o) => o.id === selectedId);
          if (!obj || obj.wallSide) return;
          e.preventDefault();
          const rot = nextRotation(obj.rotation);
          if (
            canPlaceObject(
              currentRoom,
              roomObjects,
              obj.kind,
              obj.gridX,
              obj.gridY,
              rot,
              null,
              obj.id,
            )
          ) {
            updateObject(obj.id, { rotation: rot });
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    placingKind,
    floorEditing,
    wallEditing,
    selectedId,
    mode,
    currentRoom,
    roomObjects,
    setPlacingKind,
    setFloorEditing,
    setSelected,
    cyclePlacingRotation,
    updateObject,
    deleteObject,
  ]);

  if (!museum) {
    return (
      <div className="page">
        <div className="empty">
          Museum not found. <a onClick={() => navigate('/')}>Back to dashboard</a>
        </div>
      </div>
    );
  }

  const selectedObject = roomObjects.find((o) => o.id === selectedId) ?? null;

  const step = sequence[stepIndex] ?? null;
  const highlightId = mode !== 'build' && step ? step.objectId : null;
  const stepObject = step ? allObjects.find((o) => o.id === step.objectId) ?? null : null;
  const stepMemory = step
    ? allMemories.find((m) => m.objectId === step.objectId) ?? null
    : null;
  const stepRoom = step ? rooms.find((r) => r.id === step.roomId) : null;

  const handlePlace = (gx: number, gy: number, wallSide?: WallSide | null, rotation?: number) => {
    if (!currentRoom || !placingKind) return;
    if (wallSide) {
      const existing = roomObjects.find(
        (o) => o.wallSide === wallSide && o.gridX === gx && o.gridY === gy,
      );
      if (existing) deleteObject(existing.id);
    }
    const obj = addObject(
      currentRoom.id,
      placingKind,
      gx,
      gy,
      wallSide ?? null,
      rotation,
    );
    if (!obj?.id) return;
    setPlacingKind(null);
    setSelected(obj.id);
    setMode('build');
  };

  const handleGrade = (g: Grade) => {
    if (stepMemory) gradeMemory(stepMemory.id, g);
    setTimeout(() => goToStep(stepIndex + 1), 180);
  };

  const roomEditor = view === 'room' && !!currentRoom;
  const sessionLayout = roomEditor && (mode === 'walk' || mode === 'review');
  const mapLayout = view === 'map';
  const themeId = useTheme((s) => s.themeId);
  const contentRef = useRef<HTMLDivElement>(null);
  const insetLayout = roomEditor || ((themeId === 'clairvoyant' || themeId === 'blueprint') && mapLayout);
  useEditorPanelInsets(contentRef, insetLayout, themeId);

  useEffect(() => {
    const lightCanvas =
      themeId === 'clairvoyant' &&
      view === 'room' &&
      !!currentRoom &&
      isLightBackground(getStyle(currentRoom.style).bg);

    if (lightCanvas) {
      document.documentElement.dataset.lightCanvas = 'true';
    } else {
      delete document.documentElement.dataset.lightCanvas;
    }
    return () => {
      delete document.documentElement.dataset.lightCanvas;
    };
  }, [themeId, view, currentRoom?.style]);

  const leftPanelBody = (
    <>
      <button
        className={`overview-map-btn${view === 'map' ? ' primary' : ''}`}
        style={{ width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
        onClick={() => setView(view === 'map' ? 'room' : 'map')}
      >
        <Icon icon={UI_ICONS.location} size={18} className="side-head-icon" />
        Overview Map
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
          <span className="room-list-icon">
            <span className="room-list-icon--default">{roomTypeIcon(r.type)}</span>
            <span className="room-list-icon--typed">
              <Icon icon={roomIcon(r.type)} size={18} className="room-list-type-icon" />
            </span>
          </span>
          {renamingRoomId === r.id ? (
            <input
              ref={renameInputRef}
              className="room-list-rename-input"
              value={renameDraft}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitRoomRename(r.id);
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setRenamingRoomId(null);
                }
              }}
              onBlur={() => commitRoomRename(r.id)}
            />
          ) : (
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.name}
            </span>
          )}
          {mode === 'build' && (
            <span className="room-list-actions" aria-hidden={currentRoomId !== r.id}>
              <button
                className={`icon-btn ghost room-list-action-btn${currentRoomId !== r.id ? ' room-list-action-btn--placeholder' : ''}`}
                title="Rename"
                tabIndex={currentRoomId === r.id ? 0 : -1}
                onClick={(e) => {
                  if (currentRoomId !== r.id) return;
                  e.stopPropagation();
                  startRoomRename(r.id, r.name);
                }}
              >
                <Icon icon={UI_ICONS.pencil} size={12} />
              </button>
              <button
                className={`icon-btn ghost room-list-action-btn${currentRoomId !== r.id ? ' room-list-action-btn--placeholder' : ''}`}
                title="Duplicate"
                tabIndex={currentRoomId === r.id ? 0 : -1}
                onClick={(e) => {
                  if (currentRoomId !== r.id) return;
                  e.stopPropagation();
                  const nr = duplicateRoom(r.id);
                  if (nr) setCurrentRoomId(nr.id);
                }}
              >
                <Icon icon={UI_ICONS.copy} size={12} />
              </button>
              <button
                className={`icon-btn ghost room-list-action-btn${currentRoomId !== r.id ? ' room-list-action-btn--placeholder' : ''}`}
                title="Delete"
                tabIndex={currentRoomId === r.id ? 0 : -1}
                onClick={(e) => {
                  if (currentRoomId !== r.id) return;
                  e.stopPropagation();
                  if (confirm(`Delete room "${r.name}"?`)) deleteRoom(r.id);
                }}
              >
                <Icon icon={UI_ICONS.trash} size={12} />
              </button>
            </span>
          )}
        </div>
      ))}

      <button
        style={{ width: '100%', marginTop: 12 }}
        onClick={() => {
          const nr = createRoom(museumId);
          setCurrentRoomId(nr.id);
          setView('room');
        }}
      >
        + Add room
      </button>
    </>
  );

  return (
    <div
      ref={contentRef}
      className={`content${roomEditor ? ' editor-layout' : ''}${sessionLayout ? ' session-layout' : ''}${mapLayout ? ' map-layout' : ''}`}
    >
      {/* Left sidebar */}
      {roomEditor ? (
        <EditorSidePanel
          side="left"
          open={leftPanelOpen}
          onToggle={toggleLeftPanel}
          collapsedIcon={UI_ICONS.box}
          collapsedIconAccent
          title={
            <>
              <Icon icon={UI_ICONS.box} size={18} className="side-head-icon side-head-icon--museum" />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {museum.name}
              </span>
            </>
          }
        >
          {leftPanelBody}
        </EditorSidePanel>
      ) : (
        <div className="side left">
          <div className="side-head">
            <Icon icon={UI_ICONS.box} size={18} className="side-head-icon side-head-icon--museum" />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {museum.name}
            </span>
          </div>
          <div className="side-body">{leftPanelBody}</div>
        </div>
      )}

      {/* Center */}
      {view === 'map' ? (
        <MapView
          museumId={museumId}
          onEnterRoom={(roomId) => {
            setCurrentRoomId(roomId);
            setView('room');
          }}
        />
      ) : currentRoom ? (
        <div className="canvas-wrap fade-in" key={`room-${currentRoom.id}`}>
          <div className="canvas-overlay">
            <span className="pill">
              <span className="room-list-icon">
                <span className="room-list-icon--default">{roomTypeIcon(currentRoom.type)}</span>
                <span className="room-list-icon--typed">
                  <Icon icon={roomIcon(currentRoom.type)} size={16} className="room-list-type-icon" />
                </span>
              </span>
              {currentRoom.name}
            </span>
            {mode === 'build' && (
              <span className="pill muted">{roomObjects.length} objects</span>
            )}
            <button
              className={`pill pill-btn xray-toggle${xrayWalls ? ' active' : ''}`}
              title={xrayWalls ? 'Show walls' : 'See behind walls (X-ray)'}
              aria-pressed={xrayWalls}
              onClick={toggleXrayWalls}
            >
              <Icon icon={xrayWalls ? UI_ICONS.eyeOff : UI_ICONS.eye} size={15} />
              <span className="xray-toggle-label">{xrayWalls ? 'Walls hidden' : 'X-ray walls'}</span>
            </button>
          </div>

          <RoomCanvas
            key={currentRoom.id}
            room={currentRoom}
            objects={roomObjects}
            mode={mode}
            placingKind={placingKind}
            placingRotation={placingRotation}
            floorEditing={floorEditing}
            wallEditing={wallEditing}
            xrayWalls={xrayWalls}
            selectedId={selectedId}
            highlightId={highlightId}
            focusHighlight={mode !== 'build'}
            swNeighbor={
              neighbors.sw
                ? { room: neighbors.sw, objects: objectsByRoom.get(neighbors.sw.id) ?? [] }
                : null
            }
            seNeighbor={
              neighbors.se
                ? { room: neighbors.se, objects: objectsByRoom.get(neighbors.se.id) ?? [] }
                : null
            }
            onPickRoom={(id) => {
              setCurrentRoomId(id);
              setSelected(null);
            }}
            onSelect={(id) => {
              if (mode === 'build') setSelected(id);
            }}
            onPlace={handlePlace}
            onMove={(id, gx, gy, wallSide) => {
              if (!currentRoom) return;
              const obj = roomObjects.find((o) => o.id === id);
              if (!obj) return;
              if (wallSide) {
                const existing = roomObjects.find(
                  (o) =>
                    o.id !== id &&
                    o.wallSide === wallSide &&
                    o.gridX === gx &&
                    o.gridY === gy,
                );
                if (existing) deleteObject(existing.id);
              } else if (
                !canPlaceObject(
                  currentRoom,
                  roomObjects,
                  obj.kind,
                  gx,
                  gy,
                  obj.rotation,
                  null,
                  id,
                )
              ) {
                return;
              }
              updateObject(id, { gridX: gx, gridY: gy, wallSide: wallSide ?? null });
            }}
            onAddTile={(gx, gy) => addFloorTile(currentRoom.id, gx, gy)}
            onRemoveTile={(gx, gy) => removeFloorTile(currentRoom.id, gx, gy)}
            onAddWall={(gx, gy, side) => addWall(currentRoom.id, gx, gy, side)}
            onRemoveWall={(gx, gy, side) => removeWall(currentRoom.id, gx, gy, side)}
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

      {/* Right inspector */}
      {roomEditor && (
        <EditorSidePanel
          side="right"
          open={rightPanelOpen}
          onToggle={toggleRightPanel}
          collapsedIcon={selectedObject ? UI_ICONS.review : UI_ICONS.build}
          collapsedIconAccent={!selectedObject}
          title={
            selectedObject ? (
              <>🧷 Memory Anchor</>
            ) : (
              <>
                <Icon icon={UI_ICONS.build} size={18} className="side-head-icon side-head-icon--build" />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Build
                </span>
              </>
            )
          }
        >
          {mode === 'build' ? (
            selectedObject ? (
              <MemoryEditor obj={selectedObject} />
            ) : (
              <>
                <div className="section-title" style={{ marginTop: 0 }}>
                  Object Library
                </div>
                <ObjectLibrary />
                <div className="section-title">Room Customization</div>
                <RoomStylePanel room={currentRoom} />
              </>
            )
          ) : (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              Switch to Build mode to edit objects and room style.
            </p>
          )}
        </EditorSidePanel>
      )}
    </div>
  );
}
