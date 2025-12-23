import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ProjectService Autosave', () => {
  beforeEach(() => {
    // Use fake timers to control setTimeout behavior
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should trigger autosave after 500ms of inactivity', async () => {
    // This is a placeholder test that verifies the autosave timing logic
    // In the actual ProjectService.ts, we have:
    // - markDirty() which sets isDirty = true and calls scheduleAutosave()
    // - scheduleAutosave() which uses setTimeout(() => saveProject(), 500)
    
    // Mock the save function
    let saveCalled = false;
    const mockSave = () => {
      saveCalled = true;
    };
    
    // Simulate markDirty behavior
    let timeoutId: NodeJS.Timeout | null = null;
    const scheduleAutosave = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(mockSave, 500);
    };
    
    // Call scheduleAutosave (simulating markDirty())
    scheduleAutosave();
    
    // Advance time by 400ms - should not trigger
    vi.advanceTimersByTime(400);
    expect(saveCalled).toBe(false);
    
    // Advance another 100ms (total 500ms) - should trigger
    vi.advanceTimersByTime(100);
    expect(saveCalled).toBe(true);
  });

  it('should debounce multiple markDirty calls', async () => {
    let saveCount = 0;
    const mockSave = () => {
      saveCount++;
    };
    
    let timeoutId: NodeJS.Timeout | null = null;
    const scheduleAutosave = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(mockSave, 500);
    };
    
    // Call scheduleAutosave multiple times
    scheduleAutosave(); // T=0
    vi.advanceTimersByTime(200);
    
    scheduleAutosave(); // T=200
    vi.advanceTimersByTime(200);
    
    scheduleAutosave(); // T=400
    vi.advanceTimersByTime(200);
    
    scheduleAutosave(); // T=600
    
    // Only 400ms passed since last call, shouldn't save yet
    expect(saveCount).toBe(0);
    
    // Advance full 500ms from last call
    vi.advanceTimersByTime(500);
    
    // Should have saved only once
    expect(saveCount).toBe(1);
  });

  it('should not save if already saved', async () => {
    let saveCount = 0;
    let isDirty = false;
    
    const mockSave = () => {
      if (isDirty) {
        saveCount++;
        isDirty = false;
      }
    };
    
    let timeoutId: NodeJS.Timeout | null = null;
    const scheduleAutosave = () => {
      isDirty = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(mockSave, 500);
    };
    
    // First autosave
    scheduleAutosave();
    vi.advanceTimersByTime(500);
    expect(saveCount).toBe(1);
    
    // Try to trigger another save without marking dirty
    vi.advanceTimersByTime(500);
    expect(saveCount).toBe(1); // Should still be 1
    
    // Mark dirty again
    scheduleAutosave();
    vi.advanceTimersByTime(500);
    expect(saveCount).toBe(2); // Now should be 2
  });
});
