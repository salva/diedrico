/**
 * Root process node - special subprocess containing all construction history
 */

import type { Subprocess } from './Subprocess';

export interface Process extends Omit<Subprocess, 'type'> {
  type: 'process';
}

/**
 * Factory function to create root process
 */
export function createProcess(): Process {
  return {
    id: 'root',
    type: 'process',
    name: 'Root Process',
    children: [],
    showIntermediates: true,
    isOutput: true,
    created: new Date()
  };
}
