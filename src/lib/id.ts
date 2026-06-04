import { nanoid } from 'nanoid';

export const newId = (): string => nanoid(16);

export const now = (): number => Date.now();
