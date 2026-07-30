export const fmtKg = (n: number) =>
  n >= 1000 ? `${(n/1000).toLocaleString(undefined,{maximumFractionDigits:1})}t` : `${n} kg`;
export const fmtLKR = (n: number) =>
  `LKR ${n.toLocaleString()}`;
export const fmtDate = (s: string) =>
  new Date(s).toLocaleString(undefined,{ dateStyle:'medium', timeStyle:'short' });
