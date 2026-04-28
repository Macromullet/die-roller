export const randRange = (min, max) => min + Math.random() * (max - min);

export const gaussian = (mean = 0, sd = 1) => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sd * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

export const randomVec3WithMagnitude = (Vec3, min, max) => {
  const mag = randRange(min, max);
  const v = new Vec3(gaussian(), gaussian(), gaussian());
  v.normalize();
  v.scale(mag, v);
  return v;
};

export const secureRandomInt = (() => {
  const cryptoObj = (typeof window !== 'undefined' && (window.crypto || window.msCrypto)) || undefined;
  const fallback = (max) => Math.floor(Math.random() * max);
  if (!cryptoObj?.getRandomValues) return fallback;
  return (max) => {
    const array = new Uint32Array(1);
    cryptoObj.getRandomValues(array);
    return Math.floor((array[0] / 0x100000000) * max);
  };
})();
