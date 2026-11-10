/** Polynomials as ascending coefficient arrays: c[0] + c[1] t + c[2] t^2 + ... */
export type Poly = number[];

export function evalPoly(c: Poly, t: number): number {
  let r = 0;
  for (let i = c.length - 1; i >= 0; i--) r = r * t + c[i];
  return r;
}

export function derivative(c: Poly): Poly {
  return c.length <= 1 ? [0] : c.slice(1).map((v, i) => v * (i + 1));
}

function trim(c: Poly): Poly {
  let n = c.length;
  while (n > 1 && Math.abs(c[n - 1]) < 1e-12) n--;
  return c.slice(0, n);
}

/** Square a quadratic a0 + a1 t + a2 t^2 into a quartic. */
export function squareQuadratic(a: [number, number, number]): Poly {
  const [a0, a1, a2] = a;
  return [a0 * a0, 2 * a0 * a1, a1 * a1 + 2 * a0 * a2, 2 * a1 * a2, a2 * a2];
}

export function addPoly(a: Poly, b: Poly): Poly {
  const out: Poly = new Array(Math.max(a.length, b.length)).fill(0);
  a.forEach((v, i) => (out[i] += v));
  b.forEach((v, i) => (out[i] += v));
  return out;
}

/** All real roots in [a, b] (sorted). Isolates monotone pieces via derivative roots, then bisects. Misses exact tangencies. */
export function realRoots(coeffs: Poly, a: number, b: number): number[] {
  const p = trim(coeffs);
  const deg = p.length - 1;
  if (deg <= 0) return [];
  if (deg === 1) {
    const r = -p[0] / p[1];
    return r >= a && r <= b ? [r] : [];
  }
  const pts = [a, ...realRoots(derivative(p), a, b), b];
  const out: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    let lo = pts[i];
    let hi = pts[i + 1];
    const flo = evalPoly(p, lo);
    const fhi = evalPoly(p, hi);
    if (flo === 0) {
      out.push(lo);
      continue;
    }
    if (flo * fhi > 0) continue;
    if (fhi === 0) {
      out.push(hi);
      continue;
    }
    for (let k = 0; k < 80; k++) {
      const mid = 0.5 * (lo + hi);
      const fm = evalPoly(p, mid);
      if (fm === 0) {
        lo = hi = mid;
        break;
      }
      if (flo * fm < 0) hi = mid;
      else lo = mid;
    }
    out.push(0.5 * (lo + hi));
  }
  return out.filter((r, i) => i === 0 || Math.abs(r - out[i - 1]) > 1e-12);
}

/**
 * Earliest t in [0, T] where f crosses from positive to negative (a gap closing).
 * Already-overlapping and still closing returns 0; separating contacts are ignored.
 */
export function firstApproach(f: Poly, T: number): number | null {
  const df = derivative(f);
  if (evalPoly(f, 0) <= 0 && evalPoly(df, 0) < 0) return 0;
  for (const r of realRoots(f, 0, T)) {
    if (evalPoly(df, r) < 0) return r;
  }
  return null;
}
