import { describe, it, expect } from 'vitest';
import { applyBondCoupon } from '../domain/bond';
import type { Bond } from '../types';

function mkBond(overrides: Partial<Bond> = {}): Bond {
  return {
    id: 'b',
    name: '단기 국채',
    faceValue: 1_000_000,
    couponRate: 0.03,
    maturityYears: 3,
    purchasedAtAge: 30,
    matured: false,
    ...overrides,
  };
}

describe('applyBondCoupon', () => {
  it('만기 전: 쿠폰만 지급, 원금은 건드리지 않는다', () => {
    const bond = mkBond();
    const r = applyBondCoupon([bond], 32, 1); // 2년차
    expect(r.couponCash).toBe(30_000); // 100만 × 3%
    expect(r.principalCash).toBe(0);
    expect(r.bonds[0].matured).toBe(false);
  });

  it('만기 정확히 도달: 쿠폰 + 원금 둘 다 지급하고 matured=true', () => {
    const bond = mkBond();
    const r = applyBondCoupon([bond], 33, 1); // 30→33: 3년차 만기
    expect(r.couponCash).toBe(30_000);
    expect(r.principalCash).toBe(1_000_000);
    expect(r.bonds[0].matured).toBe(true);
  });

  it('이미 matured=true 인 채권은 건드리지 않는다', () => {
    const bond = mkBond({ matured: true });
    const r = applyBondCoupon([bond], 50, 1);
    expect(r.couponCash).toBe(0);
    expect(r.principalCash).toBe(0);
    expect(r.bonds[0]).toBe(bond);
  });

  it('deltaYears=2 점프에서 쿠폰은 2배가 되지만 원금은 한 번만', () => {
    const bond = mkBond();
    const r = applyBondCoupon([bond], 33, 2);
    expect(r.couponCash).toBe(60_000); // 30k × 2
    expect(r.principalCash).toBe(1_000_000);
    expect(r.bonds[0].matured).toBe(true);
  });

  it('여러 채권이 섞여 있을 때 각 상태가 독립적으로 처리된다', () => {
    const bonds: Bond[] = [
      mkBond({ id: 'a', faceValue: 1_000_000, couponRate: 0.03, maturityYears: 3, purchasedAtAge: 30, matured: false }),
      mkBond({ id: 'b', faceValue: 2_000_000, couponRate: 0.05, maturityYears: 10, purchasedAtAge: 25, matured: false }),
    ];
    const r = applyBondCoupon(bonds, 33, 1);
    // a: 3년차 만기, b: 8년차 아직 안 감
    expect(r.couponCash).toBe(30_000 + 100_000);
    expect(r.principalCash).toBe(1_000_000);
    expect(r.bonds[0].matured).toBe(true);
    expect(r.bonds[1].matured).toBe(false);
  });

  it('만기 지난 후 다시 호출되면 아무것도 안 하는 게 맞다 (이미 matured)', () => {
    const bond = mkBond();
    // 먼저 만기 체크
    const first = applyBondCoupon([bond], 33, 1);
    expect(first.bonds[0].matured).toBe(true);
    // 이후 호출은 건드리지 않음
    const second = applyBondCoupon(first.bonds, 35, 1);
    expect(second.couponCash).toBe(0);
    expect(second.principalCash).toBe(0);
  });
});
