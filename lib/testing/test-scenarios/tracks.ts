import type { TestTrack } from '../types';
import { testScenarios } from './standalone-scenarios';

export const testTracks: TestTrack[] = [
  {
    id: 'setup',
    name: 'Setup (Describe)',
    description: 'Setup agent: brief extraction, runtime inference, project creation from natural language',
    scenarioIds: testScenarios.filter(s => s.category === 'setup').map(s => s.id),
  },
];
