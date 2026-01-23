import { describe, it, expect } from 'vitest';
import { clipSegmentToRectangle, generateClippedGrid, computeBounds, type Rectangle2D, type Segment2D } from '../../src/utils/rectangleGrid';

describe('Rectangle Grid Utilities', () => {
  
  it('should compute axis-aligned bounds correctly', () => {
    const rect: Rectangle2D = {
      corners: [
        { u: 0, v: 0 },
        { u: 10, v: 0 },
        { u: 10, v: 10 },
        { u: 0, v: 10 }
      ]
    };
    
    const bounds = computeBounds(rect);
    
    expect(bounds.minU).toBe(0);
    expect(bounds.maxU).toBe(10);
    expect(bounds.minV).toBe(0);
    expect(bounds.maxV).toBe(10);
  });
  
  it('should clip segment fully inside rectangle', () => {
    const rect: Rectangle2D = {
      corners: [
        { u: 0, v: 0 },
        { u: 10, v: 0 },
        { u: 10, v: 10 },
        { u: 0, v: 10 }
      ]
    };
    
    const segment: Segment2D = {
      start: { u: 2, v: 5 },
      end: { u: 8, v: 5 }
    };
    
    const clipped = clipSegmentToRectangle(segment, rect);
    
    expect(clipped).not.toBeNull();
    expect(clipped!.start.u).toBeCloseTo(2);
    expect(clipped!.start.v).toBeCloseTo(5);
    expect(clipped!.end.u).toBeCloseTo(8);
    expect(clipped!.end.v).toBeCloseTo(5);
  });
  
  it('should clip segment partially outside rectangle', () => {
    const rect: Rectangle2D = {
      corners: [
        { u: 0, v: 0 },
        { u: 10, v: 0 },
        { u: 10, v: 10 },
        { u: 0, v: 10 }
      ]
    };
    
    const segment: Segment2D = {
      start: { u: -5, v: 5 },
      end: { u: 15, v: 5 }
    };
    
    const clipped = clipSegmentToRectangle(segment, rect);
    
    expect(clipped).not.toBeNull();
    expect(clipped!.start.u).toBeCloseTo(0, 1);
    expect(clipped!.start.v).toBeCloseTo(5, 1);
    expect(clipped!.end.u).toBeCloseTo(10, 1);
    expect(clipped!.end.v).toBeCloseTo(5, 1);
  });
  
  it('should return null for segment entirely outside rectangle', () => {
    const rect: Rectangle2D = {
      corners: [
        { u: 0, v: 0 },
        { u: 10, v: 0 },
        { u: 10, v: 10 },
        { u: 0, v: 10 }
      ]
    };
    
    const segment: Segment2D = {
      start: { u: -10, v: 5 },
      end: { u: -5, v: 5 }
    };
    
    const clipped = clipSegmentToRectangle(segment, rect);
    
    expect(clipped).toBeNull();
  });
  
  it('should work with rotated (non-axis-aligned) rectangle', () => {
    // Diamond shape: corners at (5,0), (10,5), (5,10), (0,5)
    const rect: Rectangle2D = {
      corners: [
        { u: 5, v: 0 },
        { u: 10, v: 5 },
        { u: 5, v: 10 },
        { u: 0, v: 5 }
      ]
    };
    
    // Horizontal segment through center
    const segment: Segment2D = {
      start: { u: 0, v: 5 },
      end: { u: 10, v: 5 }
    };
    
    const clipped = clipSegmentToRectangle(segment, rect);
    
    expect(clipped).not.toBeNull();
    // Should be clipped to edges of diamond
    expect(clipped!.start.u).toBeCloseTo(0, 1);
    expect(clipped!.end.u).toBeCloseTo(10, 1);
  });
  
  it('should generate grid for axis-aligned rectangle', () => {
    const rect: Rectangle2D = {
      corners: [
        { u: 0, v: 0 },
        { u: 10, v: 0 },
        { u: 10, v: 10 },
        { u: 0, v: 10 }
      ]
    };
    
    const segments = generateClippedGrid(rect, 4);  // 4 divisions = 5 lines each direction
    
    // Should have lines in both directions
    expect(segments.length).toBeGreaterThan(0);
    
    // All segments should be inside or on the rectangle bounds
    for (const seg of segments) {
      expect(seg.start.u).toBeGreaterThanOrEqual(-0.1);
      expect(seg.start.u).toBeLessThanOrEqual(10.1);
      expect(seg.start.v).toBeGreaterThanOrEqual(-0.1);
      expect(seg.start.v).toBeLessThanOrEqual(10.1);
      
      expect(seg.end.u).toBeGreaterThanOrEqual(-0.1);
      expect(seg.end.u).toBeLessThanOrEqual(10.1);
      expect(seg.end.v).toBeGreaterThanOrEqual(-0.1);
      expect(seg.end.v).toBeLessThanOrEqual(10.1);
    }
  });
});
