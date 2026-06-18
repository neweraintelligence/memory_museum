import { newId, now } from '../lib/id';
import { getObjectDef, defaultObjectRotation } from './objects';
import type { Museum, Room, Connection, PObject, Memory } from '../types';

interface TObject {
  kind: string;
  gx: number;
  gy: number;
  title?: string;
  prompt?: string;
  answer?: string;
  body?: string;
  category?: string;
  tags?: string[];
}

interface TRoom {
  name: string;
  type: string;
  style: string;
  objects: TObject[];
}

export interface MuseumTemplate {
  id: string;
  name: string;
  theme: string;
  description: string;
  rooms: TRoom[];
}

export interface MuseumBundle {
  museum: Museum;
  rooms: Room[];
  connections: Connection[];
  objects: PObject[];
  memories: Memory[];
}

export const MUSEUM_TEMPLATES: MuseumTemplate[] = [
  {
    id: 'exam-prep',
    name: 'Exam Prep Museum',
    theme: 'scholar',
    description: 'A focused study suite for cramming and spaced review.',
    rooms: [
      {
        name: 'Study Hall',
        type: 'library',
        style: 'timeless-library',
        objects: [
          {
            kind: 'books',
            gx: 1,
            gy: 1,
            title: 'Core Concepts',
            prompt: 'List the three pillars of the topic.',
            answer: 'Define them in your own words.',
            category: 'overview',
            tags: ['core'],
          },
          {
            kind: 'clock',
            gx: 4,
            gy: 1,
            title: 'Timeline',
            prompt: 'Recall the key dates in order.',
            category: 'dates',
          },
          {
            kind: 'lamp',
            gx: 1,
            gy: 4,
            title: 'Key Insight',
            prompt: 'What is the single most important idea?',
            category: 'insight',
          },
          {
            kind: 'document',
            gx: 4,
            gy: 4,
            title: 'Formula Sheet',
            prompt: 'Reproduce the main formulas.',
            category: 'formulas',
          },
        ],
      },
      {
        name: 'Review Cloister',
        type: 'corridor',
        style: 'timeless-library',
        objects: [
          {
            kind: 'scroll',
            gx: 2,
            gy: 2,
            title: 'Weak Spots',
            prompt: 'What did you get wrong last time?',
            category: 'review',
          },
          {
            kind: 'candle',
            gx: 3,
            gy: 3,
            title: 'Daily Recap',
            prompt: 'Summarize today in one minute.',
            category: 'review',
          },
        ],
      },
    ],
  },
  {
    id: 'anatomy-mansion',
    name: 'Anatomy Mansion',
    theme: 'clinical',
    description: 'Walk the body system by system through themed rooms.',
    rooms: [
      {
        name: 'Cardiology Ward',
        type: 'clinic',
        style: 'clinic',
        objects: [
          {
            kind: 'anatomy',
            gx: 2,
            gy: 2,
            title: 'The Heart',
            prompt: 'Name the four chambers and their flow.',
            answer: 'RA -> RV -> lungs -> LA -> LV -> body',
            category: 'cardiovascular',
            tags: ['heart'],
          },
          {
            kind: 'jar',
            gx: 4,
            gy: 1,
            title: 'Blood Vessels',
            prompt: 'Artery vs vein vs capillary?',
            category: 'cardiovascular',
          },
        ],
      },
      {
        name: 'Neurology Wing',
        type: 'laboratory',
        style: 'clinic',
        objects: [
          {
            kind: 'dna',
            gx: 1,
            gy: 1,
            title: 'Neuron',
            prompt: 'Label dendrite, axon, synapse.',
            category: 'nervous',
          },
          {
            kind: 'microscope',
            gx: 3,
            gy: 3,
            title: 'Brain Lobes',
            prompt: 'Function of each of the four lobes?',
            category: 'nervous',
          },
        ],
      },
    ],
  },
  {
    id: 'history-museum',
    name: 'History Museum',
    theme: 'scholar',
    description: 'Galleries of eras, each anchored to memorable artifacts.',
    rooms: [
      {
        name: 'Ancient Gallery',
        type: 'museum',
        style: 'courtroom',
        objects: [
          {
            kind: 'statue',
            gx: 1,
            gy: 2,
            title: 'Early Empires',
            prompt: 'Order the first three empires chronologically.',
            category: 'ancient',
          },
          {
            kind: 'map',
            gx: 4,
            gy: 2,
            title: 'Trade Routes',
            prompt: 'Trace the major route from memory.',
            category: 'ancient',
          },
        ],
      },
      {
        name: 'Modern Gallery',
        type: 'museum',
        style: 'brutalist-atrium',
        objects: [
          {
            kind: 'painting',
            gx: 2,
            gy: 1,
            title: 'Revolutions',
            prompt: 'What sparked each revolution?',
            category: 'modern',
          },
          {
            kind: 'machine',
            gx: 3,
            gy: 4,
            title: 'Industrial Age',
            prompt: 'Three inventions that changed everything?',
            category: 'modern',
          },
        ],
      },
    ],
  },
];

export function buildBundleFromTemplate(tpl: MuseumTemplate): MuseumBundle {
  const ts = now();
  const museum: Museum = {
    id: newId(),
    userId: null,
    name: tpl.name,
    theme: tpl.theme,
    createdAt: ts,
    updatedAt: ts,
    deleted: 0,
  };

  const rooms: Room[] = [];
  const connections: Connection[] = [];
  const objects: PObject[] = [];
  const memories: Memory[] = [];

  tpl.rooms.forEach((tr, i) => {
    const room: Room = {
      id: newId(),
      museumId: museum.id,
      name: tr.name,
      type: tr.type,
      style: tr.style,
      gridW: 6,
      gridH: 6,
      tiles: [],
      walls: [],
      mapX: 120 + (i % 3) * 220,
      mapY: 140 + Math.floor(i / 3) * 200,
      orderIndex: i,
      updatedAt: ts,
      deleted: 0,
    };
    rooms.push(room);

    if (i > 0) {
      connections.push({
        id: newId(),
        museumId: museum.id,
        fromRoomId: rooms[i - 1].id,
        toRoomId: room.id,
        updatedAt: ts,
        deleted: 0,
      });
    }

    tr.objects.forEach((to, j) => {
      const def = getObjectDef(to.kind);
      const obj: PObject = {
        id: newId(),
        roomId: room.id,
        kind: to.kind,
        label: to.title ?? def.label,
        gridX: to.gx,
        gridY: to.gy,
        wallSide: null,
        rotation: defaultObjectRotation(to.kind),
        color: def.color,
        icon: def.icon,
        orderIndex: j,
        updatedAt: ts,
        deleted: 0,
      };
      objects.push(obj);
      memories.push({
        id: newId(),
        objectId: obj.id,
        title: to.title ?? def.label,
        body: to.body ?? '',
        prompt: to.prompt ?? '',
        answer: to.answer ?? '',
        tags: to.tags ?? [],
        category: to.category ?? '',
        imageUrl: '',
        links: [],
        reviewStatus: 'new',
        difficulty: 0,
        ease: 2.5,
        lastReviewed: null,
        nextReview: null,
        updatedAt: ts,
        deleted: 0,
      });
    });
  });

  return { museum, rooms, connections, objects, memories };
}
