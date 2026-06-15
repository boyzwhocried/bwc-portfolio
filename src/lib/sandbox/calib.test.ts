import { describe, it, expect } from 'vitest'
import {
  scoreLinear, circularDiffDeg, scoreBisect, scoreThirds, scoreAngle, scorePosition,
  scoreFraction, scoreQuarter, scoreGolden, GOLDEN,
  aggregate, isPersonalBest, TOL,
} from './calib'

describe('calibration scoring core', () => {
  it('scoreLinear is 100 at zero error and 0 at tolerance', () => {
    expect(scoreLinear(0, 10)).toBe(100)
    expect(scoreLinear(10, 10)).toBe(0)
    expect(scoreLinear(20, 10)).toBe(0) // clamped, never negative
    expect(scoreLinear(5, 10)).toBe(50)
  })

  it('computes circular angle difference across the 0/360 seam', () => {
    expect(circularDiffDeg(350, 10)).toBe(20)
    expect(circularDiffDeg(10, 350)).toBe(20)
    expect(circularDiffDeg(0, 180)).toBe(180)
  })

  it('bisect scores perfectly at the midpoint', () => {
    expect(scoreBisect(0.5)).toBe(100)
    expect(scoreBisect(0.5 + TOL.bisect)).toBe(0)
    expect(scoreBisect(0.42)).toBeLessThan(100)
    expect(scoreBisect(0.42)).toBeGreaterThan(0)
  })

  it('thirds scores perfectly at the one-third mark', () => {
    expect(scoreThirds(1 / 3)).toBe(100)
    expect(scoreThirds(1 / 3 + TOL.bisect)).toBe(0)
    expect(scoreThirds(1 / 3 + TOL.bisect / 2)).toBe(50) // half a tolerance off
    expect(scoreThirds(0.5)).toBe(0) // a true midpoint is well outside tolerance
  })

  it('scores arbitrary fraction targets (quarter, golden) on the shared tolerance', () => {
    expect(scoreFraction(0.5, 0.5)).toBe(100)
    expect(scoreFraction(0.5 + TOL.bisect / 2, 0.5)).toBe(50)
    expect(scoreQuarter(0.25)).toBe(100)
    expect(scoreQuarter(0.25 + TOL.bisect)).toBe(0)
    expect(scoreGolden(GOLDEN)).toBe(100)
    expect(scoreGolden(0.5)).toBe(0) // 0.118 off, well past the tightened tolerance
  })

  it('angle scores by circular distance to target', () => {
    expect(scoreAngle(127, 127)).toBe(100)
    expect(scoreAngle(0, TOL.angle)).toBe(0)
    expect(scoreAngle(350, 10)).toBe(scoreAngle(10, 350)) // symmetric
  })

  it('position scores by distance to a target fraction', () => {
    expect(scorePosition(0.3, 0.3)).toBe(100)
    expect(scorePosition(0.3 + TOL.position, 0.3)).toBe(0)
  })

  it('aggregates rounds as a rounded mean', () => {
    expect(aggregate([100, 50, 0])).toBe(50)
    expect(aggregate([100, 100, 99])).toBe(100)
  })

  it('flags a personal best only when strictly higher', () => {
    expect(isPersonalBest(90, 80)).toBe(true)
    expect(isPersonalBest(80, 80)).toBe(false)
  })
})
