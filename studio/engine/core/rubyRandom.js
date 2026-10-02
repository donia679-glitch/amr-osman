// Bit-exact port of Ruby's Random (MT19937) for the calls the engine uses:
// Random.new(int), rand(n), rand(a..b), rand (float), Array#shuffle(random:).
// Needed so the app reproduces the SketchUp plugin's cut plans exactly.
const N = 624;
const M = 397;
export class RubyRandom {
    mt = new Uint32Array(N);
    mti = N + 1;
    constructor(seed) {
        // Ruby rand_mt_init: one 32-bit word -> init_genrand, more -> init_by_array.
        const key = [];
        let s = Math.abs(Math.trunc(seed));
        do {
            key.push(s % 0x100000000);
            s = Math.floor(s / 0x100000000);
        } while (s > 0);
        if (key.length <= 1)
            this.initGenrand(key[0]);
        else
            this.initByArray(key);
    }
    initGenrand(s) {
        const mt = this.mt;
        mt[0] = s >>> 0;
        for (let i = 1; i < N; i++) {
            const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
            mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
        }
        this.mti = N;
    }
    initByArray(key) {
        const mt = this.mt;
        this.initGenrand(19650218);
        let i = 1;
        let j = 0;
        let k = N > key.length ? N : key.length;
        for (; k; k--) {
            const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
            mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0;
            i++;
            j++;
            if (i >= N) {
                mt[0] = mt[N - 1];
                i = 1;
            }
            if (j >= key.length)
                j = 0;
        }
        for (k = N - 1; k; k--) {
            const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
            mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
            i++;
            if (i >= N) {
                mt[0] = mt[N - 1];
                i = 1;
            }
        }
        mt[0] = 0x80000000;
    }
    nextState() {
        const mt = this.mt;
        const mix = (u, v) => ((u & 0x80000000) | (v & 0x7fffffff)) >>> 0;
        const twist = (u, v) => ((mix(u, v) >>> 1) ^ (v & 1 ? 0x9908b0df : 0)) >>> 0;
        let p = 0;
        for (let j = N - M + 1; --j; p++)
            mt[p] = (mt[p + M] ^ twist(mt[p], mt[p + 1])) >>> 0;
        for (let j = M; --j; p++)
            mt[p] = (mt[p + M - N] ^ twist(mt[p], mt[p + 1])) >>> 0;
        mt[p] = (mt[p + M - N] ^ twist(mt[p], mt[0])) >>> 0;
        this.mti = 0;
    }
    genrandInt32() {
        if (this.mti >= N)
            this.nextState();
        let y = this.mt[this.mti++];
        y ^= y >>> 11;
        y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
        y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
        y ^= y >>> 18;
        return y >>> 0;
    }
    /** Ruby limited_rand: uniform integer in [0, limit] (limit < 2^32). */
    limited(limit) {
        if (!limit)
            return 0;
        let mask = limit;
        mask |= mask >>> 1;
        mask |= mask >>> 2;
        mask |= mask >>> 4;
        mask |= mask >>> 8;
        mask |= mask >>> 16;
        mask >>>= 0;
        for (;;) {
            const v = (this.genrandInt32() & mask) >>> 0;
            if (v <= limit)
                return v;
        }
    }
    /** rand(n) for integer n > 0 */
    int(n) {
        return this.limited(n - 1);
    }
    /** rand(a..b) inclusive */
    range(a, b) {
        return a + this.limited(b - a);
    }
    /** rand with no argument: float in [0,1) (genrand_res53) */
    float() {
        const a = this.genrandInt32() >>> 5;
        const b = this.genrandInt32() >>> 6;
        return (a * 67108864 + b) / 9007199254740992;
    }
    /** Array#shuffle(random: self) — returns a new array */
    shuffle(arr) {
        const out = arr.slice();
        let i = out.length;
        while (i) {
            const j = this.limited(i - 1);
            i--;
            const t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }
}
