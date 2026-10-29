import { describe, it, expect } from 'vitest';
import { Task } from '@shared/types';

describe('GTD Framework Smoke Test', () => {
  it('should initialize task structure properly', () => {
    const task: Task = {
      id: 'test-1',
      title: 'Написать спецификацию',
      destination: 'inbox',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(task.id).toBe('test-1');
    expect(task.destination).toBe('inbox');
    expect(task.status).toBe('active');
  });
});
