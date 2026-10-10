var ms = Object.defineProperty;
var ys = (t, e, r) => e in t ? ms(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r;
var An = (t, e, r) => ys(t, typeof e != "symbol" ? e + "" : e, r);
function so(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function jn(t) {
  if (Object.prototype.hasOwnProperty.call(t, "__esModule")) return t;
  var e = t.default;
  if (typeof e == "function") {
    var r = function n() {
      var a = !1;
      try {
        a = this instanceof n;
      } catch {
      }
      return a ? Reflect.construct(e, arguments, this.constructor) : e.apply(this, arguments);
    };
    r.prototype = e.prototype;
  } else r = {};
  return Object.defineProperty(r, "__esModule", { value: !0 }), Object.keys(t).forEach(function(n) {
    var a = Object.getOwnPropertyDescriptor(t, n);
    Object.defineProperty(r, n, a.get ? a : {
      enumerable: !0,
      get: function() {
        return t[n];
      }
    });
  }), r;
}
var wn = {}, ur = {}, wi;
function As() {
  if (wi) return ur;
  wi = 1, ur.byteLength = d, ur.toByteArray = N, ur.fromByteArray = I;
  for (var t = [], e = [], r = typeof Uint8Array < "u" ? Uint8Array : Array, n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", a = 0, o = n.length; a < o; ++a)
    t[a] = n[a], e[n.charCodeAt(a)] = a;
  e[45] = 62, e[95] = 63;
  function l(O) {
    var B = O.length;
    if (B % 4 > 0)
      throw new Error("Invalid string. Length must be a multiple of 4");
    var k = O.indexOf("=");
    k === -1 && (k = B);
    var F = k === B ? 0 : 4 - k % 4;
    return [k, F];
  }
  function d(O) {
    var B = l(O), k = B[0], F = B[1];
    return (k + F) * 3 / 4 - F;
  }
  function _(O, B, k) {
    return (B + k) * 3 / 4 - k;
  }
  function N(O) {
    var B, k = l(O), F = k[0], H = k[1], Y = new r(_(O, F, H)), $ = 0, Q = H > 0 ? F - 4 : F, j;
    for (j = 0; j < Q; j += 4)
      B = e[O.charCodeAt(j)] << 18 | e[O.charCodeAt(j + 1)] << 12 | e[O.charCodeAt(j + 2)] << 6 | e[O.charCodeAt(j + 3)], Y[$++] = B >> 16 & 255, Y[$++] = B >> 8 & 255, Y[$++] = B & 255;
    return H === 2 && (B = e[O.charCodeAt(j)] << 2 | e[O.charCodeAt(j + 1)] >> 4, Y[$++] = B & 255), H === 1 && (B = e[O.charCodeAt(j)] << 10 | e[O.charCodeAt(j + 1)] << 4 | e[O.charCodeAt(j + 2)] >> 2, Y[$++] = B >> 8 & 255, Y[$++] = B & 255), Y;
  }
  function L(O) {
    return t[O >> 18 & 63] + t[O >> 12 & 63] + t[O >> 6 & 63] + t[O & 63];
  }
  function x(O, B, k) {
    for (var F, H = [], Y = B; Y < k; Y += 3)
      F = (O[Y] << 16 & 16711680) + (O[Y + 1] << 8 & 65280) + (O[Y + 2] & 255), H.push(L(F));
    return H.join("");
  }
  function I(O) {
    for (var B, k = O.length, F = k % 3, H = [], Y = 16383, $ = 0, Q = k - F; $ < Q; $ += Y)
      H.push(x(O, $, $ + Y > Q ? Q : $ + Y));
    return F === 1 ? (B = O[k - 1], H.push(
      t[B >> 2] + t[B << 4 & 63] + "=="
    )) : F === 2 && (B = (O[k - 2] << 8) + O[k - 1], H.push(
      t[B >> 10] + t[B >> 4 & 63] + t[B << 2 & 63] + "="
    )), H.join("");
  }
  return ur;
}
var Ar = {};
var Si;
function ws() {
  return Si || (Si = 1, Ar.read = function(t, e, r, n, a) {
    var o, l, d = a * 8 - n - 1, _ = (1 << d) - 1, N = _ >> 1, L = -7, x = r ? a - 1 : 0, I = r ? -1 : 1, O = t[e + x];
    for (x += I, o = O & (1 << -L) - 1, O >>= -L, L += d; L > 0; o = o * 256 + t[e + x], x += I, L -= 8)
      ;
    for (l = o & (1 << -L) - 1, o >>= -L, L += n; L > 0; l = l * 256 + t[e + x], x += I, L -= 8)
      ;
    if (o === 0)
      o = 1 - N;
    else {
      if (o === _)
        return l ? NaN : (O ? -1 : 1) * (1 / 0);
      l = l + Math.pow(2, n), o = o - N;
    }
    return (O ? -1 : 1) * l * Math.pow(2, o - n);
  }, Ar.write = function(t, e, r, n, a, o) {
    var l, d, _, N = o * 8 - a - 1, L = (1 << N) - 1, x = L >> 1, I = a === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, O = n ? 0 : o - 1, B = n ? 1 : -1, k = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
    for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (d = isNaN(e) ? 1 : 0, l = L) : (l = Math.floor(Math.log(e) / Math.LN2), e * (_ = Math.pow(2, -l)) < 1 && (l--, _ *= 2), l + x >= 1 ? e += I / _ : e += I * Math.pow(2, 1 - x), e * _ >= 2 && (l++, _ /= 2), l + x >= L ? (d = 0, l = L) : l + x >= 1 ? (d = (e * _ - 1) * Math.pow(2, a), l = l + x) : (d = e * Math.pow(2, x - 1) * Math.pow(2, a), l = 0)); a >= 8; t[r + O] = d & 255, O += B, d /= 256, a -= 8)
      ;
    for (l = l << a | d, N += a; N > 0; t[r + O] = l & 255, O += B, l /= 256, N -= 8)
      ;
    t[r + O - B] |= k * 128;
  }), Ar;
}
var Oi;
function Wn() {
  return Oi || (Oi = 1, (function(t) {
    const e = As(), r = ws(), n = typeof Symbol == "function" && typeof Symbol.for == "function" ? /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom") : null;
    t.Buffer = d, t.SlowBuffer = Y, t.INSPECT_MAX_BYTES = 50;
    const a = 2147483647;
    t.kMaxLength = a, d.TYPED_ARRAY_SUPPORT = o(), !d.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error(
      "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
    );
    function o() {
      try {
        const R = new Uint8Array(1), c = { foo: function() {
          return 42;
        } };
        return Object.setPrototypeOf(c, Uint8Array.prototype), Object.setPrototypeOf(R, c), R.foo() === 42;
      } catch {
        return !1;
      }
    }
    Object.defineProperty(d.prototype, "parent", {
      enumerable: !0,
      get: function() {
        if (d.isBuffer(this))
          return this.buffer;
      }
    }), Object.defineProperty(d.prototype, "offset", {
      enumerable: !0,
      get: function() {
        if (d.isBuffer(this))
          return this.byteOffset;
      }
    });
    function l(R) {
      if (R > a)
        throw new RangeError('The value "' + R + '" is invalid for option "size"');
      const c = new Uint8Array(R);
      return Object.setPrototypeOf(c, d.prototype), c;
    }
    function d(R, c, h) {
      if (typeof R == "number") {
        if (typeof c == "string")
          throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          );
        return x(R);
      }
      return _(R, c, h);
    }
    d.poolSize = 8192;
    function _(R, c, h) {
      if (typeof R == "string")
        return I(R, c);
      if (ArrayBuffer.isView(R))
        return B(R);
      if (R == null)
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof R
        );
      if (fe(R, ArrayBuffer) || R && fe(R.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (fe(R, SharedArrayBuffer) || R && fe(R.buffer, SharedArrayBuffer)))
        return k(R, c, h);
      if (typeof R == "number")
        throw new TypeError(
          'The "value" argument must not be of type number. Received type number'
        );
      const A = R.valueOf && R.valueOf();
      if (A != null && A !== R)
        return d.from(A, c, h);
      const M = F(R);
      if (M) return M;
      if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof R[Symbol.toPrimitive] == "function")
        return d.from(R[Symbol.toPrimitive]("string"), c, h);
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof R
      );
    }
    d.from = function(R, c, h) {
      return _(R, c, h);
    }, Object.setPrototypeOf(d.prototype, Uint8Array.prototype), Object.setPrototypeOf(d, Uint8Array);
    function N(R) {
      if (typeof R != "number")
        throw new TypeError('"size" argument must be of type number');
      if (R < 0)
        throw new RangeError('The value "' + R + '" is invalid for option "size"');
    }
    function L(R, c, h) {
      return N(R), R <= 0 ? l(R) : c !== void 0 ? typeof h == "string" ? l(R).fill(c, h) : l(R).fill(c) : l(R);
    }
    d.alloc = function(R, c, h) {
      return L(R, c, h);
    };
    function x(R) {
      return N(R), l(R < 0 ? 0 : H(R) | 0);
    }
    d.allocUnsafe = function(R) {
      return x(R);
    }, d.allocUnsafeSlow = function(R) {
      return x(R);
    };
    function I(R, c) {
      if ((typeof c != "string" || c === "") && (c = "utf8"), !d.isEncoding(c))
        throw new TypeError("Unknown encoding: " + c);
      const h = $(R, c) | 0;
      let A = l(h);
      const M = A.write(R, c);
      return M !== h && (A = A.slice(0, M)), A;
    }
    function O(R) {
      const c = R.length < 0 ? 0 : H(R.length) | 0, h = l(c);
      for (let A = 0; A < c; A += 1)
        h[A] = R[A] & 255;
      return h;
    }
    function B(R) {
      if (fe(R, Uint8Array)) {
        const c = new Uint8Array(R);
        return k(c.buffer, c.byteOffset, c.byteLength);
      }
      return O(R);
    }
    function k(R, c, h) {
      if (c < 0 || R.byteLength < c)
        throw new RangeError('"offset" is outside of buffer bounds');
      if (R.byteLength < c + (h || 0))
        throw new RangeError('"length" is outside of buffer bounds');
      let A;
      return c === void 0 && h === void 0 ? A = new Uint8Array(R) : h === void 0 ? A = new Uint8Array(R, c) : A = new Uint8Array(R, c, h), Object.setPrototypeOf(A, d.prototype), A;
    }
    function F(R) {
      if (d.isBuffer(R)) {
        const c = H(R.length) | 0, h = l(c);
        return h.length === 0 || R.copy(h, 0, 0, c), h;
      }
      if (R.length !== void 0)
        return typeof R.length != "number" || St(R.length) ? l(0) : O(R);
      if (R.type === "Buffer" && Array.isArray(R.data))
        return O(R.data);
    }
    function H(R) {
      if (R >= a)
        throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + a.toString(16) + " bytes");
      return R | 0;
    }
    function Y(R) {
      return +R != R && (R = 0), d.alloc(+R);
    }
    d.isBuffer = function(c) {
      return c != null && c._isBuffer === !0 && c !== d.prototype;
    }, d.compare = function(c, h) {
      if (fe(c, Uint8Array) && (c = d.from(c, c.offset, c.byteLength)), fe(h, Uint8Array) && (h = d.from(h, h.offset, h.byteLength)), !d.isBuffer(c) || !d.isBuffer(h))
        throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        );
      if (c === h) return 0;
      let A = c.length, M = h.length;
      for (let P = 0, q = Math.min(A, M); P < q; ++P)
        if (c[P] !== h[P]) {
          A = c[P], M = h[P];
          break;
        }
      return A < M ? -1 : M < A ? 1 : 0;
    }, d.isEncoding = function(c) {
      switch (String(c).toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "latin1":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return !0;
        default:
          return !1;
      }
    }, d.concat = function(c, h) {
      if (!Array.isArray(c))
        throw new TypeError('"list" argument must be an Array of Buffers');
      if (c.length === 0)
        return d.alloc(0);
      let A;
      if (h === void 0)
        for (h = 0, A = 0; A < c.length; ++A)
          h += c[A].length;
      const M = d.allocUnsafe(h);
      let P = 0;
      for (A = 0; A < c.length; ++A) {
        let q = c[A];
        if (fe(q, Uint8Array))
          P + q.length > M.length ? (d.isBuffer(q) || (q = d.from(q)), q.copy(M, P)) : Uint8Array.prototype.set.call(
            M,
            q,
            P
          );
        else if (d.isBuffer(q))
          q.copy(M, P);
        else
          throw new TypeError('"list" argument must be an Array of Buffers');
        P += q.length;
      }
      return M;
    };
    function $(R, c) {
      if (d.isBuffer(R))
        return R.length;
      if (ArrayBuffer.isView(R) || fe(R, ArrayBuffer))
        return R.byteLength;
      if (typeof R != "string")
        throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof R
        );
      const h = R.length, A = arguments.length > 2 && arguments[2] === !0;
      if (!A && h === 0) return 0;
      let M = !1;
      for (; ; )
        switch (c) {
          case "ascii":
          case "latin1":
          case "binary":
            return h;
          case "utf8":
          case "utf-8":
            return wt(R).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return h * 2;
          case "hex":
            return h >>> 1;
          case "base64":
            return vt(R).length;
          default:
            if (M)
              return A ? -1 : wt(R).length;
            c = ("" + c).toLowerCase(), M = !0;
        }
    }
    d.byteLength = $;
    function Q(R, c, h) {
      let A = !1;
      if ((c === void 0 || c < 0) && (c = 0), c > this.length || ((h === void 0 || h > this.length) && (h = this.length), h <= 0) || (h >>>= 0, c >>>= 0, h <= c))
        return "";
      for (R || (R = "utf8"); ; )
        switch (R) {
          case "hex":
            return v(this, c, h);
          case "utf8":
          case "utf-8":
            return i(this, c, h);
          case "ascii":
            return y(this, c, h);
          case "latin1":
          case "binary":
            return w(this, c, h);
          case "base64":
            return g(this, c, h);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return T(this, c, h);
          default:
            if (A) throw new TypeError("Unknown encoding: " + R);
            R = (R + "").toLowerCase(), A = !0;
        }
    }
    d.prototype._isBuffer = !0;
    function j(R, c, h) {
      const A = R[c];
      R[c] = R[h], R[h] = A;
    }
    d.prototype.swap16 = function() {
      const c = this.length;
      if (c % 2 !== 0)
        throw new RangeError("Buffer size must be a multiple of 16-bits");
      for (let h = 0; h < c; h += 2)
        j(this, h, h + 1);
      return this;
    }, d.prototype.swap32 = function() {
      const c = this.length;
      if (c % 4 !== 0)
        throw new RangeError("Buffer size must be a multiple of 32-bits");
      for (let h = 0; h < c; h += 4)
        j(this, h, h + 3), j(this, h + 1, h + 2);
      return this;
    }, d.prototype.swap64 = function() {
      const c = this.length;
      if (c % 8 !== 0)
        throw new RangeError("Buffer size must be a multiple of 64-bits");
      for (let h = 0; h < c; h += 8)
        j(this, h, h + 7), j(this, h + 1, h + 6), j(this, h + 2, h + 5), j(this, h + 3, h + 4);
      return this;
    }, d.prototype.toString = function() {
      const c = this.length;
      return c === 0 ? "" : arguments.length === 0 ? i(this, 0, c) : Q.apply(this, arguments);
    }, d.prototype.toLocaleString = d.prototype.toString, d.prototype.equals = function(c) {
      if (!d.isBuffer(c)) throw new TypeError("Argument must be a Buffer");
      return this === c ? !0 : d.compare(this, c) === 0;
    }, d.prototype.inspect = function() {
      let c = "";
      const h = t.INSPECT_MAX_BYTES;
      return c = this.toString("hex", 0, h).replace(/(.{2})/g, "$1 ").trim(), this.length > h && (c += " ... "), "<Buffer " + c + ">";
    }, n && (d.prototype[n] = d.prototype.inspect), d.prototype.compare = function(c, h, A, M, P) {
      if (fe(c, Uint8Array) && (c = d.from(c, c.offset, c.byteLength)), !d.isBuffer(c))
        throw new TypeError(
          'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof c
        );
      if (h === void 0 && (h = 0), A === void 0 && (A = c ? c.length : 0), M === void 0 && (M = 0), P === void 0 && (P = this.length), h < 0 || A > c.length || M < 0 || P > this.length)
        throw new RangeError("out of range index");
      if (M >= P && h >= A)
        return 0;
      if (M >= P)
        return -1;
      if (h >= A)
        return 1;
      if (h >>>= 0, A >>>= 0, M >>>= 0, P >>>= 0, this === c) return 0;
      let q = P - M, ht = A - h;
      const ct = Math.min(q, ht), ut = this.slice(M, P), At = c.slice(h, A);
      for (let st = 0; st < ct; ++st)
        if (ut[st] !== At[st]) {
          q = ut[st], ht = At[st];
          break;
        }
      return q < ht ? -1 : ht < q ? 1 : 0;
    };
    function nt(R, c, h, A, M) {
      if (R.length === 0) return -1;
      if (typeof h == "string" ? (A = h, h = 0) : h > 2147483647 ? h = 2147483647 : h < -2147483648 && (h = -2147483648), h = +h, St(h) && (h = M ? 0 : R.length - 1), h < 0 && (h = R.length + h), h >= R.length) {
        if (M) return -1;
        h = R.length - 1;
      } else if (h < 0)
        if (M) h = 0;
        else return -1;
      if (typeof c == "string" && (c = d.from(c, A)), d.isBuffer(c))
        return c.length === 0 ? -1 : at(R, c, h, A, M);
      if (typeof c == "number")
        return c = c & 255, typeof Uint8Array.prototype.indexOf == "function" ? M ? Uint8Array.prototype.indexOf.call(R, c, h) : Uint8Array.prototype.lastIndexOf.call(R, c, h) : at(R, [c], h, A, M);
      throw new TypeError("val must be string, number or Buffer");
    }
    function at(R, c, h, A, M) {
      let P = 1, q = R.length, ht = c.length;
      if (A !== void 0 && (A = String(A).toLowerCase(), A === "ucs2" || A === "ucs-2" || A === "utf16le" || A === "utf-16le")) {
        if (R.length < 2 || c.length < 2)
          return -1;
        P = 2, q /= 2, ht /= 2, h /= 2;
      }
      function ct(At, st) {
        return P === 1 ? At[st] : At.readUInt16BE(st * P);
      }
      let ut;
      if (M) {
        let At = -1;
        for (ut = h; ut < q; ut++)
          if (ct(R, ut) === ct(c, At === -1 ? 0 : ut - At)) {
            if (At === -1 && (At = ut), ut - At + 1 === ht) return At * P;
          } else
            At !== -1 && (ut -= ut - At), At = -1;
      } else
        for (h + ht > q && (h = q - ht), ut = h; ut >= 0; ut--) {
          let At = !0;
          for (let st = 0; st < ht; st++)
            if (ct(R, ut + st) !== ct(c, st)) {
              At = !1;
              break;
            }
          if (At) return ut;
        }
      return -1;
    }
    d.prototype.includes = function(c, h, A) {
      return this.indexOf(c, h, A) !== -1;
    }, d.prototype.indexOf = function(c, h, A) {
      return nt(this, c, h, A, !0);
    }, d.prototype.lastIndexOf = function(c, h, A) {
      return nt(this, c, h, A, !1);
    };
    function it(R, c, h, A) {
      h = Number(h) || 0;
      const M = R.length - h;
      A ? (A = Number(A), A > M && (A = M)) : A = M;
      const P = c.length;
      A > P / 2 && (A = P / 2);
      let q;
      for (q = 0; q < A; ++q) {
        const ht = parseInt(c.substr(q * 2, 2), 16);
        if (St(ht)) return q;
        R[h + q] = ht;
      }
      return q;
    }
    function C(R, c, h, A) {
      return yt(wt(c, R.length - h), R, h, A);
    }
    function U(R, c, h, A) {
      return yt(It(c), R, h, A);
    }
    function G(R, c, h, A) {
      return yt(vt(c), R, h, A);
    }
    function z(R, c, h, A) {
      return yt(yr(c, R.length - h), R, h, A);
    }
    d.prototype.write = function(c, h, A, M) {
      if (h === void 0)
        M = "utf8", A = this.length, h = 0;
      else if (A === void 0 && typeof h == "string")
        M = h, A = this.length, h = 0;
      else if (isFinite(h))
        h = h >>> 0, isFinite(A) ? (A = A >>> 0, M === void 0 && (M = "utf8")) : (M = A, A = void 0);
      else
        throw new Error(
          "Buffer.write(string, encoding, offset[, length]) is no longer supported"
        );
      const P = this.length - h;
      if ((A === void 0 || A > P) && (A = P), c.length > 0 && (A < 0 || h < 0) || h > this.length)
        throw new RangeError("Attempt to write outside buffer bounds");
      M || (M = "utf8");
      let q = !1;
      for (; ; )
        switch (M) {
          case "hex":
            return it(this, c, h, A);
          case "utf8":
          case "utf-8":
            return C(this, c, h, A);
          case "ascii":
          case "latin1":
          case "binary":
            return U(this, c, h, A);
          case "base64":
            return G(this, c, h, A);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return z(this, c, h, A);
          default:
            if (q) throw new TypeError("Unknown encoding: " + M);
            M = ("" + M).toLowerCase(), q = !0;
        }
    }, d.prototype.toJSON = function() {
      return {
        type: "Buffer",
        data: Array.prototype.slice.call(this._arr || this, 0)
      };
    };
    function g(R, c, h) {
      return c === 0 && h === R.length ? e.fromByteArray(R) : e.fromByteArray(R.slice(c, h));
    }
    function i(R, c, h) {
      h = Math.min(R.length, h);
      const A = [];
      let M = c;
      for (; M < h; ) {
        const P = R[M];
        let q = null, ht = P > 239 ? 4 : P > 223 ? 3 : P > 191 ? 2 : 1;
        if (M + ht <= h) {
          let ct, ut, At, st;
          switch (ht) {
            case 1:
              P < 128 && (q = P);
              break;
            case 2:
              ct = R[M + 1], (ct & 192) === 128 && (st = (P & 31) << 6 | ct & 63, st > 127 && (q = st));
              break;
            case 3:
              ct = R[M + 1], ut = R[M + 2], (ct & 192) === 128 && (ut & 192) === 128 && (st = (P & 15) << 12 | (ct & 63) << 6 | ut & 63, st > 2047 && (st < 55296 || st > 57343) && (q = st));
              break;
            case 4:
              ct = R[M + 1], ut = R[M + 2], At = R[M + 3], (ct & 192) === 128 && (ut & 192) === 128 && (At & 192) === 128 && (st = (P & 15) << 18 | (ct & 63) << 12 | (ut & 63) << 6 | At & 63, st > 65535 && st < 1114112 && (q = st));
          }
        }
        q === null ? (q = 65533, ht = 1) : q > 65535 && (q -= 65536, A.push(q >>> 10 & 1023 | 55296), q = 56320 | q & 1023), A.push(q), M += ht;
      }
      return p(A);
    }
    const f = 4096;
    function p(R) {
      const c = R.length;
      if (c <= f)
        return String.fromCharCode.apply(String, R);
      let h = "", A = 0;
      for (; A < c; )
        h += String.fromCharCode.apply(
          String,
          R.slice(A, A += f)
        );
      return h;
    }
    function y(R, c, h) {
      let A = "";
      h = Math.min(R.length, h);
      for (let M = c; M < h; ++M)
        A += String.fromCharCode(R[M] & 127);
      return A;
    }
    function w(R, c, h) {
      let A = "";
      h = Math.min(R.length, h);
      for (let M = c; M < h; ++M)
        A += String.fromCharCode(R[M]);
      return A;
    }
    function v(R, c, h) {
      const A = R.length;
      (!c || c < 0) && (c = 0), (!h || h < 0 || h > A) && (h = A);
      let M = "";
      for (let P = c; P < h; ++P)
        M += bt[R[P]];
      return M;
    }
    function T(R, c, h) {
      const A = R.slice(c, h);
      let M = "";
      for (let P = 0; P < A.length - 1; P += 2)
        M += String.fromCharCode(A[P] + A[P + 1] * 256);
      return M;
    }
    d.prototype.slice = function(c, h) {
      const A = this.length;
      c = ~~c, h = h === void 0 ? A : ~~h, c < 0 ? (c += A, c < 0 && (c = 0)) : c > A && (c = A), h < 0 ? (h += A, h < 0 && (h = 0)) : h > A && (h = A), h < c && (h = c);
      const M = this.subarray(c, h);
      return Object.setPrototypeOf(M, d.prototype), M;
    };
    function m(R, c, h) {
      if (R % 1 !== 0 || R < 0) throw new RangeError("offset is not uint");
      if (R + c > h) throw new RangeError("Trying to access beyond buffer length");
    }
    d.prototype.readUintLE = d.prototype.readUIntLE = function(c, h, A) {
      c = c >>> 0, h = h >>> 0, A || m(c, h, this.length);
      let M = this[c], P = 1, q = 0;
      for (; ++q < h && (P *= 256); )
        M += this[c + q] * P;
      return M;
    }, d.prototype.readUintBE = d.prototype.readUIntBE = function(c, h, A) {
      c = c >>> 0, h = h >>> 0, A || m(c, h, this.length);
      let M = this[c + --h], P = 1;
      for (; h > 0 && (P *= 256); )
        M += this[c + --h] * P;
      return M;
    }, d.prototype.readUint8 = d.prototype.readUInt8 = function(c, h) {
      return c = c >>> 0, h || m(c, 1, this.length), this[c];
    }, d.prototype.readUint16LE = d.prototype.readUInt16LE = function(c, h) {
      return c = c >>> 0, h || m(c, 2, this.length), this[c] | this[c + 1] << 8;
    }, d.prototype.readUint16BE = d.prototype.readUInt16BE = function(c, h) {
      return c = c >>> 0, h || m(c, 2, this.length), this[c] << 8 | this[c + 1];
    }, d.prototype.readUint32LE = d.prototype.readUInt32LE = function(c, h) {
      return c = c >>> 0, h || m(c, 4, this.length), (this[c] | this[c + 1] << 8 | this[c + 2] << 16) + this[c + 3] * 16777216;
    }, d.prototype.readUint32BE = d.prototype.readUInt32BE = function(c, h) {
      return c = c >>> 0, h || m(c, 4, this.length), this[c] * 16777216 + (this[c + 1] << 16 | this[c + 2] << 8 | this[c + 3]);
    }, d.prototype.readBigUInt64LE = _e(function(c) {
      c = c >>> 0, he(c, "offset");
      const h = this[c], A = this[c + 7];
      (h === void 0 || A === void 0) && Et(c, this.length - 8);
      const M = h + this[++c] * 2 ** 8 + this[++c] * 2 ** 16 + this[++c] * 2 ** 24, P = this[++c] + this[++c] * 2 ** 8 + this[++c] * 2 ** 16 + A * 2 ** 24;
      return BigInt(M) + (BigInt(P) << BigInt(32));
    }), d.prototype.readBigUInt64BE = _e(function(c) {
      c = c >>> 0, he(c, "offset");
      const h = this[c], A = this[c + 7];
      (h === void 0 || A === void 0) && Et(c, this.length - 8);
      const M = h * 2 ** 24 + this[++c] * 2 ** 16 + this[++c] * 2 ** 8 + this[++c], P = this[++c] * 2 ** 24 + this[++c] * 2 ** 16 + this[++c] * 2 ** 8 + A;
      return (BigInt(M) << BigInt(32)) + BigInt(P);
    }), d.prototype.readIntLE = function(c, h, A) {
      c = c >>> 0, h = h >>> 0, A || m(c, h, this.length);
      let M = this[c], P = 1, q = 0;
      for (; ++q < h && (P *= 256); )
        M += this[c + q] * P;
      return P *= 128, M >= P && (M -= Math.pow(2, 8 * h)), M;
    }, d.prototype.readIntBE = function(c, h, A) {
      c = c >>> 0, h = h >>> 0, A || m(c, h, this.length);
      let M = h, P = 1, q = this[c + --M];
      for (; M > 0 && (P *= 256); )
        q += this[c + --M] * P;
      return P *= 128, q >= P && (q -= Math.pow(2, 8 * h)), q;
    }, d.prototype.readInt8 = function(c, h) {
      return c = c >>> 0, h || m(c, 1, this.length), this[c] & 128 ? (255 - this[c] + 1) * -1 : this[c];
    }, d.prototype.readInt16LE = function(c, h) {
      c = c >>> 0, h || m(c, 2, this.length);
      const A = this[c] | this[c + 1] << 8;
      return A & 32768 ? A | 4294901760 : A;
    }, d.prototype.readInt16BE = function(c, h) {
      c = c >>> 0, h || m(c, 2, this.length);
      const A = this[c + 1] | this[c] << 8;
      return A & 32768 ? A | 4294901760 : A;
    }, d.prototype.readInt32LE = function(c, h) {
      return c = c >>> 0, h || m(c, 4, this.length), this[c] | this[c + 1] << 8 | this[c + 2] << 16 | this[c + 3] << 24;
    }, d.prototype.readInt32BE = function(c, h) {
      return c = c >>> 0, h || m(c, 4, this.length), this[c] << 24 | this[c + 1] << 16 | this[c + 2] << 8 | this[c + 3];
    }, d.prototype.readBigInt64LE = _e(function(c) {
      c = c >>> 0, he(c, "offset");
      const h = this[c], A = this[c + 7];
      (h === void 0 || A === void 0) && Et(c, this.length - 8);
      const M = this[c + 4] + this[c + 5] * 2 ** 8 + this[c + 6] * 2 ** 16 + (A << 24);
      return (BigInt(M) << BigInt(32)) + BigInt(h + this[++c] * 2 ** 8 + this[++c] * 2 ** 16 + this[++c] * 2 ** 24);
    }), d.prototype.readBigInt64BE = _e(function(c) {
      c = c >>> 0, he(c, "offset");
      const h = this[c], A = this[c + 7];
      (h === void 0 || A === void 0) && Et(c, this.length - 8);
      const M = (h << 24) + // Overflow
      this[++c] * 2 ** 16 + this[++c] * 2 ** 8 + this[++c];
      return (BigInt(M) << BigInt(32)) + BigInt(this[++c] * 2 ** 24 + this[++c] * 2 ** 16 + this[++c] * 2 ** 8 + A);
    }), d.prototype.readFloatLE = function(c, h) {
      return c = c >>> 0, h || m(c, 4, this.length), r.read(this, c, !0, 23, 4);
    }, d.prototype.readFloatBE = function(c, h) {
      return c = c >>> 0, h || m(c, 4, this.length), r.read(this, c, !1, 23, 4);
    }, d.prototype.readDoubleLE = function(c, h) {
      return c = c >>> 0, h || m(c, 8, this.length), r.read(this, c, !0, 52, 8);
    }, d.prototype.readDoubleBE = function(c, h) {
      return c = c >>> 0, h || m(c, 8, this.length), r.read(this, c, !1, 52, 8);
    };
    function s(R, c, h, A, M, P) {
      if (!d.isBuffer(R)) throw new TypeError('"buffer" argument must be a Buffer instance');
      if (c > M || c < P) throw new RangeError('"value" argument is out of bounds');
      if (h + A > R.length) throw new RangeError("Index out of range");
    }
    d.prototype.writeUintLE = d.prototype.writeUIntLE = function(c, h, A, M) {
      if (c = +c, h = h >>> 0, A = A >>> 0, !M) {
        const ht = Math.pow(2, 8 * A) - 1;
        s(this, c, h, A, ht, 0);
      }
      let P = 1, q = 0;
      for (this[h] = c & 255; ++q < A && (P *= 256); )
        this[h + q] = c / P & 255;
      return h + A;
    }, d.prototype.writeUintBE = d.prototype.writeUIntBE = function(c, h, A, M) {
      if (c = +c, h = h >>> 0, A = A >>> 0, !M) {
        const ht = Math.pow(2, 8 * A) - 1;
        s(this, c, h, A, ht, 0);
      }
      let P = A - 1, q = 1;
      for (this[h + P] = c & 255; --P >= 0 && (q *= 256); )
        this[h + P] = c / q & 255;
      return h + A;
    }, d.prototype.writeUint8 = d.prototype.writeUInt8 = function(c, h, A) {
      return c = +c, h = h >>> 0, A || s(this, c, h, 1, 255, 0), this[h] = c & 255, h + 1;
    }, d.prototype.writeUint16LE = d.prototype.writeUInt16LE = function(c, h, A) {
      return c = +c, h = h >>> 0, A || s(this, c, h, 2, 65535, 0), this[h] = c & 255, this[h + 1] = c >>> 8, h + 2;
    }, d.prototype.writeUint16BE = d.prototype.writeUInt16BE = function(c, h, A) {
      return c = +c, h = h >>> 0, A || s(this, c, h, 2, 65535, 0), this[h] = c >>> 8, this[h + 1] = c & 255, h + 2;
    }, d.prototype.writeUint32LE = d.prototype.writeUInt32LE = function(c, h, A) {
      return c = +c, h = h >>> 0, A || s(this, c, h, 4, 4294967295, 0), this[h + 3] = c >>> 24, this[h + 2] = c >>> 16, this[h + 1] = c >>> 8, this[h] = c & 255, h + 4;
    }, d.prototype.writeUint32BE = d.prototype.writeUInt32BE = function(c, h, A) {
      return c = +c, h = h >>> 0, A || s(this, c, h, 4, 4294967295, 0), this[h] = c >>> 24, this[h + 1] = c >>> 16, this[h + 2] = c >>> 8, this[h + 3] = c & 255, h + 4;
    };
    function u(R, c, h, A, M) {
      Rt(c, A, M, R, h, 7);
      let P = Number(c & BigInt(4294967295));
      R[h++] = P, P = P >> 8, R[h++] = P, P = P >> 8, R[h++] = P, P = P >> 8, R[h++] = P;
      let q = Number(c >> BigInt(32) & BigInt(4294967295));
      return R[h++] = q, q = q >> 8, R[h++] = q, q = q >> 8, R[h++] = q, q = q >> 8, R[h++] = q, h;
    }
    function E(R, c, h, A, M) {
      Rt(c, A, M, R, h, 7);
      let P = Number(c & BigInt(4294967295));
      R[h + 7] = P, P = P >> 8, R[h + 6] = P, P = P >> 8, R[h + 5] = P, P = P >> 8, R[h + 4] = P;
      let q = Number(c >> BigInt(32) & BigInt(4294967295));
      return R[h + 3] = q, q = q >> 8, R[h + 2] = q, q = q >> 8, R[h + 1] = q, q = q >> 8, R[h] = q, h + 8;
    }
    d.prototype.writeBigUInt64LE = _e(function(c, h = 0) {
      return u(this, c, h, BigInt(0), BigInt("0xffffffffffffffff"));
    }), d.prototype.writeBigUInt64BE = _e(function(c, h = 0) {
      return E(this, c, h, BigInt(0), BigInt("0xffffffffffffffff"));
    }), d.prototype.writeIntLE = function(c, h, A, M) {
      if (c = +c, h = h >>> 0, !M) {
        const ct = Math.pow(2, 8 * A - 1);
        s(this, c, h, A, ct - 1, -ct);
      }
      let P = 0, q = 1, ht = 0;
      for (this[h] = c & 255; ++P < A && (q *= 256); )
        c < 0 && ht === 0 && this[h + P - 1] !== 0 && (ht = 1), this[h + P] = (c / q >> 0) - ht & 255;
      return h + A;
    }, d.prototype.writeIntBE = function(c, h, A, M) {
      if (c = +c, h = h >>> 0, !M) {
        const ct = Math.pow(2, 8 * A - 1);
        s(this, c, h, A, ct - 1, -ct);
      }
      let P = A - 1, q = 1, ht = 0;
      for (this[h + P] = c & 255; --P >= 0 && (q *= 256); )
        c < 0 && ht === 0 && this[h + P + 1] !== 0 && (ht = 1), this[h + P] = (c / q >> 0) - ht & 255;
      return h + A;
    }, d.prototype.writeInt8 = function(c, h, A) {
      return c = +c, h = h >>> 0, A || s(this, c, h, 1, 127, -128), c < 0 && (c = 255 + c + 1), this[h] = c & 255, h + 1;
    }, d.prototype.writeInt16LE = function(c, h, A) {
      return c = +c, h = h >>> 0, A || s(this, c, h, 2, 32767, -32768), this[h] = c & 255, this[h + 1] = c >>> 8, h + 2;
    }, d.prototype.writeInt16BE = function(c, h, A) {
      return c = +c, h = h >>> 0, A || s(this, c, h, 2, 32767, -32768), this[h] = c >>> 8, this[h + 1] = c & 255, h + 2;
    }, d.prototype.writeInt32LE = function(c, h, A) {
      return c = +c, h = h >>> 0, A || s(this, c, h, 4, 2147483647, -2147483648), this[h] = c & 255, this[h + 1] = c >>> 8, this[h + 2] = c >>> 16, this[h + 3] = c >>> 24, h + 4;
    }, d.prototype.writeInt32BE = function(c, h, A) {
      return c = +c, h = h >>> 0, A || s(this, c, h, 4, 2147483647, -2147483648), c < 0 && (c = 4294967295 + c + 1), this[h] = c >>> 24, this[h + 1] = c >>> 16, this[h + 2] = c >>> 8, this[h + 3] = c & 255, h + 4;
    }, d.prototype.writeBigInt64LE = _e(function(c, h = 0) {
      return u(this, c, h, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    }), d.prototype.writeBigInt64BE = _e(function(c, h = 0) {
      return E(this, c, h, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    function S(R, c, h, A, M, P) {
      if (h + A > R.length) throw new RangeError("Index out of range");
      if (h < 0) throw new RangeError("Index out of range");
    }
    function D(R, c, h, A, M) {
      return c = +c, h = h >>> 0, M || S(R, c, h, 4), r.write(R, c, h, A, 23, 4), h + 4;
    }
    d.prototype.writeFloatLE = function(c, h, A) {
      return D(this, c, h, !0, A);
    }, d.prototype.writeFloatBE = function(c, h, A) {
      return D(this, c, h, !1, A);
    };
    function X(R, c, h, A, M) {
      return c = +c, h = h >>> 0, M || S(R, c, h, 8), r.write(R, c, h, A, 52, 8), h + 8;
    }
    d.prototype.writeDoubleLE = function(c, h, A) {
      return X(this, c, h, !0, A);
    }, d.prototype.writeDoubleBE = function(c, h, A) {
      return X(this, c, h, !1, A);
    }, d.prototype.copy = function(c, h, A, M) {
      if (!d.isBuffer(c)) throw new TypeError("argument should be a Buffer");
      if (A || (A = 0), !M && M !== 0 && (M = this.length), h >= c.length && (h = c.length), h || (h = 0), M > 0 && M < A && (M = A), M === A || c.length === 0 || this.length === 0) return 0;
      if (h < 0)
        throw new RangeError("targetStart out of bounds");
      if (A < 0 || A >= this.length) throw new RangeError("Index out of range");
      if (M < 0) throw new RangeError("sourceEnd out of bounds");
      M > this.length && (M = this.length), c.length - h < M - A && (M = c.length - h + A);
      const P = M - A;
      return this === c && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(h, A, M) : Uint8Array.prototype.set.call(
        c,
        this.subarray(A, M),
        h
      ), P;
    }, d.prototype.fill = function(c, h, A, M) {
      if (typeof c == "string") {
        if (typeof h == "string" ? (M = h, h = 0, A = this.length) : typeof A == "string" && (M = A, A = this.length), M !== void 0 && typeof M != "string")
          throw new TypeError("encoding must be a string");
        if (typeof M == "string" && !d.isEncoding(M))
          throw new TypeError("Unknown encoding: " + M);
        if (c.length === 1) {
          const q = c.charCodeAt(0);
          (M === "utf8" && q < 128 || M === "latin1") && (c = q);
        }
      } else typeof c == "number" ? c = c & 255 : typeof c == "boolean" && (c = Number(c));
      if (h < 0 || this.length < h || this.length < A)
        throw new RangeError("Out of range index");
      if (A <= h)
        return this;
      h = h >>> 0, A = A === void 0 ? this.length : A >>> 0, c || (c = 0);
      let P;
      if (typeof c == "number")
        for (P = h; P < A; ++P)
          this[P] = c;
      else {
        const q = d.isBuffer(c) ? c : d.from(c, M), ht = q.length;
        if (ht === 0)
          throw new TypeError('The value "' + c + '" is invalid for argument "value"');
        for (P = 0; P < A - h; ++P)
          this[P + h] = q[P % ht];
      }
      return this;
    };
    const J = {};
    function et(R, c, h) {
      J[R] = class extends h {
        constructor() {
          super(), Object.defineProperty(this, "message", {
            value: c.apply(this, arguments),
            writable: !0,
            configurable: !0
          }), this.name = `${this.name} [${R}]`, this.stack, delete this.name;
        }
        get code() {
          return R;
        }
        set code(M) {
          Object.defineProperty(this, "code", {
            configurable: !0,
            enumerable: !0,
            value: M,
            writable: !0
          });
        }
        toString() {
          return `${this.name} [${R}]: ${this.message}`;
        }
      };
    }
    et(
      "ERR_BUFFER_OUT_OF_BOUNDS",
      function(R) {
        return R ? `${R} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
      },
      RangeError
    ), et(
      "ERR_INVALID_ARG_TYPE",
      function(R, c) {
        return `The "${R}" argument must be of type number. Received type ${typeof c}`;
      },
      TypeError
    ), et(
      "ERR_OUT_OF_RANGE",
      function(R, c, h) {
        let A = `The value of "${R}" is out of range.`, M = h;
        return Number.isInteger(h) && Math.abs(h) > 2 ** 32 ? M = dt(String(h)) : typeof h == "bigint" && (M = String(h), (h > BigInt(2) ** BigInt(32) || h < -(BigInt(2) ** BigInt(32))) && (M = dt(M)), M += "n"), A += ` It must be ${c}. Received ${M}`, A;
      },
      RangeError
    );
    function dt(R) {
      let c = "", h = R.length;
      const A = R[0] === "-" ? 1 : 0;
      for (; h >= A + 4; h -= 3)
        c = `_${R.slice(h - 3, h)}${c}`;
      return `${R.slice(0, h)}${c}`;
    }
    function pt(R, c, h) {
      he(c, "offset"), (R[c] === void 0 || R[c + h] === void 0) && Et(c, R.length - (h + 1));
    }
    function Rt(R, c, h, A, M, P) {
      if (R > h || R < c) {
        const q = typeof c == "bigint" ? "n" : "";
        let ht;
        throw c === 0 || c === BigInt(0) ? ht = `>= 0${q} and < 2${q} ** ${(P + 1) * 8}${q}` : ht = `>= -(2${q} ** ${(P + 1) * 8 - 1}${q}) and < 2 ** ${(P + 1) * 8 - 1}${q}`, new J.ERR_OUT_OF_RANGE("value", ht, R);
      }
      pt(A, M, P);
    }
    function he(R, c) {
      if (typeof R != "number")
        throw new J.ERR_INVALID_ARG_TYPE(c, "number", R);
    }
    function Et(R, c, h) {
      throw Math.floor(R) !== R ? (he(R, h), new J.ERR_OUT_OF_RANGE("offset", "an integer", R)) : c < 0 ? new J.ERR_BUFFER_OUT_OF_BOUNDS() : new J.ERR_OUT_OF_RANGE(
        "offset",
        `>= 0 and <= ${c}`,
        R
      );
    }
    const Nt = /[^+/0-9A-Za-z-_]/g;
    function mr(R) {
      if (R = R.split("=")[0], R = R.trim().replace(Nt, ""), R.length < 2) return "";
      for (; R.length % 4 !== 0; )
        R = R + "=";
      return R;
    }
    function wt(R, c) {
      c = c || 1 / 0;
      let h;
      const A = R.length;
      let M = null;
      const P = [];
      for (let q = 0; q < A; ++q) {
        if (h = R.charCodeAt(q), h > 55295 && h < 57344) {
          if (!M) {
            if (h > 56319) {
              (c -= 3) > -1 && P.push(239, 191, 189);
              continue;
            } else if (q + 1 === A) {
              (c -= 3) > -1 && P.push(239, 191, 189);
              continue;
            }
            M = h;
            continue;
          }
          if (h < 56320) {
            (c -= 3) > -1 && P.push(239, 191, 189), M = h;
            continue;
          }
          h = (M - 55296 << 10 | h - 56320) + 65536;
        } else M && (c -= 3) > -1 && P.push(239, 191, 189);
        if (M = null, h < 128) {
          if ((c -= 1) < 0) break;
          P.push(h);
        } else if (h < 2048) {
          if ((c -= 2) < 0) break;
          P.push(
            h >> 6 | 192,
            h & 63 | 128
          );
        } else if (h < 65536) {
          if ((c -= 3) < 0) break;
          P.push(
            h >> 12 | 224,
            h >> 6 & 63 | 128,
            h & 63 | 128
          );
        } else if (h < 1114112) {
          if ((c -= 4) < 0) break;
          P.push(
            h >> 18 | 240,
            h >> 12 & 63 | 128,
            h >> 6 & 63 | 128,
            h & 63 | 128
          );
        } else
          throw new Error("Invalid code point");
      }
      return P;
    }
    function It(R) {
      const c = [];
      for (let h = 0; h < R.length; ++h)
        c.push(R.charCodeAt(h) & 255);
      return c;
    }
    function yr(R, c) {
      let h, A, M;
      const P = [];
      for (let q = 0; q < R.length && !((c -= 2) < 0); ++q)
        h = R.charCodeAt(q), A = h >> 8, M = h % 256, P.push(M), P.push(A);
      return P;
    }
    function vt(R) {
      return e.toByteArray(mr(R));
    }
    function yt(R, c, h, A) {
      let M;
      for (M = 0; M < A && !(M + h >= c.length || M >= R.length); ++M)
        c[M + h] = R[M];
      return M;
    }
    function fe(R, c) {
      return R instanceof c || R != null && R.constructor != null && R.constructor.name != null && R.constructor.name === c.name;
    }
    function St(R) {
      return R !== R;
    }
    const bt = (function() {
      const R = "0123456789abcdef", c = new Array(256);
      for (let h = 0; h < 16; ++h) {
        const A = h * 16;
        for (let M = 0; M < 16; ++M)
          c[A + M] = R[h] + R[M];
      }
      return c;
    })();
    function _e(R) {
      return typeof BigInt > "u" ? xt : R;
    }
    function xt() {
      throw new Error("BigInt not supported");
    }
  })(wn)), wn;
}
var _t = Wn();
const Xe = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
function lr(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Kn(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function Ve(t, ...e) {
  if (!lr(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function ao(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  Kn(t.outputLen), Kn(t.blockLen);
}
function Cr(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Ss(t, e) {
  Ve(t);
  const r = e.outputLen;
  if (t.length < r)
    throw new Error("digestInto() expects output buffer of length at least " + r);
}
function rr(...t) {
  for (let e = 0; e < t.length; e++)
    t[e].fill(0);
}
function Sn(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function me(t, e) {
  return t << 32 - e | t >>> e;
}
const uo = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Os = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function $e(t) {
  if (Ve(t), uo)
    return t.toHex();
  let e = "";
  for (let r = 0; r < t.length; r++)
    e += Os[t[r]];
  return e;
}
const ve = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function vi(t) {
  if (t >= ve._0 && t <= ve._9)
    return t - ve._0;
  if (t >= ve.A && t <= ve.F)
    return t - (ve.A - 10);
  if (t >= ve.a && t <= ve.f)
    return t - (ve.a - 10);
}
function Mr(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  if (uo)
    return Uint8Array.fromHex(t);
  const e = t.length, r = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const n = new Uint8Array(r);
  for (let a = 0, o = 0; a < r; a++, o += 2) {
    const l = vi(t.charCodeAt(o)), d = vi(t.charCodeAt(o + 1));
    if (l === void 0 || d === void 0) {
      const _ = t[o] + t[o + 1];
      throw new Error('hex string expected, got non-hex character "' + _ + '" at index ' + o);
    }
    n[a] = l * 16 + d;
  }
  return n;
}
function vs(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
function Jn(t) {
  return typeof t == "string" && (t = vs(t)), Ve(t), t;
}
function Ae(...t) {
  let e = 0;
  for (let n = 0; n < t.length; n++) {
    const a = t[n];
    Ve(a), e += a.length;
  }
  const r = new Uint8Array(e);
  for (let n = 0, a = 0; n < t.length; n++) {
    const o = t[n];
    r.set(o, a), a += o.length;
  }
  return r;
}
class co {
}
function fo(t) {
  const e = (n) => t().update(Jn(n)).digest(), r = t();
  return e.outputLen = r.outputLen, e.blockLen = r.blockLen, e.create = () => t(), e;
}
function Qn(t = 32) {
  if (Xe && typeof Xe.getRandomValues == "function")
    return Xe.getRandomValues(new Uint8Array(t));
  if (Xe && typeof Xe.randomBytes == "function")
    return Uint8Array.from(Xe.randomBytes(t));
  throw new Error("crypto.getRandomValues must be defined");
}
function Ns(t, e, r, n) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, r, n);
  const a = BigInt(32), o = BigInt(4294967295), l = Number(r >> a & o), d = Number(r & o), _ = n ? 4 : 0, N = n ? 0 : 4;
  t.setUint32(e + _, l, n), t.setUint32(e + N, d, n);
}
function Is(t, e, r) {
  return t & e ^ ~t & r;
}
function bs(t, e, r) {
  return t & e ^ t & r ^ e & r;
}
class ho extends co {
  constructor(e, r, n, a) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = e, this.outputLen = r, this.padOffset = n, this.isLE = a, this.buffer = new Uint8Array(e), this.view = Sn(this.buffer);
  }
  update(e) {
    Cr(this), e = Jn(e), Ve(e);
    const { view: r, buffer: n, blockLen: a } = this, o = e.length;
    for (let l = 0; l < o; ) {
      const d = Math.min(a - this.pos, o - l);
      if (d === a) {
        const _ = Sn(e);
        for (; a <= o - l; l += a)
          this.process(_, l);
        continue;
      }
      n.set(e.subarray(l, l + d), this.pos), this.pos += d, l += d, this.pos === a && (this.process(r, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Cr(this), Ss(e, this), this.finished = !0;
    const { buffer: r, view: n, blockLen: a, isLE: o } = this;
    let { pos: l } = this;
    r[l++] = 128, rr(this.buffer.subarray(l)), this.padOffset > a - l && (this.process(n, 0), l = 0);
    for (let x = l; x < a; x++)
      r[x] = 0;
    Ns(n, a - 8, BigInt(this.length * 8), o), this.process(n, 0);
    const d = Sn(e), _ = this.outputLen;
    if (_ % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const N = _ / 4, L = this.get();
    if (N > L.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let x = 0; x < N; x++)
      d.setUint32(4 * x, L[x], o);
  }
  digest() {
    const { buffer: e, outputLen: r } = this;
    this.digestInto(e);
    const n = e.slice(0, r);
    return this.destroy(), n;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: r, buffer: n, length: a, finished: o, destroyed: l, pos: d } = this;
    return e.destroyed = l, e.finished = o, e.length = a, e.pos = d, a % r && e.buffer.set(n), e;
  }
  clone() {
    return this._cloneInto();
  }
}
const Le = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), ne = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  4089235720,
  3144134277,
  2227873595,
  1013904242,
  4271175723,
  2773480762,
  1595750129,
  1359893119,
  2917565137,
  2600822924,
  725511199,
  528734635,
  4215389547,
  1541459225,
  327033209
]), wr = /* @__PURE__ */ BigInt(2 ** 32 - 1), Ni = /* @__PURE__ */ BigInt(32);
function xs(t, e = !1) {
  return e ? { h: Number(t & wr), l: Number(t >> Ni & wr) } : { h: Number(t >> Ni & wr) | 0, l: Number(t & wr) | 0 };
}
function Ts(t, e = !1) {
  const r = t.length;
  let n = new Uint32Array(r), a = new Uint32Array(r);
  for (let o = 0; o < r; o++) {
    const { h: l, l: d } = xs(t[o], e);
    [n[o], a[o]] = [l, d];
  }
  return [n, a];
}
const Ii = (t, e, r) => t >>> r, bi = (t, e, r) => t << 32 - r | e >>> r, Ye = (t, e, r) => t >>> r | e << 32 - r, Ze = (t, e, r) => t << 32 - r | e >>> r, Sr = (t, e, r) => t << 64 - r | e >>> r - 32, Or = (t, e, r) => t >>> r - 32 | e << 64 - r;
function Ne(t, e, r, n) {
  const a = (e >>> 0) + (n >>> 0);
  return { h: t + r + (a / 2 ** 32 | 0) | 0, l: a | 0 };
}
const Ls = (t, e, r) => (t >>> 0) + (e >>> 0) + (r >>> 0), Bs = (t, e, r, n) => e + r + n + (t / 2 ** 32 | 0) | 0, Cs = (t, e, r, n) => (t >>> 0) + (e >>> 0) + (r >>> 0) + (n >>> 0), Ms = (t, e, r, n, a) => e + r + n + a + (t / 2 ** 32 | 0) | 0, Us = (t, e, r, n, a) => (t >>> 0) + (e >>> 0) + (r >>> 0) + (n >>> 0) + (a >>> 0), Ds = (t, e, r, n, a, o) => e + r + n + a + o + (t / 2 ** 32 | 0) | 0, Fs = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]), Be = /* @__PURE__ */ new Uint32Array(64);
class ks extends ho {
  constructor(e = 32) {
    super(64, e, 8, !1), this.A = Le[0] | 0, this.B = Le[1] | 0, this.C = Le[2] | 0, this.D = Le[3] | 0, this.E = Le[4] | 0, this.F = Le[5] | 0, this.G = Le[6] | 0, this.H = Le[7] | 0;
  }
  get() {
    const { A: e, B: r, C: n, D: a, E: o, F: l, G: d, H: _ } = this;
    return [e, r, n, a, o, l, d, _];
  }
  // prettier-ignore
  set(e, r, n, a, o, l, d, _) {
    this.A = e | 0, this.B = r | 0, this.C = n | 0, this.D = a | 0, this.E = o | 0, this.F = l | 0, this.G = d | 0, this.H = _ | 0;
  }
  process(e, r) {
    for (let x = 0; x < 16; x++, r += 4)
      Be[x] = e.getUint32(r, !1);
    for (let x = 16; x < 64; x++) {
      const I = Be[x - 15], O = Be[x - 2], B = me(I, 7) ^ me(I, 18) ^ I >>> 3, k = me(O, 17) ^ me(O, 19) ^ O >>> 10;
      Be[x] = k + Be[x - 7] + B + Be[x - 16] | 0;
    }
    let { A: n, B: a, C: o, D: l, E: d, F: _, G: N, H: L } = this;
    for (let x = 0; x < 64; x++) {
      const I = me(d, 6) ^ me(d, 11) ^ me(d, 25), O = L + I + Is(d, _, N) + Fs[x] + Be[x] | 0, k = (me(n, 2) ^ me(n, 13) ^ me(n, 22)) + bs(n, a, o) | 0;
      L = N, N = _, _ = d, d = l + O | 0, l = o, o = a, a = n, n = O + k | 0;
    }
    n = n + this.A | 0, a = a + this.B | 0, o = o + this.C | 0, l = l + this.D | 0, d = d + this.E | 0, _ = _ + this.F | 0, N = N + this.G | 0, L = L + this.H | 0, this.set(n, a, o, l, d, _, N, L);
  }
  roundClean() {
    rr(Be);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), rr(this.buffer);
  }
}
const lo = Ts([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((t) => BigInt(t))), Ps = lo[0], $s = lo[1], Ce = /* @__PURE__ */ new Uint32Array(80), Me = /* @__PURE__ */ new Uint32Array(80);
class Gs extends ho {
  constructor(e = 64) {
    super(128, e, 16, !1), this.Ah = ne[0] | 0, this.Al = ne[1] | 0, this.Bh = ne[2] | 0, this.Bl = ne[3] | 0, this.Ch = ne[4] | 0, this.Cl = ne[5] | 0, this.Dh = ne[6] | 0, this.Dl = ne[7] | 0, this.Eh = ne[8] | 0, this.El = ne[9] | 0, this.Fh = ne[10] | 0, this.Fl = ne[11] | 0, this.Gh = ne[12] | 0, this.Gl = ne[13] | 0, this.Hh = ne[14] | 0, this.Hl = ne[15] | 0;
  }
  // prettier-ignore
  get() {
    const { Ah: e, Al: r, Bh: n, Bl: a, Ch: o, Cl: l, Dh: d, Dl: _, Eh: N, El: L, Fh: x, Fl: I, Gh: O, Gl: B, Hh: k, Hl: F } = this;
    return [e, r, n, a, o, l, d, _, N, L, x, I, O, B, k, F];
  }
  // prettier-ignore
  set(e, r, n, a, o, l, d, _, N, L, x, I, O, B, k, F) {
    this.Ah = e | 0, this.Al = r | 0, this.Bh = n | 0, this.Bl = a | 0, this.Ch = o | 0, this.Cl = l | 0, this.Dh = d | 0, this.Dl = _ | 0, this.Eh = N | 0, this.El = L | 0, this.Fh = x | 0, this.Fl = I | 0, this.Gh = O | 0, this.Gl = B | 0, this.Hh = k | 0, this.Hl = F | 0;
  }
  process(e, r) {
    for (let $ = 0; $ < 16; $++, r += 4)
      Ce[$] = e.getUint32(r), Me[$] = e.getUint32(r += 4);
    for (let $ = 16; $ < 80; $++) {
      const Q = Ce[$ - 15] | 0, j = Me[$ - 15] | 0, nt = Ye(Q, j, 1) ^ Ye(Q, j, 8) ^ Ii(Q, j, 7), at = Ze(Q, j, 1) ^ Ze(Q, j, 8) ^ bi(Q, j, 7), it = Ce[$ - 2] | 0, C = Me[$ - 2] | 0, U = Ye(it, C, 19) ^ Sr(it, C, 61) ^ Ii(it, C, 6), G = Ze(it, C, 19) ^ Or(it, C, 61) ^ bi(it, C, 6), z = Cs(at, G, Me[$ - 7], Me[$ - 16]), g = Ms(z, nt, U, Ce[$ - 7], Ce[$ - 16]);
      Ce[$] = g | 0, Me[$] = z | 0;
    }
    let { Ah: n, Al: a, Bh: o, Bl: l, Ch: d, Cl: _, Dh: N, Dl: L, Eh: x, El: I, Fh: O, Fl: B, Gh: k, Gl: F, Hh: H, Hl: Y } = this;
    for (let $ = 0; $ < 80; $++) {
      const Q = Ye(x, I, 14) ^ Ye(x, I, 18) ^ Sr(x, I, 41), j = Ze(x, I, 14) ^ Ze(x, I, 18) ^ Or(x, I, 41), nt = x & O ^ ~x & k, at = I & B ^ ~I & F, it = Us(Y, j, at, $s[$], Me[$]), C = Ds(it, H, Q, nt, Ps[$], Ce[$]), U = it | 0, G = Ye(n, a, 28) ^ Sr(n, a, 34) ^ Sr(n, a, 39), z = Ze(n, a, 28) ^ Or(n, a, 34) ^ Or(n, a, 39), g = n & o ^ n & d ^ o & d, i = a & l ^ a & _ ^ l & _;
      H = k | 0, Y = F | 0, k = O | 0, F = B | 0, O = x | 0, B = I | 0, { h: x, l: I } = Ne(N | 0, L | 0, C | 0, U | 0), N = d | 0, L = _ | 0, d = o | 0, _ = l | 0, o = n | 0, l = a | 0;
      const f = Ls(U, z, i);
      n = Bs(f, C, G, g), a = f | 0;
    }
    ({ h: n, l: a } = Ne(this.Ah | 0, this.Al | 0, n | 0, a | 0)), { h: o, l } = Ne(this.Bh | 0, this.Bl | 0, o | 0, l | 0), { h: d, l: _ } = Ne(this.Ch | 0, this.Cl | 0, d | 0, _ | 0), { h: N, l: L } = Ne(this.Dh | 0, this.Dl | 0, N | 0, L | 0), { h: x, l: I } = Ne(this.Eh | 0, this.El | 0, x | 0, I | 0), { h: O, l: B } = Ne(this.Fh | 0, this.Fl | 0, O | 0, B | 0), { h: k, l: F } = Ne(this.Gh | 0, this.Gl | 0, k | 0, F | 0), { h: H, l: Y } = Ne(this.Hh | 0, this.Hl | 0, H | 0, Y | 0), this.set(n, a, o, l, d, _, N, L, x, I, O, B, k, F, H, Y);
  }
  roundClean() {
    rr(Ce, Me);
  }
  destroy() {
    rr(this.buffer), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}
const _o = /* @__PURE__ */ fo(() => new ks()), Vs = /* @__PURE__ */ fo(() => new Gs());
const ti = /* @__PURE__ */ BigInt(0), zn = /* @__PURE__ */ BigInt(1);
function Ge(t, e = "") {
  if (typeof t != "boolean") {
    const r = e && `"${e}"`;
    throw new Error(r + "expected boolean, got type=" + typeof t);
  }
  return t;
}
function ge(t, e, r = "") {
  const n = lr(t), a = t?.length, o = e !== void 0;
  if (!n || o && a !== e) {
    const l = r && `"${r}" `, d = o ? ` of length ${e}` : "", _ = n ? `length=${a}` : `type=${typeof t}`;
    throw new Error(l + "expected Uint8Array" + d + ", got " + _);
  }
  return t;
}
function vr(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function po(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? ti : BigInt("0x" + t);
}
function qr(t) {
  return po($e(t));
}
function cr(t) {
  return Ve(t), po($e(Uint8Array.from(t).reverse()));
}
function ei(t, e) {
  return Mr(t.toString(16).padStart(e * 2, "0"));
}
function go(t, e) {
  return ei(t, e).reverse();
}
function Lt(t, e, r) {
  let n;
  if (typeof e == "string")
    try {
      n = Mr(e);
    } catch (o) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + o);
    }
  else if (lr(e))
    n = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const a = n.length;
  if (typeof r == "number" && a !== r)
    throw new Error(t + " of length " + r + " expected, got " + a);
  return n;
}
function xi(t) {
  return Uint8Array.from(t);
}
const On = (t) => typeof t == "bigint" && ti <= t;
function Ks(t, e, r) {
  return On(t) && On(e) && On(r) && e <= t && t < r;
}
function Hn(t, e, r, n) {
  if (!Ks(e, r, n))
    throw new Error("expected valid " + t + ": " + r + " <= n < " + n + ", got " + e);
}
function Ro(t) {
  let e;
  for (e = 0; t > ti; t >>= zn, e += 1)
    ;
  return e;
}
const dr = (t) => (zn << BigInt(t)) - zn;
function zs(t, e, r) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof r != "function")
    throw new Error("hmacFn must be a function");
  const n = (O) => new Uint8Array(O), a = (O) => Uint8Array.of(O);
  let o = n(t), l = n(t), d = 0;
  const _ = () => {
    o.fill(1), l.fill(0), d = 0;
  }, N = (...O) => r(l, o, ...O), L = (O = n(0)) => {
    l = N(a(0), O), o = N(), O.length !== 0 && (l = N(a(1), O), o = N());
  }, x = () => {
    if (d++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let O = 0;
    const B = [];
    for (; O < e; ) {
      o = N();
      const k = o.slice();
      B.push(k), O += o.length;
    }
    return Ae(...B);
  };
  return (O, B) => {
    _(), L(O);
    let k;
    for (; !(k = B(x())); )
      L();
    return _(), k;
  };
}
function _r(t, e, r = {}) {
  if (!t || typeof t != "object")
    throw new Error("expected valid options object");
  function n(a, o, l) {
    const d = t[a];
    if (l && d === void 0)
      return;
    const _ = typeof d;
    if (_ !== o || d === null)
      throw new Error(`param "${a}" is invalid: expected ${o}, got ${_}`);
  }
  Object.entries(e).forEach(([a, o]) => n(a, o, !1)), Object.entries(r).forEach(([a, o]) => n(a, o, !0));
}
function Ur(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (r, ...n) => {
    const a = e.get(r);
    if (a !== void 0)
      return a;
    const o = t(r, ...n);
    return e.set(r, o), o;
  };
}
const ce = BigInt(0), re = BigInt(1), Fe = /* @__PURE__ */ BigInt(2), Eo = /* @__PURE__ */ BigInt(3), mo = /* @__PURE__ */ BigInt(4), yo = /* @__PURE__ */ BigInt(5), Hs = /* @__PURE__ */ BigInt(7), Ao = /* @__PURE__ */ BigInt(8), qs = /* @__PURE__ */ BigInt(9), wo = /* @__PURE__ */ BigInt(16);
function jt(t, e) {
  const r = t % e;
  return r >= ce ? r : e + r;
}
function Tt(t, e, r) {
  let n = t;
  for (; e-- > ce; )
    n *= n, n %= r;
  return n;
}
function Ti(t, e) {
  if (t === ce)
    throw new Error("invert: expected non-zero number");
  if (e <= ce)
    throw new Error("invert: expected positive modulus, got " + e);
  let r = jt(t, e), n = e, a = ce, o = re;
  for (; r !== ce; ) {
    const d = n / r, _ = n % r, N = a - o * d;
    n = r, r = _, a = o, o = N;
  }
  if (n !== re)
    throw new Error("invert: does not exist");
  return jt(a, e);
}
function ri(t, e, r) {
  if (!t.eql(t.sqr(e), r))
    throw new Error("Cannot find square root");
}
function So(t, e) {
  const r = (t.ORDER + re) / mo, n = t.pow(e, r);
  return ri(t, n, e), n;
}
function Xs(t, e) {
  const r = (t.ORDER - yo) / Ao, n = t.mul(e, Fe), a = t.pow(n, r), o = t.mul(e, a), l = t.mul(t.mul(o, Fe), a), d = t.mul(o, t.sub(l, t.ONE));
  return ri(t, d, e), d;
}
function Ys(t) {
  const e = Ke(t), r = Oo(t), n = r(e, e.neg(e.ONE)), a = r(e, n), o = r(e, e.neg(n)), l = (t + Hs) / wo;
  return (d, _) => {
    let N = d.pow(_, l), L = d.mul(N, n);
    const x = d.mul(N, a), I = d.mul(N, o), O = d.eql(d.sqr(L), _), B = d.eql(d.sqr(x), _);
    N = d.cmov(N, L, O), L = d.cmov(I, x, B);
    const k = d.eql(d.sqr(L), _), F = d.cmov(N, L, k);
    return ri(d, F, _), F;
  };
}
function Oo(t) {
  if (t < Eo)
    throw new Error("sqrt is not defined for small field");
  let e = t - re, r = 0;
  for (; e % Fe === ce; )
    e /= Fe, r++;
  let n = Fe;
  const a = Ke(t);
  for (; Li(a, n) === 1; )
    if (n++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (r === 1)
    return So;
  let o = a.pow(n, e);
  const l = (e + re) / Fe;
  return function(_, N) {
    if (_.is0(N))
      return N;
    if (Li(_, N) !== 1)
      throw new Error("Cannot find square root");
    let L = r, x = _.mul(_.ONE, o), I = _.pow(N, e), O = _.pow(N, l);
    for (; !_.eql(I, _.ONE); ) {
      if (_.is0(I))
        return _.ZERO;
      let B = 1, k = _.sqr(I);
      for (; !_.eql(k, _.ONE); )
        if (B++, k = _.sqr(k), B === L)
          throw new Error("Cannot find square root");
      const F = re << BigInt(L - B - 1), H = _.pow(x, F);
      L = B, x = _.sqr(H), I = _.mul(I, x), O = _.mul(O, H);
    }
    return O;
  };
}
function Zs(t) {
  return t % mo === Eo ? So : t % Ao === yo ? Xs : t % wo === qs ? Ys(t) : Oo(t);
}
const js = (t, e) => (jt(t, e) & re) === re, Ws = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function Js(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "number",
    BITS: "number"
  }, r = Ws.reduce((n, a) => (n[a] = "function", n), e);
  return _r(t, r), t;
}
function Qs(t, e, r) {
  if (r < ce)
    throw new Error("invalid exponent, negatives unsupported");
  if (r === ce)
    return t.ONE;
  if (r === re)
    return e;
  let n = t.ONE, a = e;
  for (; r > ce; )
    r & re && (n = t.mul(n, a)), a = t.sqr(a), r >>= re;
  return n;
}
function vo(t, e, r = !1) {
  const n = new Array(e.length).fill(r ? t.ZERO : void 0), a = e.reduce((l, d, _) => t.is0(d) ? l : (n[_] = l, t.mul(l, d)), t.ONE), o = t.inv(a);
  return e.reduceRight((l, d, _) => t.is0(d) ? l : (n[_] = t.mul(l, n[_]), t.mul(l, d)), o), n;
}
function Li(t, e) {
  const r = (t.ORDER - re) / Fe, n = t.pow(e, r), a = t.eql(n, t.ONE), o = t.eql(n, t.ZERO), l = t.eql(n, t.neg(t.ONE));
  if (!a && !o && !l)
    throw new Error("invalid Legendre symbol result");
  return a ? 1 : o ? 0 : -1;
}
function No(t, e) {
  e !== void 0 && Kn(e);
  const r = e !== void 0 ? e : t.toString(2).length, n = Math.ceil(r / 8);
  return { nBitLength: r, nByteLength: n };
}
function Ke(t, e, r = !1, n = {}) {
  if (t <= ce)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  let a, o, l = !1, d;
  if (typeof e == "object" && e != null) {
    if (n.sqrt || r)
      throw new Error("cannot specify opts in two arguments");
    const I = e;
    I.BITS && (a = I.BITS), I.sqrt && (o = I.sqrt), typeof I.isLE == "boolean" && (r = I.isLE), typeof I.modFromBytes == "boolean" && (l = I.modFromBytes), d = I.allowedLengths;
  } else
    typeof e == "number" && (a = e), n.sqrt && (o = n.sqrt);
  const { nBitLength: _, nByteLength: N } = No(t, a);
  if (N > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let L;
  const x = Object.freeze({
    ORDER: t,
    isLE: r,
    BITS: _,
    BYTES: N,
    MASK: dr(_),
    ZERO: ce,
    ONE: re,
    allowedLengths: d,
    create: (I) => jt(I, t),
    isValid: (I) => {
      if (typeof I != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof I);
      return ce <= I && I < t;
    },
    is0: (I) => I === ce,
    // is valid and invertible
    isValidNot0: (I) => !x.is0(I) && x.isValid(I),
    isOdd: (I) => (I & re) === re,
    neg: (I) => jt(-I, t),
    eql: (I, O) => I === O,
    sqr: (I) => jt(I * I, t),
    add: (I, O) => jt(I + O, t),
    sub: (I, O) => jt(I - O, t),
    mul: (I, O) => jt(I * O, t),
    pow: (I, O) => Qs(x, I, O),
    div: (I, O) => jt(I * Ti(O, t), t),
    // Same as above, but doesn't normalize
    sqrN: (I) => I * I,
    addN: (I, O) => I + O,
    subN: (I, O) => I - O,
    mulN: (I, O) => I * O,
    inv: (I) => Ti(I, t),
    sqrt: o || ((I) => (L || (L = Zs(t)), L(x, I))),
    toBytes: (I) => r ? go(I, N) : ei(I, N),
    fromBytes: (I, O = !0) => {
      if (d) {
        if (!d.includes(I.length) || I.length > N)
          throw new Error("Field.fromBytes: expected " + d + " bytes, got " + I.length);
        const k = new Uint8Array(N);
        k.set(I, r ? 0 : k.length - I.length), I = k;
      }
      if (I.length !== N)
        throw new Error("Field.fromBytes: expected " + N + " bytes, got " + I.length);
      let B = r ? cr(I) : qr(I);
      if (l && (B = jt(B, t)), !O && !x.isValid(B))
        throw new Error("invalid field element: outside of range 0..ORDER");
      return B;
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (I) => vo(x, I),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (I, O, B) => B ? O : I
  });
  return Object.freeze(x);
}
function Io(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function bo(t) {
  const e = Io(t);
  return e + Math.ceil(e / 2);
}
function ta(t, e, r = !1) {
  const n = t.length, a = Io(e), o = bo(e);
  if (n < 16 || n < o || n > 1024)
    throw new Error("expected " + o + "-1024 bytes of input, got " + n);
  const l = r ? cr(t) : qr(t), d = jt(l, e - re) + re;
  return r ? go(d, a) : ei(d, a);
}
const nr = BigInt(0), ke = BigInt(1);
function Dr(t, e) {
  const r = e.negate();
  return t ? r : e;
}
function Pe(t, e) {
  const r = vo(t.Fp, e.map((n) => n.Z));
  return e.map((n, a) => t.fromAffine(n.toAffine(r[a])));
}
function xo(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function vn(t, e) {
  xo(t, e);
  const r = Math.ceil(e / t) + 1, n = 2 ** (t - 1), a = 2 ** t, o = dr(t), l = BigInt(t);
  return { windows: r, windowSize: n, mask: o, maxNumber: a, shiftBy: l };
}
function Bi(t, e, r) {
  const { windowSize: n, mask: a, maxNumber: o, shiftBy: l } = r;
  let d = Number(t & a), _ = t >> l;
  d > n && (d -= o, _ += ke);
  const N = e * n, L = N + Math.abs(d) - 1, x = d === 0, I = d < 0, O = e % 2 !== 0;
  return { nextN: _, offset: L, isZero: x, isNeg: I, isNegF: O, offsetF: N };
}
function ea(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((r, n) => {
    if (!(r instanceof e))
      throw new Error("invalid point at index " + n);
  });
}
function ra(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((r, n) => {
    if (!e.isValid(r))
      throw new Error("invalid scalar at index " + n);
  });
}
const Nn = /* @__PURE__ */ new WeakMap(), To = /* @__PURE__ */ new WeakMap();
function In(t) {
  return To.get(t) || 1;
}
function Ci(t) {
  if (t !== nr)
    throw new Error("invalid wNAF");
}
class Lo {
  // Parametrized with a given Point class (not individual point)
  constructor(e, r) {
    this.BASE = e.BASE, this.ZERO = e.ZERO, this.Fn = e.Fn, this.bits = r;
  }
  // non-const time multiplication ladder
  _unsafeLadder(e, r, n = this.ZERO) {
    let a = e;
    for (; r > nr; )
      r & ke && (n = n.add(a)), a = a.double(), r >>= ke;
    return n;
  }
  /**
   * Creates a wNAF precomputation window. Used for caching.
   * Default window size is set by `utils.precompute()` and is equal to 8.
   * Number of precomputed points depends on the curve size:
   * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
   * - 𝑊 is the window size
   * - 𝑛 is the bitlength of the curve order.
   * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
   * @param point Point instance
   * @param W window size
   * @returns precomputed point tables flattened to a single array
   */
  precomputeWindow(e, r) {
    const { windows: n, windowSize: a } = vn(r, this.bits), o = [];
    let l = e, d = l;
    for (let _ = 0; _ < n; _++) {
      d = l, o.push(d);
      for (let N = 1; N < a; N++)
        d = d.add(l), o.push(d);
      l = d.double();
    }
    return o;
  }
  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  wNAF(e, r, n) {
    if (!this.Fn.isValid(n))
      throw new Error("invalid scalar");
    let a = this.ZERO, o = this.BASE;
    const l = vn(e, this.bits);
    for (let d = 0; d < l.windows; d++) {
      const { nextN: _, offset: N, isZero: L, isNeg: x, isNegF: I, offsetF: O } = Bi(n, d, l);
      n = _, L ? o = o.add(Dr(I, r[O])) : a = a.add(Dr(x, r[N]));
    }
    return Ci(n), { p: a, f: o };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(e, r, n, a = this.ZERO) {
    const o = vn(e, this.bits);
    for (let l = 0; l < o.windows && n !== nr; l++) {
      const { nextN: d, offset: _, isZero: N, isNeg: L } = Bi(n, l, o);
      if (n = d, !N) {
        const x = r[_];
        a = a.add(L ? x.negate() : x);
      }
    }
    return Ci(n), a;
  }
  getPrecomputes(e, r, n) {
    let a = Nn.get(r);
    return a || (a = this.precomputeWindow(r, e), e !== 1 && (typeof n == "function" && (a = n(a)), Nn.set(r, a))), a;
  }
  cached(e, r, n) {
    const a = In(e);
    return this.wNAF(a, this.getPrecomputes(a, e, n), r);
  }
  unsafe(e, r, n, a) {
    const o = In(e);
    return o === 1 ? this._unsafeLadder(e, r, a) : this.wNAFUnsafe(o, this.getPrecomputes(o, e, n), r, a);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(e, r) {
    xo(r, this.bits), To.set(e, r), Nn.delete(e);
  }
  hasCache(e) {
    return In(e) !== 1;
  }
}
function na(t, e, r, n) {
  let a = e, o = t.ZERO, l = t.ZERO;
  for (; r > nr || n > nr; )
    r & ke && (o = o.add(a)), n & ke && (l = l.add(a)), a = a.double(), r >>= ke, n >>= ke;
  return { p1: o, p2: l };
}
function Bo(t, e, r, n) {
  ea(r, t), ra(n, e);
  const a = r.length, o = n.length;
  if (a !== o)
    throw new Error("arrays of points and scalars must have equal length");
  const l = t.ZERO, d = Ro(BigInt(a));
  let _ = 1;
  d > 12 ? _ = d - 3 : d > 4 ? _ = d - 2 : d > 0 && (_ = 2);
  const N = dr(_), L = new Array(Number(N) + 1).fill(l), x = Math.floor((e.BITS - 1) / _) * _;
  let I = l;
  for (let O = x; O >= 0; O -= _) {
    L.fill(l);
    for (let k = 0; k < o; k++) {
      const F = n[k], H = Number(F >> BigInt(O) & N);
      L[H] = L[H].add(r[k]);
    }
    let B = l;
    for (let k = L.length - 1, F = l; k > 0; k--)
      F = F.add(L[k]), B = B.add(F);
    if (I = I.add(B), O !== 0)
      for (let k = 0; k < _; k++)
        I = I.double();
  }
  return I;
}
function Mi(t, e, r) {
  if (e) {
    if (e.ORDER !== t)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Js(e), e;
  } else
    return Ke(t, { isLE: r });
}
function Co(t, e, r = {}, n) {
  if (n === void 0 && (n = t === "edwards"), !e || typeof e != "object")
    throw new Error(`expected valid ${t} CURVE object`);
  for (const _ of ["p", "n", "h"]) {
    const N = e[_];
    if (!(typeof N == "bigint" && N > nr))
      throw new Error(`CURVE.${_} must be positive bigint`);
  }
  const a = Mi(e.p, r.Fp, n), o = Mi(e.n, r.Fn, n), d = ["Gx", "Gy", "a", t === "weierstrass" ? "b" : "d"];
  for (const _ of d)
    if (!a.isValid(e[_]))
      throw new Error(`CURVE.${_} must be valid field element of CURVE.Fp`);
  return e = Object.freeze(Object.assign({}, e)), { CURVE: e, Fp: a, Fn: o };
}
const Ue = BigInt(0), Jt = BigInt(1), bn = BigInt(2), ia = BigInt(8);
function oa(t, e, r, n) {
  const a = t.sqr(r), o = t.sqr(n), l = t.add(t.mul(e.a, a), o), d = t.add(t.ONE, t.mul(e.d, t.mul(a, o)));
  return t.eql(l, d);
}
function sa(t, e = {}) {
  const r = Co("edwards", t, e, e.FpFnLE), { Fp: n, Fn: a } = r;
  let o = r.CURVE;
  const { h: l } = o;
  _r(e, {}, { uvRatio: "function" });
  const d = bn << BigInt(a.BYTES * 8) - Jt, _ = (F) => n.create(F), N = e.uvRatio || ((F, H) => {
    try {
      return { isValid: !0, value: n.sqrt(n.div(F, H)) };
    } catch {
      return { isValid: !1, value: Ue };
    }
  });
  if (!oa(n, o, o.Gx, o.Gy))
    throw new Error("bad curve params: generator point");
  function L(F, H, Y = !1) {
    const $ = Y ? Jt : Ue;
    return Hn("coordinate " + F, H, $, d), H;
  }
  function x(F) {
    if (!(F instanceof B))
      throw new Error("ExtendedPoint expected");
  }
  const I = Ur((F, H) => {
    const { X: Y, Y: $, Z: Q } = F, j = F.is0();
    H == null && (H = j ? ia : n.inv(Q));
    const nt = _(Y * H), at = _($ * H), it = n.mul(Q, H);
    if (j)
      return { x: Ue, y: Jt };
    if (it !== Jt)
      throw new Error("invZ was invalid");
    return { x: nt, y: at };
  }), O = Ur((F) => {
    const { a: H, d: Y } = o;
    if (F.is0())
      throw new Error("bad point: ZERO");
    const { X: $, Y: Q, Z: j, T: nt } = F, at = _($ * $), it = _(Q * Q), C = _(j * j), U = _(C * C), G = _(at * H), z = _(C * _(G + it)), g = _(U + _(Y * _(at * it)));
    if (z !== g)
      throw new Error("bad point: equation left != right (1)");
    const i = _($ * Q), f = _(j * nt);
    if (i !== f)
      throw new Error("bad point: equation left != right (2)");
    return !0;
  });
  class B {
    constructor(H, Y, $, Q) {
      this.X = L("x", H), this.Y = L("y", Y), this.Z = L("z", $, !0), this.T = L("t", Q), Object.freeze(this);
    }
    static CURVE() {
      return o;
    }
    static fromAffine(H) {
      if (H instanceof B)
        throw new Error("extended point not allowed");
      const { x: Y, y: $ } = H || {};
      return L("x", Y), L("y", $), new B(Y, $, Jt, _(Y * $));
    }
    // Uses algo from RFC8032 5.1.3.
    static fromBytes(H, Y = !1) {
      const $ = n.BYTES, { a: Q, d: j } = o;
      H = xi(ge(H, $, "point")), Ge(Y, "zip215");
      const nt = xi(H), at = H[$ - 1];
      nt[$ - 1] = at & -129;
      const it = cr(nt), C = Y ? d : n.ORDER;
      Hn("point.y", it, Ue, C);
      const U = _(it * it), G = _(U - Jt), z = _(j * U - Q);
      let { isValid: g, value: i } = N(G, z);
      if (!g)
        throw new Error("bad point: invalid y coordinate");
      const f = (i & Jt) === Jt, p = (at & 128) !== 0;
      if (!Y && i === Ue && p)
        throw new Error("bad point: x=0 and x_0=1");
      return p !== f && (i = _(-i)), B.fromAffine({ x: i, y: it });
    }
    static fromHex(H, Y = !1) {
      return B.fromBytes(Lt("point", H), Y);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    precompute(H = 8, Y = !0) {
      return k.createCache(this, H), Y || this.multiply(bn), this;
    }
    // Useful in fromAffine() - not for fromBytes(), which always created valid points.
    assertValidity() {
      O(this);
    }
    // Compare one point to another.
    equals(H) {
      x(H);
      const { X: Y, Y: $, Z: Q } = this, { X: j, Y: nt, Z: at } = H, it = _(Y * at), C = _(j * Q), U = _($ * at), G = _(nt * Q);
      return it === C && U === G;
    }
    is0() {
      return this.equals(B.ZERO);
    }
    negate() {
      return new B(_(-this.X), this.Y, this.Z, _(-this.T));
    }
    // Fast algo for doubling Extended Point.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
    // Cost: 4M + 4S + 1*a + 6add + 1*2.
    double() {
      const { a: H } = o, { X: Y, Y: $, Z: Q } = this, j = _(Y * Y), nt = _($ * $), at = _(bn * _(Q * Q)), it = _(H * j), C = Y + $, U = _(_(C * C) - j - nt), G = it + nt, z = G - at, g = it - nt, i = _(U * z), f = _(G * g), p = _(U * g), y = _(z * G);
      return new B(i, f, y, p);
    }
    // Fast algo for adding 2 Extended Points.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
    // Cost: 9M + 1*a + 1*d + 7add.
    add(H) {
      x(H);
      const { a: Y, d: $ } = o, { X: Q, Y: j, Z: nt, T: at } = this, { X: it, Y: C, Z: U, T: G } = H, z = _(Q * it), g = _(j * C), i = _(at * $ * G), f = _(nt * U), p = _((Q + j) * (it + C) - z - g), y = f - i, w = f + i, v = _(g - Y * z), T = _(p * y), m = _(w * v), s = _(p * v), u = _(y * w);
      return new B(T, m, u, s);
    }
    subtract(H) {
      return this.add(H.negate());
    }
    // Constant-time multiplication.
    multiply(H) {
      if (!a.isValidNot0(H))
        throw new Error("invalid scalar: expected 1 <= sc < curve.n");
      const { p: Y, f: $ } = k.cached(this, H, (Q) => Pe(B, Q));
      return Pe(B, [Y, $])[0];
    }
    // Non-constant-time multiplication. Uses double-and-add algorithm.
    // It's faster, but should only be used when you don't care about
    // an exposed private key e.g. sig verification.
    // Does NOT allow scalars higher than CURVE.n.
    // Accepts optional accumulator to merge with multiply (important for sparse scalars)
    multiplyUnsafe(H, Y = B.ZERO) {
      if (!a.isValid(H))
        throw new Error("invalid scalar: expected 0 <= sc < curve.n");
      return H === Ue ? B.ZERO : this.is0() || H === Jt ? this : k.unsafe(this, H, ($) => Pe(B, $), Y);
    }
    // Checks if point is of small order.
    // If you add something to small order point, you will have "dirty"
    // point with torsion component.
    // Multiplies point by cofactor and checks if the result is 0.
    isSmallOrder() {
      return this.multiplyUnsafe(l).is0();
    }
    // Multiplies point by curve order and checks if the result is 0.
    // Returns `false` is the point is dirty.
    isTorsionFree() {
      return k.unsafe(this, o.n).is0();
    }
    // Converts Extended point to default (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    toAffine(H) {
      return I(this, H);
    }
    clearCofactor() {
      return l === Jt ? this : this.multiplyUnsafe(l);
    }
    toBytes() {
      const { x: H, y: Y } = this.toAffine(), $ = n.toBytes(Y);
      return $[$.length - 1] |= H & Jt ? 128 : 0, $;
    }
    toHex() {
      return $e(this.toBytes());
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
    // TODO: remove
    get ex() {
      return this.X;
    }
    get ey() {
      return this.Y;
    }
    get ez() {
      return this.Z;
    }
    get et() {
      return this.T;
    }
    static normalizeZ(H) {
      return Pe(B, H);
    }
    static msm(H, Y) {
      return Bo(B, a, H, Y);
    }
    _setWindowSize(H) {
      this.precompute(H);
    }
    toRawBytes() {
      return this.toBytes();
    }
  }
  B.BASE = new B(o.Gx, o.Gy, Jt, _(o.Gx * o.Gy)), B.ZERO = new B(Ue, Jt, Jt, Ue), B.Fp = n, B.Fn = a;
  const k = new Lo(B, a.BITS);
  return B.BASE.precompute(8), B;
}
function aa(t, e, r = {}) {
  if (typeof e != "function")
    throw new Error('"hash" function param is required');
  _r(r, {}, {
    adjustScalarBytes: "function",
    randomBytes: "function",
    domain: "function",
    prehash: "function",
    mapToCurve: "function"
  });
  const { prehash: n } = r, { BASE: a, Fp: o, Fn: l } = t, d = r.randomBytes || Qn, _ = r.adjustScalarBytes || ((C) => C), N = r.domain || ((C, U, G) => {
    if (Ge(G, "phflag"), U.length || G)
      throw new Error("Contexts/pre-hash are not supported");
    return C;
  });
  function L(C) {
    return l.create(cr(C));
  }
  function x(C) {
    const U = $.secretKey;
    C = Lt("private key", C, U);
    const G = Lt("hashed private key", e(C), 2 * U), z = _(G.slice(0, U)), g = G.slice(U, 2 * U), i = L(z);
    return { head: z, prefix: g, scalar: i };
  }
  function I(C) {
    const { head: U, prefix: G, scalar: z } = x(C), g = a.multiply(z), i = g.toBytes();
    return { head: U, prefix: G, scalar: z, point: g, pointBytes: i };
  }
  function O(C) {
    return I(C).pointBytes;
  }
  function B(C = Uint8Array.of(), ...U) {
    const G = Ae(...U);
    return L(e(N(G, Lt("context", C), !!n)));
  }
  function k(C, U, G = {}) {
    C = Lt("message", C), n && (C = n(C));
    const { prefix: z, scalar: g, pointBytes: i } = I(U), f = B(G.context, z, C), p = a.multiply(f).toBytes(), y = B(G.context, p, i, C), w = l.create(f + y * g);
    if (!l.isValid(w))
      throw new Error("sign failed: invalid s");
    const v = Ae(p, l.toBytes(w));
    return ge(v, $.signature, "result");
  }
  const F = { zip215: !0 };
  function H(C, U, G, z = F) {
    const { context: g, zip215: i } = z, f = $.signature;
    C = Lt("signature", C, f), U = Lt("message", U), G = Lt("publicKey", G, $.publicKey), i !== void 0 && Ge(i, "zip215"), n && (U = n(U));
    const p = f / 2, y = C.subarray(0, p), w = cr(C.subarray(p, f));
    let v, T, m;
    try {
      v = t.fromBytes(G, i), T = t.fromBytes(y, i), m = a.multiplyUnsafe(w);
    } catch {
      return !1;
    }
    if (!i && v.isSmallOrder())
      return !1;
    const s = B(g, T.toBytes(), v.toBytes(), U);
    return T.add(v.multiplyUnsafe(s)).subtract(m).clearCofactor().is0();
  }
  const Y = o.BYTES, $ = {
    secretKey: Y,
    publicKey: Y,
    signature: 2 * Y,
    seed: Y
  };
  function Q(C = d($.seed)) {
    return ge(C, $.seed, "seed");
  }
  function j(C) {
    const U = it.randomSecretKey(C);
    return { secretKey: U, publicKey: O(U) };
  }
  function nt(C) {
    return lr(C) && C.length === l.BYTES;
  }
  function at(C, U) {
    try {
      return !!t.fromBytes(C, U);
    } catch {
      return !1;
    }
  }
  const it = {
    getExtendedPublicKey: I,
    randomSecretKey: Q,
    isValidSecretKey: nt,
    isValidPublicKey: at,
    /**
     * Converts ed public key to x public key. Uses formula:
     * - ed25519:
     *   - `(u, v) = ((1+y)/(1-y), sqrt(-486664)*u/x)`
     *   - `(x, y) = (sqrt(-486664)*u/v, (u-1)/(u+1))`
     * - ed448:
     *   - `(u, v) = ((y-1)/(y+1), sqrt(156324)*u/x)`
     *   - `(x, y) = (sqrt(156324)*u/v, (1+u)/(1-u))`
     */
    toMontgomery(C) {
      const { y: U } = t.fromBytes(C), G = $.publicKey, z = G === 32;
      if (!z && G !== 57)
        throw new Error("only defined for 25519 and 448");
      const g = z ? o.div(Jt + U, Jt - U) : o.div(U - Jt, U + Jt);
      return o.toBytes(g);
    },
    toMontgomerySecret(C) {
      const U = $.secretKey;
      ge(C, U);
      const G = e(C.subarray(0, U));
      return _(G).subarray(0, U);
    },
    /** @deprecated */
    randomPrivateKey: Q,
    /** @deprecated */
    precompute(C = 8, U = t.BASE) {
      return U.precompute(C, !1);
    }
  };
  return Object.freeze({
    keygen: j,
    getPublicKey: O,
    sign: k,
    verify: H,
    utils: it,
    Point: t,
    lengths: $
  });
}
function ua(t) {
  const e = {
    a: t.a,
    d: t.d,
    p: t.Fp.ORDER,
    n: t.n,
    h: t.h,
    Gx: t.Gx,
    Gy: t.Gy
  }, r = t.Fp, n = Ke(e.n, t.nBitLength, !0), a = { Fp: r, Fn: n, uvRatio: t.uvRatio }, o = {
    randomBytes: t.randomBytes,
    adjustScalarBytes: t.adjustScalarBytes,
    domain: t.domain,
    prehash: t.prehash,
    mapToCurve: t.mapToCurve
  };
  return { CURVE: e, curveOpts: a, hash: t.hash, eddsaOpts: o };
}
function ca(t, e) {
  const r = e.Point;
  return Object.assign({}, e, {
    ExtendedPoint: r,
    CURVE: t,
    nBitLength: r.Fn.BITS,
    nByteLength: r.Fn.BYTES
  });
}
function fa(t) {
  const { CURVE: e, curveOpts: r, hash: n, eddsaOpts: a } = ua(t), o = sa(e, r), l = aa(o, n, a);
  return ca(t, l);
}
const ha = BigInt(1), Ui = BigInt(2);
BigInt(3);
const la = BigInt(5), da = BigInt(8), ni = BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed"), Mo = {
  p: ni,
  n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
  h: da,
  a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"),
  d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"),
  Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"),
  Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658")
};
function _a(t) {
  const e = BigInt(10), r = BigInt(20), n = BigInt(40), a = BigInt(80), o = ni, d = t * t % o * t % o, _ = Tt(d, Ui, o) * d % o, N = Tt(_, ha, o) * t % o, L = Tt(N, la, o) * N % o, x = Tt(L, e, o) * L % o, I = Tt(x, r, o) * x % o, O = Tt(I, n, o) * I % o, B = Tt(O, a, o) * O % o, k = Tt(B, a, o) * O % o, F = Tt(k, e, o) * L % o;
  return { pow_p_5_8: Tt(F, Ui, o) * t % o, b2: d };
}
function pa(t) {
  return t[0] &= 248, t[31] &= 127, t[31] |= 64, t;
}
const Di = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
function ga(t, e) {
  const r = ni, n = jt(e * e * e, r), a = jt(n * n * e, r), o = _a(t * a).pow_p_5_8;
  let l = jt(t * n * o, r);
  const d = jt(e * l * l, r), _ = l, N = jt(l * Di, r), L = d === t, x = d === jt(-t, r), I = d === jt(-t * Di, r);
  return L && (l = _), (x || I) && (l = N), js(l, r) && (l = jt(-l, r)), { isValid: L || x, value: l };
}
const Ra = Ke(Mo.p, { isLE: !0 }), Ea = {
  ...Mo,
  Fp: Ra,
  hash: Vs,
  adjustScalarBytes: pa,
  // dom2
  // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
  // Constant-time, u/√v
  uvRatio: ga
}, pr = fa(Ea);
var Tr = { exports: {} };
const ma = {}, ya = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ma
}, Symbol.toStringTag, { value: "Module" })), Aa = /* @__PURE__ */ jn(ya);
var wa = Tr.exports, Fi;
function Uo() {
  return Fi || (Fi = 1, (function(t) {
    (function(e, r) {
      function n(g, i) {
        if (!g) throw new Error(i || "Assertion failed");
      }
      function a(g, i) {
        g.super_ = i;
        var f = function() {
        };
        f.prototype = i.prototype, g.prototype = new f(), g.prototype.constructor = g;
      }
      function o(g, i, f) {
        if (o.isBN(g))
          return g;
        this.negative = 0, this.words = null, this.length = 0, this.red = null, g !== null && ((i === "le" || i === "be") && (f = i, i = 10), this._init(g || 0, i || 10, f || "be"));
      }
      typeof e == "object" ? e.exports = o : r.BN = o, o.BN = o, o.wordSize = 26;
      var l;
      try {
        typeof window < "u" && typeof window.Buffer < "u" ? l = window.Buffer : l = Aa.Buffer;
      } catch {
      }
      o.isBN = function(i) {
        return i instanceof o ? !0 : i !== null && typeof i == "object" && i.constructor.wordSize === o.wordSize && Array.isArray(i.words);
      }, o.max = function(i, f) {
        return i.cmp(f) > 0 ? i : f;
      }, o.min = function(i, f) {
        return i.cmp(f) < 0 ? i : f;
      }, o.prototype._init = function(i, f, p) {
        if (typeof i == "number")
          return this._initNumber(i, f, p);
        if (typeof i == "object")
          return this._initArray(i, f, p);
        f === "hex" && (f = 16), n(f === (f | 0) && f >= 2 && f <= 36), i = i.toString().replace(/\s+/g, "");
        var y = 0;
        i[0] === "-" && (y++, this.negative = 1), y < i.length && (f === 16 ? this._parseHex(i, y, p) : (this._parseBase(i, f, y), p === "le" && this._initArray(this.toArray(), f, p)));
      }, o.prototype._initNumber = function(i, f, p) {
        i < 0 && (this.negative = 1, i = -i), i < 67108864 ? (this.words = [i & 67108863], this.length = 1) : i < 4503599627370496 ? (this.words = [
          i & 67108863,
          i / 67108864 & 67108863
        ], this.length = 2) : (n(i < 9007199254740992), this.words = [
          i & 67108863,
          i / 67108864 & 67108863,
          1
        ], this.length = 3), p === "le" && this._initArray(this.toArray(), f, p);
      }, o.prototype._initArray = function(i, f, p) {
        if (n(typeof i.length == "number"), i.length <= 0)
          return this.words = [0], this.length = 1, this;
        this.length = Math.ceil(i.length / 3), this.words = new Array(this.length);
        for (var y = 0; y < this.length; y++)
          this.words[y] = 0;
        var w, v, T = 0;
        if (p === "be")
          for (y = i.length - 1, w = 0; y >= 0; y -= 3)
            v = i[y] | i[y - 1] << 8 | i[y - 2] << 16, this.words[w] |= v << T & 67108863, this.words[w + 1] = v >>> 26 - T & 67108863, T += 24, T >= 26 && (T -= 26, w++);
        else if (p === "le")
          for (y = 0, w = 0; y < i.length; y += 3)
            v = i[y] | i[y + 1] << 8 | i[y + 2] << 16, this.words[w] |= v << T & 67108863, this.words[w + 1] = v >>> 26 - T & 67108863, T += 24, T >= 26 && (T -= 26, w++);
        return this._strip();
      };
      function d(g, i) {
        var f = g.charCodeAt(i);
        if (f >= 48 && f <= 57)
          return f - 48;
        if (f >= 65 && f <= 70)
          return f - 55;
        if (f >= 97 && f <= 102)
          return f - 87;
        n(!1, "Invalid character in " + g);
      }
      function _(g, i, f) {
        var p = d(g, f);
        return f - 1 >= i && (p |= d(g, f - 1) << 4), p;
      }
      o.prototype._parseHex = function(i, f, p) {
        this.length = Math.ceil((i.length - f) / 6), this.words = new Array(this.length);
        for (var y = 0; y < this.length; y++)
          this.words[y] = 0;
        var w = 0, v = 0, T;
        if (p === "be")
          for (y = i.length - 1; y >= f; y -= 2)
            T = _(i, f, y) << w, this.words[v] |= T & 67108863, w >= 18 ? (w -= 18, v += 1, this.words[v] |= T >>> 26) : w += 8;
        else {
          var m = i.length - f;
          for (y = m % 2 === 0 ? f + 1 : f; y < i.length; y += 2)
            T = _(i, f, y) << w, this.words[v] |= T & 67108863, w >= 18 ? (w -= 18, v += 1, this.words[v] |= T >>> 26) : w += 8;
        }
        this._strip();
      };
      function N(g, i, f, p) {
        for (var y = 0, w = 0, v = Math.min(g.length, f), T = i; T < v; T++) {
          var m = g.charCodeAt(T) - 48;
          y *= p, m >= 49 ? w = m - 49 + 10 : m >= 17 ? w = m - 17 + 10 : w = m, n(m >= 0 && w < p, "Invalid character"), y += w;
        }
        return y;
      }
      o.prototype._parseBase = function(i, f, p) {
        this.words = [0], this.length = 1;
        for (var y = 0, w = 1; w <= 67108863; w *= f)
          y++;
        y--, w = w / f | 0;
        for (var v = i.length - p, T = v % y, m = Math.min(v, v - T) + p, s = 0, u = p; u < m; u += y)
          s = N(i, u, u + y, f), this.imuln(w), this.words[0] + s < 67108864 ? this.words[0] += s : this._iaddn(s);
        if (T !== 0) {
          var E = 1;
          for (s = N(i, u, i.length, f), u = 0; u < T; u++)
            E *= f;
          this.imuln(E), this.words[0] + s < 67108864 ? this.words[0] += s : this._iaddn(s);
        }
        this._strip();
      }, o.prototype.copy = function(i) {
        i.words = new Array(this.length);
        for (var f = 0; f < this.length; f++)
          i.words[f] = this.words[f];
        i.length = this.length, i.negative = this.negative, i.red = this.red;
      };
      function L(g, i) {
        g.words = i.words, g.length = i.length, g.negative = i.negative, g.red = i.red;
      }
      if (o.prototype._move = function(i) {
        L(i, this);
      }, o.prototype.clone = function() {
        var i = new o(null);
        return this.copy(i), i;
      }, o.prototype._expand = function(i) {
        for (; this.length < i; )
          this.words[this.length++] = 0;
        return this;
      }, o.prototype._strip = function() {
        for (; this.length > 1 && this.words[this.length - 1] === 0; )
          this.length--;
        return this._normSign();
      }, o.prototype._normSign = function() {
        return this.length === 1 && this.words[0] === 0 && (this.negative = 0), this;
      }, typeof Symbol < "u" && typeof Symbol.for == "function")
        try {
          o.prototype[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = x;
        } catch {
          o.prototype.inspect = x;
        }
      else
        o.prototype.inspect = x;
      function x() {
        return (this.red ? "<BN-R: " : "<BN: ") + this.toString(16) + ">";
      }
      var I = [
        "",
        "0",
        "00",
        "000",
        "0000",
        "00000",
        "000000",
        "0000000",
        "00000000",
        "000000000",
        "0000000000",
        "00000000000",
        "000000000000",
        "0000000000000",
        "00000000000000",
        "000000000000000",
        "0000000000000000",
        "00000000000000000",
        "000000000000000000",
        "0000000000000000000",
        "00000000000000000000",
        "000000000000000000000",
        "0000000000000000000000",
        "00000000000000000000000",
        "000000000000000000000000",
        "0000000000000000000000000"
      ], O = [
        0,
        0,
        25,
        16,
        12,
        11,
        10,
        9,
        8,
        8,
        7,
        7,
        7,
        7,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5
      ], B = [
        0,
        0,
        33554432,
        43046721,
        16777216,
        48828125,
        60466176,
        40353607,
        16777216,
        43046721,
        1e7,
        19487171,
        35831808,
        62748517,
        7529536,
        11390625,
        16777216,
        24137569,
        34012224,
        47045881,
        64e6,
        4084101,
        5153632,
        6436343,
        7962624,
        9765625,
        11881376,
        14348907,
        17210368,
        20511149,
        243e5,
        28629151,
        33554432,
        39135393,
        45435424,
        52521875,
        60466176
      ];
      o.prototype.toString = function(i, f) {
        i = i || 10, f = f | 0 || 1;
        var p;
        if (i === 16 || i === "hex") {
          p = "";
          for (var y = 0, w = 0, v = 0; v < this.length; v++) {
            var T = this.words[v], m = ((T << y | w) & 16777215).toString(16);
            w = T >>> 24 - y & 16777215, y += 2, y >= 26 && (y -= 26, v--), w !== 0 || v !== this.length - 1 ? p = I[6 - m.length] + m + p : p = m + p;
          }
          for (w !== 0 && (p = w.toString(16) + p); p.length % f !== 0; )
            p = "0" + p;
          return this.negative !== 0 && (p = "-" + p), p;
        }
        if (i === (i | 0) && i >= 2 && i <= 36) {
          var s = O[i], u = B[i];
          p = "";
          var E = this.clone();
          for (E.negative = 0; !E.isZero(); ) {
            var S = E.modrn(u).toString(i);
            E = E.idivn(u), E.isZero() ? p = S + p : p = I[s - S.length] + S + p;
          }
          for (this.isZero() && (p = "0" + p); p.length % f !== 0; )
            p = "0" + p;
          return this.negative !== 0 && (p = "-" + p), p;
        }
        n(!1, "Base should be between 2 and 36");
      }, o.prototype.toNumber = function() {
        var i = this.words[0];
        return this.length === 2 ? i += this.words[1] * 67108864 : this.length === 3 && this.words[2] === 1 ? i += 4503599627370496 + this.words[1] * 67108864 : this.length > 2 && n(!1, "Number can only safely store up to 53 bits"), this.negative !== 0 ? -i : i;
      }, o.prototype.toJSON = function() {
        return this.toString(16, 2);
      }, l && (o.prototype.toBuffer = function(i, f) {
        return this.toArrayLike(l, i, f);
      }), o.prototype.toArray = function(i, f) {
        return this.toArrayLike(Array, i, f);
      };
      var k = function(i, f) {
        return i.allocUnsafe ? i.allocUnsafe(f) : new i(f);
      };
      o.prototype.toArrayLike = function(i, f, p) {
        this._strip();
        var y = this.byteLength(), w = p || Math.max(1, y);
        n(y <= w, "byte array longer than desired length"), n(w > 0, "Requested array length <= 0");
        var v = k(i, w), T = f === "le" ? "LE" : "BE";
        return this["_toArrayLike" + T](v, y), v;
      }, o.prototype._toArrayLikeLE = function(i, f) {
        for (var p = 0, y = 0, w = 0, v = 0; w < this.length; w++) {
          var T = this.words[w] << v | y;
          i[p++] = T & 255, p < i.length && (i[p++] = T >> 8 & 255), p < i.length && (i[p++] = T >> 16 & 255), v === 6 ? (p < i.length && (i[p++] = T >> 24 & 255), y = 0, v = 0) : (y = T >>> 24, v += 2);
        }
        if (p < i.length)
          for (i[p++] = y; p < i.length; )
            i[p++] = 0;
      }, o.prototype._toArrayLikeBE = function(i, f) {
        for (var p = i.length - 1, y = 0, w = 0, v = 0; w < this.length; w++) {
          var T = this.words[w] << v | y;
          i[p--] = T & 255, p >= 0 && (i[p--] = T >> 8 & 255), p >= 0 && (i[p--] = T >> 16 & 255), v === 6 ? (p >= 0 && (i[p--] = T >> 24 & 255), y = 0, v = 0) : (y = T >>> 24, v += 2);
        }
        if (p >= 0)
          for (i[p--] = y; p >= 0; )
            i[p--] = 0;
      }, Math.clz32 ? o.prototype._countBits = function(i) {
        return 32 - Math.clz32(i);
      } : o.prototype._countBits = function(i) {
        var f = i, p = 0;
        return f >= 4096 && (p += 13, f >>>= 13), f >= 64 && (p += 7, f >>>= 7), f >= 8 && (p += 4, f >>>= 4), f >= 2 && (p += 2, f >>>= 2), p + f;
      }, o.prototype._zeroBits = function(i) {
        if (i === 0) return 26;
        var f = i, p = 0;
        return (f & 8191) === 0 && (p += 13, f >>>= 13), (f & 127) === 0 && (p += 7, f >>>= 7), (f & 15) === 0 && (p += 4, f >>>= 4), (f & 3) === 0 && (p += 2, f >>>= 2), (f & 1) === 0 && p++, p;
      }, o.prototype.bitLength = function() {
        var i = this.words[this.length - 1], f = this._countBits(i);
        return (this.length - 1) * 26 + f;
      };
      function F(g) {
        for (var i = new Array(g.bitLength()), f = 0; f < i.length; f++) {
          var p = f / 26 | 0, y = f % 26;
          i[f] = g.words[p] >>> y & 1;
        }
        return i;
      }
      o.prototype.zeroBits = function() {
        if (this.isZero()) return 0;
        for (var i = 0, f = 0; f < this.length; f++) {
          var p = this._zeroBits(this.words[f]);
          if (i += p, p !== 26) break;
        }
        return i;
      }, o.prototype.byteLength = function() {
        return Math.ceil(this.bitLength() / 8);
      }, o.prototype.toTwos = function(i) {
        return this.negative !== 0 ? this.abs().inotn(i).iaddn(1) : this.clone();
      }, o.prototype.fromTwos = function(i) {
        return this.testn(i - 1) ? this.notn(i).iaddn(1).ineg() : this.clone();
      }, o.prototype.isNeg = function() {
        return this.negative !== 0;
      }, o.prototype.neg = function() {
        return this.clone().ineg();
      }, o.prototype.ineg = function() {
        return this.isZero() || (this.negative ^= 1), this;
      }, o.prototype.iuor = function(i) {
        for (; this.length < i.length; )
          this.words[this.length++] = 0;
        for (var f = 0; f < i.length; f++)
          this.words[f] = this.words[f] | i.words[f];
        return this._strip();
      }, o.prototype.ior = function(i) {
        return n((this.negative | i.negative) === 0), this.iuor(i);
      }, o.prototype.or = function(i) {
        return this.length > i.length ? this.clone().ior(i) : i.clone().ior(this);
      }, o.prototype.uor = function(i) {
        return this.length > i.length ? this.clone().iuor(i) : i.clone().iuor(this);
      }, o.prototype.iuand = function(i) {
        var f;
        this.length > i.length ? f = i : f = this;
        for (var p = 0; p < f.length; p++)
          this.words[p] = this.words[p] & i.words[p];
        return this.length = f.length, this._strip();
      }, o.prototype.iand = function(i) {
        return n((this.negative | i.negative) === 0), this.iuand(i);
      }, o.prototype.and = function(i) {
        return this.length > i.length ? this.clone().iand(i) : i.clone().iand(this);
      }, o.prototype.uand = function(i) {
        return this.length > i.length ? this.clone().iuand(i) : i.clone().iuand(this);
      }, o.prototype.iuxor = function(i) {
        var f, p;
        this.length > i.length ? (f = this, p = i) : (f = i, p = this);
        for (var y = 0; y < p.length; y++)
          this.words[y] = f.words[y] ^ p.words[y];
        if (this !== f)
          for (; y < f.length; y++)
            this.words[y] = f.words[y];
        return this.length = f.length, this._strip();
      }, o.prototype.ixor = function(i) {
        return n((this.negative | i.negative) === 0), this.iuxor(i);
      }, o.prototype.xor = function(i) {
        return this.length > i.length ? this.clone().ixor(i) : i.clone().ixor(this);
      }, o.prototype.uxor = function(i) {
        return this.length > i.length ? this.clone().iuxor(i) : i.clone().iuxor(this);
      }, o.prototype.inotn = function(i) {
        n(typeof i == "number" && i >= 0);
        var f = Math.ceil(i / 26) | 0, p = i % 26;
        this._expand(f), p > 0 && f--;
        for (var y = 0; y < f; y++)
          this.words[y] = ~this.words[y] & 67108863;
        for (p > 0 && (this.words[y] = ~this.words[y] & 67108863 >> 26 - p, y++); y < this.length; y++)
          this.words[y] = 0;
        return this._strip();
      }, o.prototype.notn = function(i) {
        return this.clone().inotn(i);
      }, o.prototype.setn = function(i, f) {
        n(typeof i == "number" && i >= 0);
        var p = i / 26 | 0, y = i % 26;
        return this._expand(p + 1), f ? this.words[p] = this.words[p] | 1 << y : this.words[p] = this.words[p] & ~(1 << y), this._strip();
      }, o.prototype.iadd = function(i) {
        var f;
        if (this.negative !== 0 && i.negative === 0)
          return this.negative = 0, f = this.isub(i), this.negative ^= 1, this._normSign();
        if (this.negative === 0 && i.negative !== 0)
          return i.negative = 0, f = this.isub(i), i.negative = 1, f._normSign();
        var p, y;
        this.length > i.length ? (p = this, y = i) : (p = i, y = this);
        for (var w = 0, v = 0; v < y.length; v++)
          f = (p.words[v] | 0) + (y.words[v] | 0) + w, this.words[v] = f & 67108863, w = f >>> 26;
        for (; w !== 0 && v < p.length; v++)
          f = (p.words[v] | 0) + w, this.words[v] = f & 67108863, w = f >>> 26;
        if (this.length = p.length, w !== 0)
          this.words[this.length] = w, this.length++;
        else if (p !== this)
          for (; v < p.length; v++)
            this.words[v] = p.words[v];
        return this;
      }, o.prototype.add = function(i) {
        var f;
        return i.negative !== 0 && this.negative === 0 ? (i.negative = 0, f = this.sub(i), i.negative ^= 1, f) : i.negative === 0 && this.negative !== 0 ? (this.negative = 0, f = i.sub(this), this.negative = 1, f) : this.length > i.length ? this.clone().iadd(i) : i.clone().iadd(this);
      }, o.prototype.isub = function(i) {
        if (i.negative !== 0) {
          i.negative = 0;
          var f = this.iadd(i);
          return i.negative = 1, f._normSign();
        } else if (this.negative !== 0)
          return this.negative = 0, this.iadd(i), this.negative = 1, this._normSign();
        var p = this.cmp(i);
        if (p === 0)
          return this.negative = 0, this.length = 1, this.words[0] = 0, this;
        var y, w;
        p > 0 ? (y = this, w = i) : (y = i, w = this);
        for (var v = 0, T = 0; T < w.length; T++)
          f = (y.words[T] | 0) - (w.words[T] | 0) + v, v = f >> 26, this.words[T] = f & 67108863;
        for (; v !== 0 && T < y.length; T++)
          f = (y.words[T] | 0) + v, v = f >> 26, this.words[T] = f & 67108863;
        if (v === 0 && T < y.length && y !== this)
          for (; T < y.length; T++)
            this.words[T] = y.words[T];
        return this.length = Math.max(this.length, T), y !== this && (this.negative = 1), this._strip();
      }, o.prototype.sub = function(i) {
        return this.clone().isub(i);
      };
      function H(g, i, f) {
        f.negative = i.negative ^ g.negative;
        var p = g.length + i.length | 0;
        f.length = p, p = p - 1 | 0;
        var y = g.words[0] | 0, w = i.words[0] | 0, v = y * w, T = v & 67108863, m = v / 67108864 | 0;
        f.words[0] = T;
        for (var s = 1; s < p; s++) {
          for (var u = m >>> 26, E = m & 67108863, S = Math.min(s, i.length - 1), D = Math.max(0, s - g.length + 1); D <= S; D++) {
            var X = s - D | 0;
            y = g.words[X] | 0, w = i.words[D] | 0, v = y * w + E, u += v / 67108864 | 0, E = v & 67108863;
          }
          f.words[s] = E | 0, m = u | 0;
        }
        return m !== 0 ? f.words[s] = m | 0 : f.length--, f._strip();
      }
      var Y = function(i, f, p) {
        var y = i.words, w = f.words, v = p.words, T = 0, m, s, u, E = y[0] | 0, S = E & 8191, D = E >>> 13, X = y[1] | 0, J = X & 8191, et = X >>> 13, dt = y[2] | 0, pt = dt & 8191, Rt = dt >>> 13, he = y[3] | 0, Et = he & 8191, Nt = he >>> 13, mr = y[4] | 0, wt = mr & 8191, It = mr >>> 13, yr = y[5] | 0, vt = yr & 8191, yt = yr >>> 13, fe = y[6] | 0, St = fe & 8191, bt = fe >>> 13, _e = y[7] | 0, xt = _e & 8191, R = _e >>> 13, c = y[8] | 0, h = c & 8191, A = c >>> 13, M = y[9] | 0, P = M & 8191, q = M >>> 13, ht = w[0] | 0, ct = ht & 8191, ut = ht >>> 13, At = w[1] | 0, st = At & 8191, Ct = At >>> 13, _i = w[2] | 0, Mt = _i & 8191, Ut = _i >>> 13, pi = w[3] | 0, Dt = pi & 8191, Ft = pi >>> 13, gi = w[4] | 0, kt = gi & 8191, Pt = gi >>> 13, Ri = w[5] | 0, $t = Ri & 8191, Gt = Ri >>> 13, Ei = w[6] | 0, Vt = Ei & 8191, Kt = Ei >>> 13, mi = w[7] | 0, zt = mi & 8191, Ht = mi >>> 13, yi = w[8] | 0, qt = yi & 8191, Xt = yi >>> 13, Ai = w[9] | 0, Yt = Ai & 8191, Zt = Ai >>> 13;
        p.negative = i.negative ^ f.negative, p.length = 19, m = Math.imul(S, ct), s = Math.imul(S, ut), s = s + Math.imul(D, ct) | 0, u = Math.imul(D, ut);
        var en = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (en >>> 26) | 0, en &= 67108863, m = Math.imul(J, ct), s = Math.imul(J, ut), s = s + Math.imul(et, ct) | 0, u = Math.imul(et, ut), m = m + Math.imul(S, st) | 0, s = s + Math.imul(S, Ct) | 0, s = s + Math.imul(D, st) | 0, u = u + Math.imul(D, Ct) | 0;
        var rn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (rn >>> 26) | 0, rn &= 67108863, m = Math.imul(pt, ct), s = Math.imul(pt, ut), s = s + Math.imul(Rt, ct) | 0, u = Math.imul(Rt, ut), m = m + Math.imul(J, st) | 0, s = s + Math.imul(J, Ct) | 0, s = s + Math.imul(et, st) | 0, u = u + Math.imul(et, Ct) | 0, m = m + Math.imul(S, Mt) | 0, s = s + Math.imul(S, Ut) | 0, s = s + Math.imul(D, Mt) | 0, u = u + Math.imul(D, Ut) | 0;
        var nn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (nn >>> 26) | 0, nn &= 67108863, m = Math.imul(Et, ct), s = Math.imul(Et, ut), s = s + Math.imul(Nt, ct) | 0, u = Math.imul(Nt, ut), m = m + Math.imul(pt, st) | 0, s = s + Math.imul(pt, Ct) | 0, s = s + Math.imul(Rt, st) | 0, u = u + Math.imul(Rt, Ct) | 0, m = m + Math.imul(J, Mt) | 0, s = s + Math.imul(J, Ut) | 0, s = s + Math.imul(et, Mt) | 0, u = u + Math.imul(et, Ut) | 0, m = m + Math.imul(S, Dt) | 0, s = s + Math.imul(S, Ft) | 0, s = s + Math.imul(D, Dt) | 0, u = u + Math.imul(D, Ft) | 0;
        var on = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (on >>> 26) | 0, on &= 67108863, m = Math.imul(wt, ct), s = Math.imul(wt, ut), s = s + Math.imul(It, ct) | 0, u = Math.imul(It, ut), m = m + Math.imul(Et, st) | 0, s = s + Math.imul(Et, Ct) | 0, s = s + Math.imul(Nt, st) | 0, u = u + Math.imul(Nt, Ct) | 0, m = m + Math.imul(pt, Mt) | 0, s = s + Math.imul(pt, Ut) | 0, s = s + Math.imul(Rt, Mt) | 0, u = u + Math.imul(Rt, Ut) | 0, m = m + Math.imul(J, Dt) | 0, s = s + Math.imul(J, Ft) | 0, s = s + Math.imul(et, Dt) | 0, u = u + Math.imul(et, Ft) | 0, m = m + Math.imul(S, kt) | 0, s = s + Math.imul(S, Pt) | 0, s = s + Math.imul(D, kt) | 0, u = u + Math.imul(D, Pt) | 0;
        var sn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (sn >>> 26) | 0, sn &= 67108863, m = Math.imul(vt, ct), s = Math.imul(vt, ut), s = s + Math.imul(yt, ct) | 0, u = Math.imul(yt, ut), m = m + Math.imul(wt, st) | 0, s = s + Math.imul(wt, Ct) | 0, s = s + Math.imul(It, st) | 0, u = u + Math.imul(It, Ct) | 0, m = m + Math.imul(Et, Mt) | 0, s = s + Math.imul(Et, Ut) | 0, s = s + Math.imul(Nt, Mt) | 0, u = u + Math.imul(Nt, Ut) | 0, m = m + Math.imul(pt, Dt) | 0, s = s + Math.imul(pt, Ft) | 0, s = s + Math.imul(Rt, Dt) | 0, u = u + Math.imul(Rt, Ft) | 0, m = m + Math.imul(J, kt) | 0, s = s + Math.imul(J, Pt) | 0, s = s + Math.imul(et, kt) | 0, u = u + Math.imul(et, Pt) | 0, m = m + Math.imul(S, $t) | 0, s = s + Math.imul(S, Gt) | 0, s = s + Math.imul(D, $t) | 0, u = u + Math.imul(D, Gt) | 0;
        var an = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (an >>> 26) | 0, an &= 67108863, m = Math.imul(St, ct), s = Math.imul(St, ut), s = s + Math.imul(bt, ct) | 0, u = Math.imul(bt, ut), m = m + Math.imul(vt, st) | 0, s = s + Math.imul(vt, Ct) | 0, s = s + Math.imul(yt, st) | 0, u = u + Math.imul(yt, Ct) | 0, m = m + Math.imul(wt, Mt) | 0, s = s + Math.imul(wt, Ut) | 0, s = s + Math.imul(It, Mt) | 0, u = u + Math.imul(It, Ut) | 0, m = m + Math.imul(Et, Dt) | 0, s = s + Math.imul(Et, Ft) | 0, s = s + Math.imul(Nt, Dt) | 0, u = u + Math.imul(Nt, Ft) | 0, m = m + Math.imul(pt, kt) | 0, s = s + Math.imul(pt, Pt) | 0, s = s + Math.imul(Rt, kt) | 0, u = u + Math.imul(Rt, Pt) | 0, m = m + Math.imul(J, $t) | 0, s = s + Math.imul(J, Gt) | 0, s = s + Math.imul(et, $t) | 0, u = u + Math.imul(et, Gt) | 0, m = m + Math.imul(S, Vt) | 0, s = s + Math.imul(S, Kt) | 0, s = s + Math.imul(D, Vt) | 0, u = u + Math.imul(D, Kt) | 0;
        var un = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (un >>> 26) | 0, un &= 67108863, m = Math.imul(xt, ct), s = Math.imul(xt, ut), s = s + Math.imul(R, ct) | 0, u = Math.imul(R, ut), m = m + Math.imul(St, st) | 0, s = s + Math.imul(St, Ct) | 0, s = s + Math.imul(bt, st) | 0, u = u + Math.imul(bt, Ct) | 0, m = m + Math.imul(vt, Mt) | 0, s = s + Math.imul(vt, Ut) | 0, s = s + Math.imul(yt, Mt) | 0, u = u + Math.imul(yt, Ut) | 0, m = m + Math.imul(wt, Dt) | 0, s = s + Math.imul(wt, Ft) | 0, s = s + Math.imul(It, Dt) | 0, u = u + Math.imul(It, Ft) | 0, m = m + Math.imul(Et, kt) | 0, s = s + Math.imul(Et, Pt) | 0, s = s + Math.imul(Nt, kt) | 0, u = u + Math.imul(Nt, Pt) | 0, m = m + Math.imul(pt, $t) | 0, s = s + Math.imul(pt, Gt) | 0, s = s + Math.imul(Rt, $t) | 0, u = u + Math.imul(Rt, Gt) | 0, m = m + Math.imul(J, Vt) | 0, s = s + Math.imul(J, Kt) | 0, s = s + Math.imul(et, Vt) | 0, u = u + Math.imul(et, Kt) | 0, m = m + Math.imul(S, zt) | 0, s = s + Math.imul(S, Ht) | 0, s = s + Math.imul(D, zt) | 0, u = u + Math.imul(D, Ht) | 0;
        var cn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (cn >>> 26) | 0, cn &= 67108863, m = Math.imul(h, ct), s = Math.imul(h, ut), s = s + Math.imul(A, ct) | 0, u = Math.imul(A, ut), m = m + Math.imul(xt, st) | 0, s = s + Math.imul(xt, Ct) | 0, s = s + Math.imul(R, st) | 0, u = u + Math.imul(R, Ct) | 0, m = m + Math.imul(St, Mt) | 0, s = s + Math.imul(St, Ut) | 0, s = s + Math.imul(bt, Mt) | 0, u = u + Math.imul(bt, Ut) | 0, m = m + Math.imul(vt, Dt) | 0, s = s + Math.imul(vt, Ft) | 0, s = s + Math.imul(yt, Dt) | 0, u = u + Math.imul(yt, Ft) | 0, m = m + Math.imul(wt, kt) | 0, s = s + Math.imul(wt, Pt) | 0, s = s + Math.imul(It, kt) | 0, u = u + Math.imul(It, Pt) | 0, m = m + Math.imul(Et, $t) | 0, s = s + Math.imul(Et, Gt) | 0, s = s + Math.imul(Nt, $t) | 0, u = u + Math.imul(Nt, Gt) | 0, m = m + Math.imul(pt, Vt) | 0, s = s + Math.imul(pt, Kt) | 0, s = s + Math.imul(Rt, Vt) | 0, u = u + Math.imul(Rt, Kt) | 0, m = m + Math.imul(J, zt) | 0, s = s + Math.imul(J, Ht) | 0, s = s + Math.imul(et, zt) | 0, u = u + Math.imul(et, Ht) | 0, m = m + Math.imul(S, qt) | 0, s = s + Math.imul(S, Xt) | 0, s = s + Math.imul(D, qt) | 0, u = u + Math.imul(D, Xt) | 0;
        var fn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (fn >>> 26) | 0, fn &= 67108863, m = Math.imul(P, ct), s = Math.imul(P, ut), s = s + Math.imul(q, ct) | 0, u = Math.imul(q, ut), m = m + Math.imul(h, st) | 0, s = s + Math.imul(h, Ct) | 0, s = s + Math.imul(A, st) | 0, u = u + Math.imul(A, Ct) | 0, m = m + Math.imul(xt, Mt) | 0, s = s + Math.imul(xt, Ut) | 0, s = s + Math.imul(R, Mt) | 0, u = u + Math.imul(R, Ut) | 0, m = m + Math.imul(St, Dt) | 0, s = s + Math.imul(St, Ft) | 0, s = s + Math.imul(bt, Dt) | 0, u = u + Math.imul(bt, Ft) | 0, m = m + Math.imul(vt, kt) | 0, s = s + Math.imul(vt, Pt) | 0, s = s + Math.imul(yt, kt) | 0, u = u + Math.imul(yt, Pt) | 0, m = m + Math.imul(wt, $t) | 0, s = s + Math.imul(wt, Gt) | 0, s = s + Math.imul(It, $t) | 0, u = u + Math.imul(It, Gt) | 0, m = m + Math.imul(Et, Vt) | 0, s = s + Math.imul(Et, Kt) | 0, s = s + Math.imul(Nt, Vt) | 0, u = u + Math.imul(Nt, Kt) | 0, m = m + Math.imul(pt, zt) | 0, s = s + Math.imul(pt, Ht) | 0, s = s + Math.imul(Rt, zt) | 0, u = u + Math.imul(Rt, Ht) | 0, m = m + Math.imul(J, qt) | 0, s = s + Math.imul(J, Xt) | 0, s = s + Math.imul(et, qt) | 0, u = u + Math.imul(et, Xt) | 0, m = m + Math.imul(S, Yt) | 0, s = s + Math.imul(S, Zt) | 0, s = s + Math.imul(D, Yt) | 0, u = u + Math.imul(D, Zt) | 0;
        var hn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (hn >>> 26) | 0, hn &= 67108863, m = Math.imul(P, st), s = Math.imul(P, Ct), s = s + Math.imul(q, st) | 0, u = Math.imul(q, Ct), m = m + Math.imul(h, Mt) | 0, s = s + Math.imul(h, Ut) | 0, s = s + Math.imul(A, Mt) | 0, u = u + Math.imul(A, Ut) | 0, m = m + Math.imul(xt, Dt) | 0, s = s + Math.imul(xt, Ft) | 0, s = s + Math.imul(R, Dt) | 0, u = u + Math.imul(R, Ft) | 0, m = m + Math.imul(St, kt) | 0, s = s + Math.imul(St, Pt) | 0, s = s + Math.imul(bt, kt) | 0, u = u + Math.imul(bt, Pt) | 0, m = m + Math.imul(vt, $t) | 0, s = s + Math.imul(vt, Gt) | 0, s = s + Math.imul(yt, $t) | 0, u = u + Math.imul(yt, Gt) | 0, m = m + Math.imul(wt, Vt) | 0, s = s + Math.imul(wt, Kt) | 0, s = s + Math.imul(It, Vt) | 0, u = u + Math.imul(It, Kt) | 0, m = m + Math.imul(Et, zt) | 0, s = s + Math.imul(Et, Ht) | 0, s = s + Math.imul(Nt, zt) | 0, u = u + Math.imul(Nt, Ht) | 0, m = m + Math.imul(pt, qt) | 0, s = s + Math.imul(pt, Xt) | 0, s = s + Math.imul(Rt, qt) | 0, u = u + Math.imul(Rt, Xt) | 0, m = m + Math.imul(J, Yt) | 0, s = s + Math.imul(J, Zt) | 0, s = s + Math.imul(et, Yt) | 0, u = u + Math.imul(et, Zt) | 0;
        var ln = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (ln >>> 26) | 0, ln &= 67108863, m = Math.imul(P, Mt), s = Math.imul(P, Ut), s = s + Math.imul(q, Mt) | 0, u = Math.imul(q, Ut), m = m + Math.imul(h, Dt) | 0, s = s + Math.imul(h, Ft) | 0, s = s + Math.imul(A, Dt) | 0, u = u + Math.imul(A, Ft) | 0, m = m + Math.imul(xt, kt) | 0, s = s + Math.imul(xt, Pt) | 0, s = s + Math.imul(R, kt) | 0, u = u + Math.imul(R, Pt) | 0, m = m + Math.imul(St, $t) | 0, s = s + Math.imul(St, Gt) | 0, s = s + Math.imul(bt, $t) | 0, u = u + Math.imul(bt, Gt) | 0, m = m + Math.imul(vt, Vt) | 0, s = s + Math.imul(vt, Kt) | 0, s = s + Math.imul(yt, Vt) | 0, u = u + Math.imul(yt, Kt) | 0, m = m + Math.imul(wt, zt) | 0, s = s + Math.imul(wt, Ht) | 0, s = s + Math.imul(It, zt) | 0, u = u + Math.imul(It, Ht) | 0, m = m + Math.imul(Et, qt) | 0, s = s + Math.imul(Et, Xt) | 0, s = s + Math.imul(Nt, qt) | 0, u = u + Math.imul(Nt, Xt) | 0, m = m + Math.imul(pt, Yt) | 0, s = s + Math.imul(pt, Zt) | 0, s = s + Math.imul(Rt, Yt) | 0, u = u + Math.imul(Rt, Zt) | 0;
        var dn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (dn >>> 26) | 0, dn &= 67108863, m = Math.imul(P, Dt), s = Math.imul(P, Ft), s = s + Math.imul(q, Dt) | 0, u = Math.imul(q, Ft), m = m + Math.imul(h, kt) | 0, s = s + Math.imul(h, Pt) | 0, s = s + Math.imul(A, kt) | 0, u = u + Math.imul(A, Pt) | 0, m = m + Math.imul(xt, $t) | 0, s = s + Math.imul(xt, Gt) | 0, s = s + Math.imul(R, $t) | 0, u = u + Math.imul(R, Gt) | 0, m = m + Math.imul(St, Vt) | 0, s = s + Math.imul(St, Kt) | 0, s = s + Math.imul(bt, Vt) | 0, u = u + Math.imul(bt, Kt) | 0, m = m + Math.imul(vt, zt) | 0, s = s + Math.imul(vt, Ht) | 0, s = s + Math.imul(yt, zt) | 0, u = u + Math.imul(yt, Ht) | 0, m = m + Math.imul(wt, qt) | 0, s = s + Math.imul(wt, Xt) | 0, s = s + Math.imul(It, qt) | 0, u = u + Math.imul(It, Xt) | 0, m = m + Math.imul(Et, Yt) | 0, s = s + Math.imul(Et, Zt) | 0, s = s + Math.imul(Nt, Yt) | 0, u = u + Math.imul(Nt, Zt) | 0;
        var _n = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (_n >>> 26) | 0, _n &= 67108863, m = Math.imul(P, kt), s = Math.imul(P, Pt), s = s + Math.imul(q, kt) | 0, u = Math.imul(q, Pt), m = m + Math.imul(h, $t) | 0, s = s + Math.imul(h, Gt) | 0, s = s + Math.imul(A, $t) | 0, u = u + Math.imul(A, Gt) | 0, m = m + Math.imul(xt, Vt) | 0, s = s + Math.imul(xt, Kt) | 0, s = s + Math.imul(R, Vt) | 0, u = u + Math.imul(R, Kt) | 0, m = m + Math.imul(St, zt) | 0, s = s + Math.imul(St, Ht) | 0, s = s + Math.imul(bt, zt) | 0, u = u + Math.imul(bt, Ht) | 0, m = m + Math.imul(vt, qt) | 0, s = s + Math.imul(vt, Xt) | 0, s = s + Math.imul(yt, qt) | 0, u = u + Math.imul(yt, Xt) | 0, m = m + Math.imul(wt, Yt) | 0, s = s + Math.imul(wt, Zt) | 0, s = s + Math.imul(It, Yt) | 0, u = u + Math.imul(It, Zt) | 0;
        var pn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (pn >>> 26) | 0, pn &= 67108863, m = Math.imul(P, $t), s = Math.imul(P, Gt), s = s + Math.imul(q, $t) | 0, u = Math.imul(q, Gt), m = m + Math.imul(h, Vt) | 0, s = s + Math.imul(h, Kt) | 0, s = s + Math.imul(A, Vt) | 0, u = u + Math.imul(A, Kt) | 0, m = m + Math.imul(xt, zt) | 0, s = s + Math.imul(xt, Ht) | 0, s = s + Math.imul(R, zt) | 0, u = u + Math.imul(R, Ht) | 0, m = m + Math.imul(St, qt) | 0, s = s + Math.imul(St, Xt) | 0, s = s + Math.imul(bt, qt) | 0, u = u + Math.imul(bt, Xt) | 0, m = m + Math.imul(vt, Yt) | 0, s = s + Math.imul(vt, Zt) | 0, s = s + Math.imul(yt, Yt) | 0, u = u + Math.imul(yt, Zt) | 0;
        var gn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (gn >>> 26) | 0, gn &= 67108863, m = Math.imul(P, Vt), s = Math.imul(P, Kt), s = s + Math.imul(q, Vt) | 0, u = Math.imul(q, Kt), m = m + Math.imul(h, zt) | 0, s = s + Math.imul(h, Ht) | 0, s = s + Math.imul(A, zt) | 0, u = u + Math.imul(A, Ht) | 0, m = m + Math.imul(xt, qt) | 0, s = s + Math.imul(xt, Xt) | 0, s = s + Math.imul(R, qt) | 0, u = u + Math.imul(R, Xt) | 0, m = m + Math.imul(St, Yt) | 0, s = s + Math.imul(St, Zt) | 0, s = s + Math.imul(bt, Yt) | 0, u = u + Math.imul(bt, Zt) | 0;
        var Rn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (Rn >>> 26) | 0, Rn &= 67108863, m = Math.imul(P, zt), s = Math.imul(P, Ht), s = s + Math.imul(q, zt) | 0, u = Math.imul(q, Ht), m = m + Math.imul(h, qt) | 0, s = s + Math.imul(h, Xt) | 0, s = s + Math.imul(A, qt) | 0, u = u + Math.imul(A, Xt) | 0, m = m + Math.imul(xt, Yt) | 0, s = s + Math.imul(xt, Zt) | 0, s = s + Math.imul(R, Yt) | 0, u = u + Math.imul(R, Zt) | 0;
        var En = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (En >>> 26) | 0, En &= 67108863, m = Math.imul(P, qt), s = Math.imul(P, Xt), s = s + Math.imul(q, qt) | 0, u = Math.imul(q, Xt), m = m + Math.imul(h, Yt) | 0, s = s + Math.imul(h, Zt) | 0, s = s + Math.imul(A, Yt) | 0, u = u + Math.imul(A, Zt) | 0;
        var mn = (T + m | 0) + ((s & 8191) << 13) | 0;
        T = (u + (s >>> 13) | 0) + (mn >>> 26) | 0, mn &= 67108863, m = Math.imul(P, Yt), s = Math.imul(P, Zt), s = s + Math.imul(q, Yt) | 0, u = Math.imul(q, Zt);
        var yn = (T + m | 0) + ((s & 8191) << 13) | 0;
        return T = (u + (s >>> 13) | 0) + (yn >>> 26) | 0, yn &= 67108863, v[0] = en, v[1] = rn, v[2] = nn, v[3] = on, v[4] = sn, v[5] = an, v[6] = un, v[7] = cn, v[8] = fn, v[9] = hn, v[10] = ln, v[11] = dn, v[12] = _n, v[13] = pn, v[14] = gn, v[15] = Rn, v[16] = En, v[17] = mn, v[18] = yn, T !== 0 && (v[19] = T, p.length++), p;
      };
      Math.imul || (Y = H);
      function $(g, i, f) {
        f.negative = i.negative ^ g.negative, f.length = g.length + i.length;
        for (var p = 0, y = 0, w = 0; w < f.length - 1; w++) {
          var v = y;
          y = 0;
          for (var T = p & 67108863, m = Math.min(w, i.length - 1), s = Math.max(0, w - g.length + 1); s <= m; s++) {
            var u = w - s, E = g.words[u] | 0, S = i.words[s] | 0, D = E * S, X = D & 67108863;
            v = v + (D / 67108864 | 0) | 0, X = X + T | 0, T = X & 67108863, v = v + (X >>> 26) | 0, y += v >>> 26, v &= 67108863;
          }
          f.words[w] = T, p = v, v = y;
        }
        return p !== 0 ? f.words[w] = p : f.length--, f._strip();
      }
      function Q(g, i, f) {
        return $(g, i, f);
      }
      o.prototype.mulTo = function(i, f) {
        var p, y = this.length + i.length;
        return this.length === 10 && i.length === 10 ? p = Y(this, i, f) : y < 63 ? p = H(this, i, f) : y < 1024 ? p = $(this, i, f) : p = Q(this, i, f), p;
      }, o.prototype.mul = function(i) {
        var f = new o(null);
        return f.words = new Array(this.length + i.length), this.mulTo(i, f);
      }, o.prototype.mulf = function(i) {
        var f = new o(null);
        return f.words = new Array(this.length + i.length), Q(this, i, f);
      }, o.prototype.imul = function(i) {
        return this.clone().mulTo(i, this);
      }, o.prototype.imuln = function(i) {
        var f = i < 0;
        f && (i = -i), n(typeof i == "number"), n(i < 67108864);
        for (var p = 0, y = 0; y < this.length; y++) {
          var w = (this.words[y] | 0) * i, v = (w & 67108863) + (p & 67108863);
          p >>= 26, p += w / 67108864 | 0, p += v >>> 26, this.words[y] = v & 67108863;
        }
        return p !== 0 && (this.words[y] = p, this.length++), i === 0 && (this.length = 1, this._normSign()), f ? this.ineg() : this;
      }, o.prototype.muln = function(i) {
        return this.clone().imuln(i);
      }, o.prototype.sqr = function() {
        return this.mul(this);
      }, o.prototype.isqr = function() {
        return this.imul(this.clone());
      }, o.prototype.pow = function(i) {
        var f = F(i);
        if (f.length === 0) return new o(1);
        for (var p = this, y = 0; y < f.length && f[y] === 0; y++, p = p.sqr())
          ;
        if (++y < f.length)
          for (var w = p.sqr(); y < f.length; y++, w = w.sqr())
            f[y] !== 0 && (p = p.mul(w));
        return p;
      }, o.prototype.iushln = function(i) {
        n(typeof i == "number" && i >= 0);
        var f = i % 26, p = (i - f) / 26, y = 67108863 >>> 26 - f << 26 - f, w;
        if (f !== 0) {
          var v = 0;
          for (w = 0; w < this.length; w++) {
            var T = this.words[w] & y, m = (this.words[w] | 0) - T << f;
            this.words[w] = m | v, v = T >>> 26 - f;
          }
          v && (this.words[w] = v, this.length++);
        }
        if (p !== 0) {
          for (w = this.length - 1; w >= 0; w--)
            this.words[w + p] = this.words[w];
          for (w = 0; w < p; w++)
            this.words[w] = 0;
          this.length += p;
        }
        return this._strip();
      }, o.prototype.ishln = function(i) {
        return n(this.negative === 0), this.iushln(i);
      }, o.prototype.iushrn = function(i, f, p) {
        n(typeof i == "number" && i >= 0);
        var y;
        f ? y = (f - f % 26) / 26 : y = 0;
        var w = i % 26, v = Math.min((i - w) / 26, this.length), T = 67108863 ^ 67108863 >>> w << w, m = p;
        if (y -= v, y = Math.max(0, y), m) {
          for (var s = 0; s < v; s++)
            m.words[s] = this.words[s];
          m.length = v;
        }
        if (v !== 0) if (this.length > v)
          for (this.length -= v, s = 0; s < this.length; s++)
            this.words[s] = this.words[s + v];
        else
          this.words[0] = 0, this.length = 1;
        var u = 0;
        for (s = this.length - 1; s >= 0 && (u !== 0 || s >= y); s--) {
          var E = this.words[s] | 0;
          this.words[s] = u << 26 - w | E >>> w, u = E & T;
        }
        return m && u !== 0 && (m.words[m.length++] = u), this.length === 0 && (this.words[0] = 0, this.length = 1), this._strip();
      }, o.prototype.ishrn = function(i, f, p) {
        return n(this.negative === 0), this.iushrn(i, f, p);
      }, o.prototype.shln = function(i) {
        return this.clone().ishln(i);
      }, o.prototype.ushln = function(i) {
        return this.clone().iushln(i);
      }, o.prototype.shrn = function(i) {
        return this.clone().ishrn(i);
      }, o.prototype.ushrn = function(i) {
        return this.clone().iushrn(i);
      }, o.prototype.testn = function(i) {
        n(typeof i == "number" && i >= 0);
        var f = i % 26, p = (i - f) / 26, y = 1 << f;
        if (this.length <= p) return !1;
        var w = this.words[p];
        return !!(w & y);
      }, o.prototype.imaskn = function(i) {
        n(typeof i == "number" && i >= 0);
        var f = i % 26, p = (i - f) / 26;
        if (n(this.negative === 0, "imaskn works only with positive numbers"), this.length <= p)
          return this;
        if (f !== 0 && p++, this.length = Math.min(p, this.length), f !== 0) {
          var y = 67108863 ^ 67108863 >>> f << f;
          this.words[this.length - 1] &= y;
        }
        return this.length === 0 && (this.words[0] = 0, this.length = 1), this._strip();
      }, o.prototype.maskn = function(i) {
        return this.clone().imaskn(i);
      }, o.prototype.iaddn = function(i) {
        return n(typeof i == "number"), n(i < 67108864), i < 0 ? this.isubn(-i) : this.negative !== 0 ? this.length === 1 && (this.words[0] | 0) <= i ? (this.words[0] = i - (this.words[0] | 0), this.negative = 0, this) : (this.negative = 0, this.isubn(i), this.negative = 1, this) : this._iaddn(i);
      }, o.prototype._iaddn = function(i) {
        this.words[0] += i;
        for (var f = 0; f < this.length && this.words[f] >= 67108864; f++)
          this.words[f] -= 67108864, f === this.length - 1 ? this.words[f + 1] = 1 : this.words[f + 1]++;
        return this.length = Math.max(this.length, f + 1), this;
      }, o.prototype.isubn = function(i) {
        if (n(typeof i == "number"), n(i < 67108864), i < 0) return this.iaddn(-i);
        if (this.negative !== 0)
          return this.negative = 0, this.iaddn(i), this.negative = 1, this;
        if (this.words[0] -= i, this.length === 1 && this.words[0] < 0)
          this.words[0] = -this.words[0], this.negative = 1;
        else
          for (var f = 0; f < this.length && this.words[f] < 0; f++)
            this.words[f] += 67108864, this.words[f + 1] -= 1;
        return this._strip();
      }, o.prototype.addn = function(i) {
        return this.clone().iaddn(i);
      }, o.prototype.subn = function(i) {
        return this.clone().isubn(i);
      }, o.prototype.iabs = function() {
        return this.negative = 0, this;
      }, o.prototype.abs = function() {
        return this.clone().iabs();
      }, o.prototype._ishlnsubmul = function(i, f, p) {
        var y = i.length + p, w;
        this._expand(y);
        var v, T = 0;
        for (w = 0; w < i.length; w++) {
          v = (this.words[w + p] | 0) + T;
          var m = (i.words[w] | 0) * f;
          v -= m & 67108863, T = (v >> 26) - (m / 67108864 | 0), this.words[w + p] = v & 67108863;
        }
        for (; w < this.length - p; w++)
          v = (this.words[w + p] | 0) + T, T = v >> 26, this.words[w + p] = v & 67108863;
        if (T === 0) return this._strip();
        for (n(T === -1), T = 0, w = 0; w < this.length; w++)
          v = -(this.words[w] | 0) + T, T = v >> 26, this.words[w] = v & 67108863;
        return this.negative = 1, this._strip();
      }, o.prototype._wordDiv = function(i, f) {
        var p = this.length - i.length, y = this.clone(), w = i, v = w.words[w.length - 1] | 0, T = this._countBits(v);
        p = 26 - T, p !== 0 && (w = w.ushln(p), y.iushln(p), v = w.words[w.length - 1] | 0);
        var m = y.length - w.length, s;
        if (f !== "mod") {
          s = new o(null), s.length = m + 1, s.words = new Array(s.length);
          for (var u = 0; u < s.length; u++)
            s.words[u] = 0;
        }
        var E = y.clone()._ishlnsubmul(w, 1, m);
        E.negative === 0 && (y = E, s && (s.words[m] = 1));
        for (var S = m - 1; S >= 0; S--) {
          var D = (y.words[w.length + S] | 0) * 67108864 + (y.words[w.length + S - 1] | 0);
          for (D = Math.min(D / v | 0, 67108863), y._ishlnsubmul(w, D, S); y.negative !== 0; )
            D--, y.negative = 0, y._ishlnsubmul(w, 1, S), y.isZero() || (y.negative ^= 1);
          s && (s.words[S] = D);
        }
        return s && s._strip(), y._strip(), f !== "div" && p !== 0 && y.iushrn(p), {
          div: s || null,
          mod: y
        };
      }, o.prototype.divmod = function(i, f, p) {
        if (n(!i.isZero()), this.isZero())
          return {
            div: new o(0),
            mod: new o(0)
          };
        var y, w, v;
        return this.negative !== 0 && i.negative === 0 ? (v = this.neg().divmod(i, f), f !== "mod" && (y = v.div.neg()), f !== "div" && (w = v.mod.neg(), p && w.negative !== 0 && w.iadd(i)), {
          div: y,
          mod: w
        }) : this.negative === 0 && i.negative !== 0 ? (v = this.divmod(i.neg(), f), f !== "mod" && (y = v.div.neg()), {
          div: y,
          mod: v.mod
        }) : (this.negative & i.negative) !== 0 ? (v = this.neg().divmod(i.neg(), f), f !== "div" && (w = v.mod.neg(), p && w.negative !== 0 && w.isub(i)), {
          div: v.div,
          mod: w
        }) : i.length > this.length || this.cmp(i) < 0 ? {
          div: new o(0),
          mod: this
        } : i.length === 1 ? f === "div" ? {
          div: this.divn(i.words[0]),
          mod: null
        } : f === "mod" ? {
          div: null,
          mod: new o(this.modrn(i.words[0]))
        } : {
          div: this.divn(i.words[0]),
          mod: new o(this.modrn(i.words[0]))
        } : this._wordDiv(i, f);
      }, o.prototype.div = function(i) {
        return this.divmod(i, "div", !1).div;
      }, o.prototype.mod = function(i) {
        return this.divmod(i, "mod", !1).mod;
      }, o.prototype.umod = function(i) {
        return this.divmod(i, "mod", !0).mod;
      }, o.prototype.divRound = function(i) {
        var f = this.divmod(i);
        if (f.mod.isZero()) return f.div;
        var p = f.mod.abs(), y = i.abs().iushrn(1), w = i.words[0] & 1, v = p.cmp(y);
        if (v < 0 || w === 1 && v === 0) return f.div;
        var T = new o(1);
        return T.negative = this.negative ^ i.negative, f.div.iadd(T);
      }, o.prototype.modrn = function(i) {
        var f = i < 0;
        f && (i = -i), n(i <= 67108863);
        for (var p = (1 << 26) % i, y = 0, w = this.length - 1; w >= 0; w--)
          y = (p * y + (this.words[w] | 0)) % i;
        return f ? -y : y;
      }, o.prototype.modn = function(i) {
        return this.modrn(i);
      }, o.prototype.idivn = function(i) {
        var f = i < 0;
        f && (i = -i), n(i <= 67108863);
        for (var p = 0, y = this.length - 1; y >= 0; y--) {
          var w = (this.words[y] | 0) + p * 67108864;
          this.words[y] = w / i | 0, p = w % i;
        }
        return this._strip(), f ? this.ineg() : this;
      }, o.prototype.divn = function(i) {
        return this.clone().idivn(i);
      }, o.prototype.egcd = function(i) {
        n(i.negative === 0), n(!i.isZero());
        var f = this, p = i.clone();
        f.negative !== 0 ? f = f.umod(i) : f = f.clone();
        for (var y = new o(1), w = new o(0), v = new o(0), T = new o(1), m = 0; f.isEven() && p.isEven(); )
          f.iushrn(1), p.iushrn(1), ++m;
        for (var s = p.clone(), u = f.clone(); !f.isZero(); ) {
          for (var E = 0, S = 1; (f.words[0] & S) === 0 && E < 26; ++E, S <<= 1) ;
          if (E > 0)
            for (f.iushrn(E); E-- > 0; )
              (y.isOdd() || w.isOdd()) && (y.iadd(s), w.isub(u)), y.iushrn(1), w.iushrn(1);
          for (var D = 0, X = 1; (p.words[0] & X) === 0 && D < 26; ++D, X <<= 1) ;
          if (D > 0)
            for (p.iushrn(D); D-- > 0; )
              (v.isOdd() || T.isOdd()) && (v.iadd(s), T.isub(u)), v.iushrn(1), T.iushrn(1);
          f.cmp(p) >= 0 ? (f.isub(p), y.isub(v), w.isub(T)) : (p.isub(f), v.isub(y), T.isub(w));
        }
        return {
          a: v,
          b: T,
          gcd: p.iushln(m)
        };
      }, o.prototype._invmp = function(i) {
        n(i.negative === 0), n(!i.isZero());
        var f = this, p = i.clone();
        f.negative !== 0 ? f = f.umod(i) : f = f.clone();
        for (var y = new o(1), w = new o(0), v = p.clone(); f.cmpn(1) > 0 && p.cmpn(1) > 0; ) {
          for (var T = 0, m = 1; (f.words[0] & m) === 0 && T < 26; ++T, m <<= 1) ;
          if (T > 0)
            for (f.iushrn(T); T-- > 0; )
              y.isOdd() && y.iadd(v), y.iushrn(1);
          for (var s = 0, u = 1; (p.words[0] & u) === 0 && s < 26; ++s, u <<= 1) ;
          if (s > 0)
            for (p.iushrn(s); s-- > 0; )
              w.isOdd() && w.iadd(v), w.iushrn(1);
          f.cmp(p) >= 0 ? (f.isub(p), y.isub(w)) : (p.isub(f), w.isub(y));
        }
        var E;
        return f.cmpn(1) === 0 ? E = y : E = w, E.cmpn(0) < 0 && E.iadd(i), E;
      }, o.prototype.gcd = function(i) {
        if (this.isZero()) return i.abs();
        if (i.isZero()) return this.abs();
        var f = this.clone(), p = i.clone();
        f.negative = 0, p.negative = 0;
        for (var y = 0; f.isEven() && p.isEven(); y++)
          f.iushrn(1), p.iushrn(1);
        do {
          for (; f.isEven(); )
            f.iushrn(1);
          for (; p.isEven(); )
            p.iushrn(1);
          var w = f.cmp(p);
          if (w < 0) {
            var v = f;
            f = p, p = v;
          } else if (w === 0 || p.cmpn(1) === 0)
            break;
          f.isub(p);
        } while (!0);
        return p.iushln(y);
      }, o.prototype.invm = function(i) {
        return this.egcd(i).a.umod(i);
      }, o.prototype.isEven = function() {
        return (this.words[0] & 1) === 0;
      }, o.prototype.isOdd = function() {
        return (this.words[0] & 1) === 1;
      }, o.prototype.andln = function(i) {
        return this.words[0] & i;
      }, o.prototype.bincn = function(i) {
        n(typeof i == "number");
        var f = i % 26, p = (i - f) / 26, y = 1 << f;
        if (this.length <= p)
          return this._expand(p + 1), this.words[p] |= y, this;
        for (var w = y, v = p; w !== 0 && v < this.length; v++) {
          var T = this.words[v] | 0;
          T += w, w = T >>> 26, T &= 67108863, this.words[v] = T;
        }
        return w !== 0 && (this.words[v] = w, this.length++), this;
      }, o.prototype.isZero = function() {
        return this.length === 1 && this.words[0] === 0;
      }, o.prototype.cmpn = function(i) {
        var f = i < 0;
        if (this.negative !== 0 && !f) return -1;
        if (this.negative === 0 && f) return 1;
        this._strip();
        var p;
        if (this.length > 1)
          p = 1;
        else {
          f && (i = -i), n(i <= 67108863, "Number is too big");
          var y = this.words[0] | 0;
          p = y === i ? 0 : y < i ? -1 : 1;
        }
        return this.negative !== 0 ? -p | 0 : p;
      }, o.prototype.cmp = function(i) {
        if (this.negative !== 0 && i.negative === 0) return -1;
        if (this.negative === 0 && i.negative !== 0) return 1;
        var f = this.ucmp(i);
        return this.negative !== 0 ? -f | 0 : f;
      }, o.prototype.ucmp = function(i) {
        if (this.length > i.length) return 1;
        if (this.length < i.length) return -1;
        for (var f = 0, p = this.length - 1; p >= 0; p--) {
          var y = this.words[p] | 0, w = i.words[p] | 0;
          if (y !== w) {
            y < w ? f = -1 : y > w && (f = 1);
            break;
          }
        }
        return f;
      }, o.prototype.gtn = function(i) {
        return this.cmpn(i) === 1;
      }, o.prototype.gt = function(i) {
        return this.cmp(i) === 1;
      }, o.prototype.gten = function(i) {
        return this.cmpn(i) >= 0;
      }, o.prototype.gte = function(i) {
        return this.cmp(i) >= 0;
      }, o.prototype.ltn = function(i) {
        return this.cmpn(i) === -1;
      }, o.prototype.lt = function(i) {
        return this.cmp(i) === -1;
      }, o.prototype.lten = function(i) {
        return this.cmpn(i) <= 0;
      }, o.prototype.lte = function(i) {
        return this.cmp(i) <= 0;
      }, o.prototype.eqn = function(i) {
        return this.cmpn(i) === 0;
      }, o.prototype.eq = function(i) {
        return this.cmp(i) === 0;
      }, o.red = function(i) {
        return new G(i);
      }, o.prototype.toRed = function(i) {
        return n(!this.red, "Already a number in reduction context"), n(this.negative === 0, "red works only with positives"), i.convertTo(this)._forceRed(i);
      }, o.prototype.fromRed = function() {
        return n(this.red, "fromRed works only with numbers in reduction context"), this.red.convertFrom(this);
      }, o.prototype._forceRed = function(i) {
        return this.red = i, this;
      }, o.prototype.forceRed = function(i) {
        return n(!this.red, "Already a number in reduction context"), this._forceRed(i);
      }, o.prototype.redAdd = function(i) {
        return n(this.red, "redAdd works only with red numbers"), this.red.add(this, i);
      }, o.prototype.redIAdd = function(i) {
        return n(this.red, "redIAdd works only with red numbers"), this.red.iadd(this, i);
      }, o.prototype.redSub = function(i) {
        return n(this.red, "redSub works only with red numbers"), this.red.sub(this, i);
      }, o.prototype.redISub = function(i) {
        return n(this.red, "redISub works only with red numbers"), this.red.isub(this, i);
      }, o.prototype.redShl = function(i) {
        return n(this.red, "redShl works only with red numbers"), this.red.shl(this, i);
      }, o.prototype.redMul = function(i) {
        return n(this.red, "redMul works only with red numbers"), this.red._verify2(this, i), this.red.mul(this, i);
      }, o.prototype.redIMul = function(i) {
        return n(this.red, "redMul works only with red numbers"), this.red._verify2(this, i), this.red.imul(this, i);
      }, o.prototype.redSqr = function() {
        return n(this.red, "redSqr works only with red numbers"), this.red._verify1(this), this.red.sqr(this);
      }, o.prototype.redISqr = function() {
        return n(this.red, "redISqr works only with red numbers"), this.red._verify1(this), this.red.isqr(this);
      }, o.prototype.redSqrt = function() {
        return n(this.red, "redSqrt works only with red numbers"), this.red._verify1(this), this.red.sqrt(this);
      }, o.prototype.redInvm = function() {
        return n(this.red, "redInvm works only with red numbers"), this.red._verify1(this), this.red.invm(this);
      }, o.prototype.redNeg = function() {
        return n(this.red, "redNeg works only with red numbers"), this.red._verify1(this), this.red.neg(this);
      }, o.prototype.redPow = function(i) {
        return n(this.red && !i.red, "redPow(normalNum)"), this.red._verify1(this), this.red.pow(this, i);
      };
      var j = {
        k256: null,
        p224: null,
        p192: null,
        p25519: null
      };
      function nt(g, i) {
        this.name = g, this.p = new o(i, 16), this.n = this.p.bitLength(), this.k = new o(1).iushln(this.n).isub(this.p), this.tmp = this._tmp();
      }
      nt.prototype._tmp = function() {
        var i = new o(null);
        return i.words = new Array(Math.ceil(this.n / 13)), i;
      }, nt.prototype.ireduce = function(i) {
        var f = i, p;
        do
          this.split(f, this.tmp), f = this.imulK(f), f = f.iadd(this.tmp), p = f.bitLength();
        while (p > this.n);
        var y = p < this.n ? -1 : f.ucmp(this.p);
        return y === 0 ? (f.words[0] = 0, f.length = 1) : y > 0 ? f.isub(this.p) : f.strip !== void 0 ? f.strip() : f._strip(), f;
      }, nt.prototype.split = function(i, f) {
        i.iushrn(this.n, 0, f);
      }, nt.prototype.imulK = function(i) {
        return i.imul(this.k);
      };
      function at() {
        nt.call(
          this,
          "k256",
          "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f"
        );
      }
      a(at, nt), at.prototype.split = function(i, f) {
        for (var p = 4194303, y = Math.min(i.length, 9), w = 0; w < y; w++)
          f.words[w] = i.words[w];
        if (f.length = y, i.length <= 9) {
          i.words[0] = 0, i.length = 1;
          return;
        }
        var v = i.words[9];
        for (f.words[f.length++] = v & p, w = 10; w < i.length; w++) {
          var T = i.words[w] | 0;
          i.words[w - 10] = (T & p) << 4 | v >>> 22, v = T;
        }
        v >>>= 22, i.words[w - 10] = v, v === 0 && i.length > 10 ? i.length -= 10 : i.length -= 9;
      }, at.prototype.imulK = function(i) {
        i.words[i.length] = 0, i.words[i.length + 1] = 0, i.length += 2;
        for (var f = 0, p = 0; p < i.length; p++) {
          var y = i.words[p] | 0;
          f += y * 977, i.words[p] = f & 67108863, f = y * 64 + (f / 67108864 | 0);
        }
        return i.words[i.length - 1] === 0 && (i.length--, i.words[i.length - 1] === 0 && i.length--), i;
      };
      function it() {
        nt.call(
          this,
          "p224",
          "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001"
        );
      }
      a(it, nt);
      function C() {
        nt.call(
          this,
          "p192",
          "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff"
        );
      }
      a(C, nt);
      function U() {
        nt.call(
          this,
          "25519",
          "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed"
        );
      }
      a(U, nt), U.prototype.imulK = function(i) {
        for (var f = 0, p = 0; p < i.length; p++) {
          var y = (i.words[p] | 0) * 19 + f, w = y & 67108863;
          y >>>= 26, i.words[p] = w, f = y;
        }
        return f !== 0 && (i.words[i.length++] = f), i;
      }, o._prime = function(i) {
        if (j[i]) return j[i];
        var f;
        if (i === "k256")
          f = new at();
        else if (i === "p224")
          f = new it();
        else if (i === "p192")
          f = new C();
        else if (i === "p25519")
          f = new U();
        else
          throw new Error("Unknown prime " + i);
        return j[i] = f, f;
      };
      function G(g) {
        if (typeof g == "string") {
          var i = o._prime(g);
          this.m = i.p, this.prime = i;
        } else
          n(g.gtn(1), "modulus must be greater than 1"), this.m = g, this.prime = null;
      }
      G.prototype._verify1 = function(i) {
        n(i.negative === 0, "red works only with positives"), n(i.red, "red works only with red numbers");
      }, G.prototype._verify2 = function(i, f) {
        n((i.negative | f.negative) === 0, "red works only with positives"), n(
          i.red && i.red === f.red,
          "red works only with red numbers"
        );
      }, G.prototype.imod = function(i) {
        return this.prime ? this.prime.ireduce(i)._forceRed(this) : (L(i, i.umod(this.m)._forceRed(this)), i);
      }, G.prototype.neg = function(i) {
        return i.isZero() ? i.clone() : this.m.sub(i)._forceRed(this);
      }, G.prototype.add = function(i, f) {
        this._verify2(i, f);
        var p = i.add(f);
        return p.cmp(this.m) >= 0 && p.isub(this.m), p._forceRed(this);
      }, G.prototype.iadd = function(i, f) {
        this._verify2(i, f);
        var p = i.iadd(f);
        return p.cmp(this.m) >= 0 && p.isub(this.m), p;
      }, G.prototype.sub = function(i, f) {
        this._verify2(i, f);
        var p = i.sub(f);
        return p.cmpn(0) < 0 && p.iadd(this.m), p._forceRed(this);
      }, G.prototype.isub = function(i, f) {
        this._verify2(i, f);
        var p = i.isub(f);
        return p.cmpn(0) < 0 && p.iadd(this.m), p;
      }, G.prototype.shl = function(i, f) {
        return this._verify1(i), this.imod(i.ushln(f));
      }, G.prototype.imul = function(i, f) {
        return this._verify2(i, f), this.imod(i.imul(f));
      }, G.prototype.mul = function(i, f) {
        return this._verify2(i, f), this.imod(i.mul(f));
      }, G.prototype.isqr = function(i) {
        return this.imul(i, i.clone());
      }, G.prototype.sqr = function(i) {
        return this.mul(i, i);
      }, G.prototype.sqrt = function(i) {
        if (i.isZero()) return i.clone();
        var f = this.m.andln(3);
        if (n(f % 2 === 1), f === 3) {
          var p = this.m.add(new o(1)).iushrn(2);
          return this.pow(i, p);
        }
        for (var y = this.m.subn(1), w = 0; !y.isZero() && y.andln(1) === 0; )
          w++, y.iushrn(1);
        n(!y.isZero());
        var v = new o(1).toRed(this), T = v.redNeg(), m = this.m.subn(1).iushrn(1), s = this.m.bitLength();
        for (s = new o(2 * s * s).toRed(this); this.pow(s, m).cmp(T) !== 0; )
          s.redIAdd(T);
        for (var u = this.pow(s, y), E = this.pow(i, y.addn(1).iushrn(1)), S = this.pow(i, y), D = w; S.cmp(v) !== 0; ) {
          for (var X = S, J = 0; X.cmp(v) !== 0; J++)
            X = X.redSqr();
          n(J < D);
          var et = this.pow(u, new o(1).iushln(D - J - 1));
          E = E.redMul(et), u = et.redSqr(), S = S.redMul(u), D = J;
        }
        return E;
      }, G.prototype.invm = function(i) {
        var f = i._invmp(this.m);
        return f.negative !== 0 ? (f.negative = 0, this.imod(f).redNeg()) : this.imod(f);
      }, G.prototype.pow = function(i, f) {
        if (f.isZero()) return new o(1).toRed(this);
        if (f.cmpn(1) === 0) return i.clone();
        var p = 4, y = new Array(1 << p);
        y[0] = new o(1).toRed(this), y[1] = i;
        for (var w = 2; w < y.length; w++)
          y[w] = this.mul(y[w - 1], i);
        var v = y[0], T = 0, m = 0, s = f.bitLength() % 26;
        for (s === 0 && (s = 26), w = f.length - 1; w >= 0; w--) {
          for (var u = f.words[w], E = s - 1; E >= 0; E--) {
            var S = u >> E & 1;
            if (v !== y[0] && (v = this.sqr(v)), S === 0 && T === 0) {
              m = 0;
              continue;
            }
            T <<= 1, T |= S, m++, !(m !== p && (w !== 0 || E !== 0)) && (v = this.mul(v, y[T]), m = 0, T = 0);
          }
          s = 26;
        }
        return v;
      }, G.prototype.convertTo = function(i) {
        var f = i.umod(this.m);
        return f === i ? f.clone() : f;
      }, G.prototype.convertFrom = function(i) {
        var f = i.clone();
        return f.red = null, f;
      }, o.mont = function(i) {
        return new z(i);
      };
      function z(g) {
        G.call(this, g), this.shift = this.m.bitLength(), this.shift % 26 !== 0 && (this.shift += 26 - this.shift % 26), this.r = new o(1).iushln(this.shift), this.r2 = this.imod(this.r.sqr()), this.rinv = this.r._invmp(this.m), this.minv = this.rinv.mul(this.r).isubn(1).div(this.m), this.minv = this.minv.umod(this.r), this.minv = this.r.sub(this.minv);
      }
      a(z, G), z.prototype.convertTo = function(i) {
        return this.imod(i.ushln(this.shift));
      }, z.prototype.convertFrom = function(i) {
        var f = this.imod(i.mul(this.rinv));
        return f.red = null, f;
      }, z.prototype.imul = function(i, f) {
        if (i.isZero() || f.isZero())
          return i.words[0] = 0, i.length = 1, i;
        var p = i.imul(f), y = p.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m), w = p.isub(y).iushrn(this.shift), v = w;
        return w.cmp(this.m) >= 0 ? v = w.isub(this.m) : w.cmpn(0) < 0 && (v = w.iadd(this.m)), v._forceRed(this);
      }, z.prototype.mul = function(i, f) {
        if (i.isZero() || f.isZero()) return new o(0)._forceRed(this);
        var p = i.mul(f), y = p.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m), w = p.isub(y).iushrn(this.shift), v = w;
        return w.cmp(this.m) >= 0 ? v = w.isub(this.m) : w.cmpn(0) < 0 && (v = w.iadd(this.m)), v._forceRed(this);
      }, z.prototype.invm = function(i) {
        var f = this.imod(i._invmp(this.m).mul(this.r2));
        return f._forceRed(this);
      };
    })(t, wa);
  })(Tr)), Tr.exports;
}
var Sa = Uo();
const ki = /* @__PURE__ */ so(Sa);
var Nr = { exports: {} };
var Pi;
function Oa() {
  return Pi || (Pi = 1, (function(t, e) {
    var r = Wn(), n = r.Buffer;
    function a(l, d) {
      for (var _ in l)
        d[_] = l[_];
    }
    n.from && n.alloc && n.allocUnsafe && n.allocUnsafeSlow ? t.exports = r : (a(r, e), e.Buffer = o);
    function o(l, d, _) {
      return n(l, d, _);
    }
    o.prototype = Object.create(n.prototype), a(n, o), o.from = function(l, d, _) {
      if (typeof l == "number")
        throw new TypeError("Argument must not be a number");
      return n(l, d, _);
    }, o.alloc = function(l, d, _) {
      if (typeof l != "number")
        throw new TypeError("Argument must be a number");
      var N = n(l);
      return d !== void 0 ? typeof _ == "string" ? N.fill(d, _) : N.fill(d) : N.fill(0), N;
    }, o.allocUnsafe = function(l) {
      if (typeof l != "number")
        throw new TypeError("Argument must be a number");
      return n(l);
    }, o.allocUnsafeSlow = function(l) {
      if (typeof l != "number")
        throw new TypeError("Argument must be a number");
      return r.SlowBuffer(l);
    };
  })(Nr, Nr.exports)), Nr.exports;
}
var xn, $i;
function va() {
  if ($i) return xn;
  $i = 1;
  var t = Oa().Buffer;
  function e(r) {
    if (r.length >= 255)
      throw new TypeError("Alphabet too long");
    for (var n = new Uint8Array(256), a = 0; a < n.length; a++)
      n[a] = 255;
    for (var o = 0; o < r.length; o++) {
      var l = r.charAt(o), d = l.charCodeAt(0);
      if (n[d] !== 255)
        throw new TypeError(l + " is ambiguous");
      n[d] = o;
    }
    var _ = r.length, N = r.charAt(0), L = Math.log(_) / Math.log(256), x = Math.log(256) / Math.log(_);
    function I(k) {
      if ((Array.isArray(k) || k instanceof Uint8Array) && (k = t.from(k)), !t.isBuffer(k))
        throw new TypeError("Expected Buffer");
      if (k.length === 0)
        return "";
      for (var F = 0, H = 0, Y = 0, $ = k.length; Y !== $ && k[Y] === 0; )
        Y++, F++;
      for (var Q = ($ - Y) * x + 1 >>> 0, j = new Uint8Array(Q); Y !== $; ) {
        for (var nt = k[Y], at = 0, it = Q - 1; (nt !== 0 || at < H) && it !== -1; it--, at++)
          nt += 256 * j[it] >>> 0, j[it] = nt % _ >>> 0, nt = nt / _ >>> 0;
        if (nt !== 0)
          throw new Error("Non-zero carry");
        H = at, Y++;
      }
      for (var C = Q - H; C !== Q && j[C] === 0; )
        C++;
      for (var U = N.repeat(F); C < Q; ++C)
        U += r.charAt(j[C]);
      return U;
    }
    function O(k) {
      if (typeof k != "string")
        throw new TypeError("Expected String");
      if (k.length === 0)
        return t.alloc(0);
      for (var F = 0, H = 0, Y = 0; k[F] === N; )
        H++, F++;
      for (var $ = (k.length - F) * L + 1 >>> 0, Q = new Uint8Array($); F < k.length; ) {
        var j = k.charCodeAt(F);
        if (j > 255)
          return;
        var nt = n[j];
        if (nt === 255)
          return;
        for (var at = 0, it = $ - 1; (nt !== 0 || at < Y) && it !== -1; it--, at++)
          nt += _ * Q[it] >>> 0, Q[it] = nt % 256 >>> 0, nt = nt / 256 >>> 0;
        if (nt !== 0)
          throw new Error("Non-zero carry");
        Y = at, F++;
      }
      for (var C = $ - Y; C !== $ && Q[C] === 0; )
        C++;
      var U = t.allocUnsafe(H + ($ - C));
      U.fill(0, 0, H);
      for (var G = H; C !== $; )
        U[G++] = Q[C++];
      return U;
    }
    function B(k) {
      var F = O(k);
      if (F)
        return F;
      throw new Error("Non-base" + _ + " character");
    }
    return {
      encode: I,
      decodeUnsafe: O,
      decode: B
    };
  }
  return xn = e, xn;
}
var Tn, Gi;
function Do() {
  if (Gi) return Tn;
  Gi = 1;
  var t = va(), e = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  return Tn = t(e), Tn;
}
var Na = Do();
const pe = /* @__PURE__ */ so(Na), Vi = _o;
var gt = {};
function xe(t, e, r) {
  return e <= t && t <= r;
}
function Xr(t) {
  if (t === void 0) return {};
  if (t === Object(t)) return t;
  throw TypeError("Could not convert argument to dictionary");
}
function Ia(t) {
  for (var e = String(t), r = e.length, n = 0, a = []; n < r; ) {
    var o = e.charCodeAt(n);
    if (o < 55296 || o > 57343)
      a.push(o);
    else if (56320 <= o && o <= 57343)
      a.push(65533);
    else if (55296 <= o && o <= 56319)
      if (n === r - 1)
        a.push(65533);
      else {
        var l = t.charCodeAt(n + 1);
        if (56320 <= l && l <= 57343) {
          var d = o & 1023, _ = l & 1023;
          a.push(65536 + (d << 10) + _), n += 1;
        } else
          a.push(65533);
      }
    n += 1;
  }
  return a;
}
function ba(t) {
  for (var e = "", r = 0; r < t.length; ++r) {
    var n = t[r];
    n <= 65535 ? e += String.fromCharCode(n) : (n -= 65536, e += String.fromCharCode(
      (n >> 10) + 55296,
      (n & 1023) + 56320
    ));
  }
  return e;
}
var Fr = -1;
function ii(t) {
  this.tokens = [].slice.call(t);
}
ii.prototype = {
  /**
   * @return {boolean} True if end-of-stream has been hit.
   */
  endOfStream: function() {
    return !this.tokens.length;
  },
  /**
   * When a token is read from a stream, the first token in the
   * stream must be returned and subsequently removed, and
   * end-of-stream must be returned otherwise.
   *
   * @return {number} Get the next token from the stream, or
   * end_of_stream.
   */
  read: function() {
    return this.tokens.length ? this.tokens.shift() : Fr;
  },
  /**
   * When one or more tokens are prepended to a stream, those tokens
   * must be inserted, in given order, before the first token in the
   * stream.
   *
   * @param {(number|!Array.<number>)} token The token(s) to prepend to the stream.
   */
  prepend: function(t) {
    if (Array.isArray(t))
      for (var e = (
        /**@type {!Array.<number>}*/
        t
      ); e.length; )
        this.tokens.unshift(e.pop());
    else
      this.tokens.unshift(t);
  },
  /**
   * When one or more tokens are pushed to a stream, those tokens
   * must be inserted, in given order, after the last token in the
   * stream.
   *
   * @param {(number|!Array.<number>)} token The tokens(s) to prepend to the stream.
   */
  push: function(t) {
    if (Array.isArray(t))
      for (var e = (
        /**@type {!Array.<number>}*/
        t
      ); e.length; )
        this.tokens.push(e.shift());
    else
      this.tokens.push(t);
  }
};
var ir = -1;
function Ln(t, e) {
  if (t)
    throw TypeError("Decoder error");
  return e || 65533;
}
var kr = "utf-8";
function Pr(t, e) {
  if (!(this instanceof Pr))
    return new Pr(t, e);
  if (t = t !== void 0 ? String(t).toLowerCase() : kr, t !== kr)
    throw new Error("Encoding not supported. Only utf-8 is supported");
  e = Xr(e), this._streaming = !1, this._BOMseen = !1, this._decoder = null, this._fatal = !!e.fatal, this._ignoreBOM = !!e.ignoreBOM, Object.defineProperty(this, "encoding", { value: "utf-8" }), Object.defineProperty(this, "fatal", { value: this._fatal }), Object.defineProperty(this, "ignoreBOM", { value: this._ignoreBOM });
}
Pr.prototype = {
  /**
   * @param {ArrayBufferView=} input The buffer of bytes to decode.
   * @param {Object=} options
   * @return {string} The decoded string.
   */
  decode: function(e, r) {
    var n;
    typeof e == "object" && e instanceof ArrayBuffer ? n = new Uint8Array(e) : typeof e == "object" && "buffer" in e && e.buffer instanceof ArrayBuffer ? n = new Uint8Array(
      e.buffer,
      e.byteOffset,
      e.byteLength
    ) : n = new Uint8Array(0), r = Xr(r), this._streaming || (this._decoder = new xa({ fatal: this._fatal }), this._BOMseen = !1), this._streaming = !!r.stream;
    for (var a = new ii(n), o = [], l; !a.endOfStream() && (l = this._decoder.handler(a, a.read()), l !== ir); )
      l !== null && (Array.isArray(l) ? o.push.apply(
        o,
        /**@type {!Array.<number>}*/
        l
      ) : o.push(l));
    if (!this._streaming) {
      do {
        if (l = this._decoder.handler(a, a.read()), l === ir)
          break;
        l !== null && (Array.isArray(l) ? o.push.apply(
          o,
          /**@type {!Array.<number>}*/
          l
        ) : o.push(l));
      } while (!a.endOfStream());
      this._decoder = null;
    }
    return o.length && ["utf-8"].indexOf(this.encoding) !== -1 && !this._ignoreBOM && !this._BOMseen && (o[0] === 65279 ? (this._BOMseen = !0, o.shift()) : this._BOMseen = !0), ba(o);
  }
};
function $r(t, e) {
  if (!(this instanceof $r))
    return new $r(t, e);
  if (t = t !== void 0 ? String(t).toLowerCase() : kr, t !== kr)
    throw new Error("Encoding not supported. Only utf-8 is supported");
  e = Xr(e), this._streaming = !1, this._encoder = null, this._options = { fatal: !!e.fatal }, Object.defineProperty(this, "encoding", { value: "utf-8" });
}
$r.prototype = {
  /**
   * @param {string=} opt_string The string to encode.
   * @param {Object=} options
   * @return {Uint8Array} Encoded bytes, as a Uint8Array.
   */
  encode: function(e, r) {
    e = e ? String(e) : "", r = Xr(r), this._streaming || (this._encoder = new Ta(this._options)), this._streaming = !!r.stream;
    for (var n = [], a = new ii(Ia(e)), o; !a.endOfStream() && (o = this._encoder.handler(a, a.read()), o !== ir); )
      Array.isArray(o) ? n.push.apply(
        n,
        /**@type {!Array.<number>}*/
        o
      ) : n.push(o);
    if (!this._streaming) {
      for (; o = this._encoder.handler(a, a.read()), o !== ir; )
        Array.isArray(o) ? n.push.apply(
          n,
          /**@type {!Array.<number>}*/
          o
        ) : n.push(o);
      this._encoder = null;
    }
    return new Uint8Array(n);
  }
};
function xa(t) {
  var e = t.fatal, r = 0, n = 0, a = 0, o = 128, l = 191;
  this.handler = function(d, _) {
    if (_ === Fr && a !== 0)
      return a = 0, Ln(e);
    if (_ === Fr)
      return ir;
    if (a === 0) {
      if (xe(_, 0, 127))
        return _;
      if (xe(_, 194, 223))
        a = 1, r = _ - 192;
      else if (xe(_, 224, 239))
        _ === 224 && (o = 160), _ === 237 && (l = 159), a = 2, r = _ - 224;
      else if (xe(_, 240, 244))
        _ === 240 && (o = 144), _ === 244 && (l = 143), a = 3, r = _ - 240;
      else
        return Ln(e);
      return r = r << 6 * a, null;
    }
    if (!xe(_, o, l))
      return r = a = n = 0, o = 128, l = 191, d.prepend(_), Ln(e);
    if (o = 128, l = 191, n += 1, r += _ - 128 << 6 * (a - n), n !== a)
      return null;
    var N = r;
    return r = a = n = 0, N;
  };
}
function Ta(t) {
  t.fatal, this.handler = function(e, r) {
    if (r === Fr)
      return ir;
    if (xe(r, 0, 127))
      return r;
    var n, a;
    xe(r, 128, 2047) ? (n = 1, a = 192) : xe(r, 2048, 65535) ? (n = 2, a = 224) : xe(r, 65536, 1114111) && (n = 3, a = 240);
    for (var o = [(r >> 6 * n) + a]; n > 0; ) {
      var l = r >> 6 * (n - 1);
      o.push(128 | l & 63), n -= 1;
    }
    return o;
  };
}
const La = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  TextDecoder: Pr,
  TextEncoder: $r
}, Symbol.toStringTag, { value: "Module" })), Ba = /* @__PURE__ */ jn(La);
var Ki;
function Ca() {
  if (Ki) return gt;
  Ki = 1;
  var t = gt && gt.__createBinding || (Object.create ? (function(C, U, G, z) {
    z === void 0 && (z = G), Object.defineProperty(C, z, { enumerable: !0, get: function() {
      return U[G];
    } });
  }) : (function(C, U, G, z) {
    z === void 0 && (z = G), C[z] = U[G];
  })), e = gt && gt.__setModuleDefault || (Object.create ? (function(C, U) {
    Object.defineProperty(C, "default", { enumerable: !0, value: U });
  }) : function(C, U) {
    C.default = U;
  }), r = gt && gt.__decorate || function(C, U, G, z) {
    var g = arguments.length, i = g < 3 ? U : z === null ? z = Object.getOwnPropertyDescriptor(U, G) : z, f;
    if (typeof Reflect == "object" && typeof Reflect.decorate == "function") i = Reflect.decorate(C, U, G, z);
    else for (var p = C.length - 1; p >= 0; p--) (f = C[p]) && (i = (g < 3 ? f(i) : g > 3 ? f(U, G, i) : f(U, G)) || i);
    return g > 3 && i && Object.defineProperty(U, G, i), i;
  }, n = gt && gt.__importStar || function(C) {
    if (C && C.__esModule) return C;
    var U = {};
    if (C != null) for (var G in C) G !== "default" && Object.hasOwnProperty.call(C, G) && t(U, C, G);
    return e(U, C), U;
  }, a = gt && gt.__importDefault || function(C) {
    return C && C.__esModule ? C : { default: C };
  };
  Object.defineProperty(gt, "__esModule", { value: !0 }), gt.deserializeUnchecked = gt.deserialize = gt.serialize = gt.BinaryReader = gt.BinaryWriter = gt.BorshError = gt.baseDecode = gt.baseEncode = void 0;
  const o = a(Uo()), l = a(Do()), d = n(Ba), _ = typeof TextDecoder != "function" ? d.TextDecoder : TextDecoder, N = new _("utf-8", { fatal: !0 });
  function L(C) {
    return typeof C == "string" && (C = Buffer.from(C, "utf8")), l.default.encode(Buffer.from(C));
  }
  gt.baseEncode = L;
  function x(C) {
    return Buffer.from(l.default.decode(C));
  }
  gt.baseDecode = x;
  const I = 1024;
  class O extends Error {
    constructor(U) {
      super(U), this.fieldPath = [], this.originalMessage = U;
    }
    addToFieldPath(U) {
      this.fieldPath.splice(0, 0, U), this.message = this.originalMessage + ": " + this.fieldPath.join(".");
    }
  }
  gt.BorshError = O;
  class B {
    constructor() {
      this.buf = Buffer.alloc(I), this.length = 0;
    }
    maybeResize() {
      this.buf.length < 16 + this.length && (this.buf = Buffer.concat([this.buf, Buffer.alloc(I)]));
    }
    writeU8(U) {
      this.maybeResize(), this.buf.writeUInt8(U, this.length), this.length += 1;
    }
    writeU16(U) {
      this.maybeResize(), this.buf.writeUInt16LE(U, this.length), this.length += 2;
    }
    writeU32(U) {
      this.maybeResize(), this.buf.writeUInt32LE(U, this.length), this.length += 4;
    }
    writeU64(U) {
      this.maybeResize(), this.writeBuffer(Buffer.from(new o.default(U).toArray("le", 8)));
    }
    writeU128(U) {
      this.maybeResize(), this.writeBuffer(Buffer.from(new o.default(U).toArray("le", 16)));
    }
    writeU256(U) {
      this.maybeResize(), this.writeBuffer(Buffer.from(new o.default(U).toArray("le", 32)));
    }
    writeU512(U) {
      this.maybeResize(), this.writeBuffer(Buffer.from(new o.default(U).toArray("le", 64)));
    }
    writeBuffer(U) {
      this.buf = Buffer.concat([
        Buffer.from(this.buf.subarray(0, this.length)),
        U,
        Buffer.alloc(I)
      ]), this.length += U.length;
    }
    writeString(U) {
      this.maybeResize();
      const G = Buffer.from(U, "utf8");
      this.writeU32(G.length), this.writeBuffer(G);
    }
    writeFixedArray(U) {
      this.writeBuffer(Buffer.from(U));
    }
    writeArray(U, G) {
      this.maybeResize(), this.writeU32(U.length);
      for (const z of U)
        this.maybeResize(), G(z);
    }
    toArray() {
      return this.buf.subarray(0, this.length);
    }
  }
  gt.BinaryWriter = B;
  function k(C, U, G) {
    const z = G.value;
    G.value = function(...g) {
      try {
        return z.apply(this, g);
      } catch (i) {
        if (i instanceof RangeError) {
          const f = i.code;
          if (["ERR_BUFFER_OUT_OF_BOUNDS", "ERR_OUT_OF_RANGE"].indexOf(f) >= 0)
            throw new O("Reached the end of buffer when deserializing");
        }
        throw i;
      }
    };
  }
  class F {
    constructor(U) {
      this.buf = U, this.offset = 0;
    }
    readU8() {
      const U = this.buf.readUInt8(this.offset);
      return this.offset += 1, U;
    }
    readU16() {
      const U = this.buf.readUInt16LE(this.offset);
      return this.offset += 2, U;
    }
    readU32() {
      const U = this.buf.readUInt32LE(this.offset);
      return this.offset += 4, U;
    }
    readU64() {
      const U = this.readBuffer(8);
      return new o.default(U, "le");
    }
    readU128() {
      const U = this.readBuffer(16);
      return new o.default(U, "le");
    }
    readU256() {
      const U = this.readBuffer(32);
      return new o.default(U, "le");
    }
    readU512() {
      const U = this.readBuffer(64);
      return new o.default(U, "le");
    }
    readBuffer(U) {
      if (this.offset + U > this.buf.length)
        throw new O(`Expected buffer length ${U} isn't within bounds`);
      const G = this.buf.slice(this.offset, this.offset + U);
      return this.offset += U, G;
    }
    readString() {
      const U = this.readU32(), G = this.readBuffer(U);
      try {
        return N.decode(G);
      } catch (z) {
        throw new O(`Error decoding UTF-8 string: ${z}`);
      }
    }
    readFixedArray(U) {
      return new Uint8Array(this.readBuffer(U));
    }
    readArray(U) {
      const G = this.readU32(), z = Array();
      for (let g = 0; g < G; ++g)
        z.push(U());
      return z;
    }
  }
  r([
    k
  ], F.prototype, "readU8", null), r([
    k
  ], F.prototype, "readU16", null), r([
    k
  ], F.prototype, "readU32", null), r([
    k
  ], F.prototype, "readU64", null), r([
    k
  ], F.prototype, "readU128", null), r([
    k
  ], F.prototype, "readU256", null), r([
    k
  ], F.prototype, "readU512", null), r([
    k
  ], F.prototype, "readString", null), r([
    k
  ], F.prototype, "readFixedArray", null), r([
    k
  ], F.prototype, "readArray", null), gt.BinaryReader = F;
  function H(C) {
    return C.charAt(0).toUpperCase() + C.slice(1);
  }
  function Y(C, U, G, z, g) {
    try {
      if (typeof z == "string")
        g[`write${H(z)}`](G);
      else if (z instanceof Array)
        if (typeof z[0] == "number") {
          if (G.length !== z[0])
            throw new O(`Expecting byte array of length ${z[0]}, but got ${G.length} bytes`);
          g.writeFixedArray(G);
        } else if (z.length === 2 && typeof z[1] == "number") {
          if (G.length !== z[1])
            throw new O(`Expecting byte array of length ${z[1]}, but got ${G.length} bytes`);
          for (let i = 0; i < z[1]; i++)
            Y(C, null, G[i], z[0], g);
        } else
          g.writeArray(G, (i) => {
            Y(C, U, i, z[0], g);
          });
      else if (z.kind !== void 0)
        switch (z.kind) {
          case "option": {
            G == null ? g.writeU8(0) : (g.writeU8(1), Y(C, U, G, z.type, g));
            break;
          }
          case "map": {
            g.writeU32(G.size), G.forEach((i, f) => {
              Y(C, U, f, z.key, g), Y(C, U, i, z.value, g);
            });
            break;
          }
          default:
            throw new O(`FieldType ${z} unrecognized`);
        }
      else
        $(C, G, g);
    } catch (i) {
      throw i instanceof O && i.addToFieldPath(U), i;
    }
  }
  function $(C, U, G) {
    if (typeof U.borshSerialize == "function") {
      U.borshSerialize(G);
      return;
    }
    const z = C.get(U.constructor);
    if (!z)
      throw new O(`Class ${U.constructor.name} is missing in schema`);
    if (z.kind === "struct")
      z.fields.map(([g, i]) => {
        Y(C, g, U[g], i, G);
      });
    else if (z.kind === "enum") {
      const g = U[z.field];
      for (let i = 0; i < z.values.length; ++i) {
        const [f, p] = z.values[i];
        if (f === g) {
          G.writeU8(i), Y(C, f, U[f], p, G);
          break;
        }
      }
    } else
      throw new O(`Unexpected schema kind: ${z.kind} for ${U.constructor.name}`);
  }
  function Q(C, U, G = B) {
    const z = new G();
    return $(C, U, z), z.toArray();
  }
  gt.serialize = Q;
  function j(C, U, G, z) {
    try {
      if (typeof G == "string")
        return z[`read${H(G)}`]();
      if (G instanceof Array) {
        if (typeof G[0] == "number")
          return z.readFixedArray(G[0]);
        if (typeof G[1] == "number") {
          const g = [];
          for (let i = 0; i < G[1]; i++)
            g.push(j(C, null, G[0], z));
          return g;
        } else
          return z.readArray(() => j(C, U, G[0], z));
      }
      if (G.kind === "option")
        return z.readU8() ? j(C, U, G.type, z) : void 0;
      if (G.kind === "map") {
        let g = /* @__PURE__ */ new Map();
        const i = z.readU32();
        for (let f = 0; f < i; f++) {
          const p = j(C, U, G.key, z), y = j(C, U, G.value, z);
          g.set(p, y);
        }
        return g;
      }
      return nt(C, G, z);
    } catch (g) {
      throw g instanceof O && g.addToFieldPath(U), g;
    }
  }
  function nt(C, U, G) {
    if (typeof U.borshDeserialize == "function")
      return U.borshDeserialize(G);
    const z = C.get(U);
    if (!z)
      throw new O(`Class ${U.name} is missing in schema`);
    if (z.kind === "struct") {
      const g = {};
      for (const [i, f] of C.get(U).fields)
        g[i] = j(C, i, f, G);
      return new U(g);
    }
    if (z.kind === "enum") {
      const g = G.readU8();
      if (g >= z.values.length)
        throw new O(`Enum index: ${g} is out of range`);
      const [i, f] = z.values[g], p = j(C, i, f, G);
      return new U({ [i]: p });
    }
    throw new O(`Unexpected schema kind: ${z.kind} for ${U.constructor.name}`);
  }
  function at(C, U, G, z = F) {
    const g = new z(G), i = nt(C, U, g);
    if (g.offset < G.length)
      throw new O(`Unexpected ${G.length - g.offset} bytes after deserialized data`);
    return i;
  }
  gt.deserialize = at;
  function it(C, U, G, z = F) {
    const g = new z(G);
    return nt(C, U, g);
  }
  return gt.deserializeUnchecked = it, gt;
}
var Bn = Ca(), K = {}, zi;
function Ma() {
  if (zi) return K;
  zi = 1, Object.defineProperty(K, "__esModule", { value: !0 }), K.s16 = K.s8 = K.nu64be = K.u48be = K.u40be = K.u32be = K.u24be = K.u16be = K.nu64 = K.u48 = K.u40 = K.u32 = K.u24 = K.u16 = K.u8 = K.offset = K.greedy = K.Constant = K.UTF8 = K.CString = K.Blob = K.Boolean = K.BitField = K.BitStructure = K.VariantLayout = K.Union = K.UnionLayoutDiscriminator = K.UnionDiscriminator = K.Structure = K.Sequence = K.DoubleBE = K.Double = K.FloatBE = K.Float = K.NearInt64BE = K.NearInt64 = K.NearUInt64BE = K.NearUInt64 = K.IntBE = K.Int = K.UIntBE = K.UInt = K.OffsetLayout = K.GreedyCount = K.ExternalLayout = K.bindConstructorLayout = K.nameWithProperty = K.Layout = K.uint8ArrayToBuffer = K.checkUint8Array = void 0, K.constant = K.utf8 = K.cstr = K.blob = K.unionLayoutDiscriminator = K.union = K.seq = K.bits = K.struct = K.f64be = K.f64 = K.f32be = K.f32 = K.ns64be = K.s48be = K.s40be = K.s32be = K.s24be = K.s16be = K.ns64 = K.s48 = K.s40 = K.s32 = K.s24 = void 0;
  const t = Wn();
  function e(s) {
    if (!(s instanceof Uint8Array))
      throw new TypeError("b must be a Uint8Array");
  }
  K.checkUint8Array = e;
  function r(s) {
    return e(s), t.Buffer.from(s.buffer, s.byteOffset, s.length);
  }
  K.uint8ArrayToBuffer = r;
  let n = class {
    constructor(u, E) {
      if (!Number.isInteger(u))
        throw new TypeError("span must be an integer");
      this.span = u, this.property = E;
    }
    /** Function to create an Object into which decoded properties will
     * be written.
     *
     * Used only for layouts that {@link Layout#decode|decode} to Object
     * instances, which means:
     * * {@link Structure}
     * * {@link Union}
     * * {@link VariantLayout}
     * * {@link BitStructure}
     *
     * If left undefined the JavaScript representation of these layouts
     * will be Object instances.
     *
     * See {@link bindConstructorLayout}.
     */
    makeDestinationObject() {
      return {};
    }
    /**
     * Calculate the span of a specific instance of a layout.
     *
     * @param {Uint8Array} b - the buffer that contains an encoded instance.
     *
     * @param {Number} [offset] - the offset at which the encoded instance
     * starts.  If absent a zero offset is inferred.
     *
     * @return {Number} - the number of bytes covered by the layout
     * instance.  If this method is not overridden in a subclass the
     * definition-time constant {@link Layout#span|span} will be
     * returned.
     *
     * @throws {RangeError} - if the length of the value cannot be
     * determined.
     */
    getSpan(u, E) {
      if (0 > this.span)
        throw new RangeError("indeterminate span");
      return this.span;
    }
    /**
     * Replicate the layout using a new property.
     *
     * This function must be used to get a structurally-equivalent layout
     * with a different name since all {@link Layout} instances are
     * immutable.
     *
     * **NOTE** This is a shallow copy.  All fields except {@link
     * Layout#property|property} are strictly equal to the origin layout.
     *
     * @param {String} property - the value for {@link
     * Layout#property|property} in the replica.
     *
     * @returns {Layout} - the copy with {@link Layout#property|property}
     * set to `property`.
     */
    replicate(u) {
      const E = Object.create(this.constructor.prototype);
      return Object.assign(E, this), E.property = u, E;
    }
    /**
     * Create an object from layout properties and an array of values.
     *
     * **NOTE** This function returns `undefined` if invoked on a layout
     * that does not return its value as an Object.  Objects are
     * returned for things that are a {@link Structure}, which includes
     * {@link VariantLayout|variant layouts} if they are structures, and
     * excludes {@link Union}s.  If you want this feature for a union
     * you must use {@link Union.getVariant|getVariant} to select the
     * desired layout.
     *
     * @param {Array} values - an array of values that correspond to the
     * default order for properties.  As with {@link Layout#decode|decode}
     * layout elements that have no property name are skipped when
     * iterating over the array values.  Only the top-level properties are
     * assigned; arguments are not assigned to properties of contained
     * layouts.  Any unused values are ignored.
     *
     * @return {(Object|undefined)}
     */
    fromArray(u) {
    }
  };
  K.Layout = n;
  function a(s, u) {
    return u.property ? s + "[" + u.property + "]" : s;
  }
  K.nameWithProperty = a;
  function o(s, u) {
    if (typeof s != "function")
      throw new TypeError("Class must be constructor");
    if (Object.prototype.hasOwnProperty.call(s, "layout_"))
      throw new Error("Class is already bound to a layout");
    if (!(u && u instanceof n))
      throw new TypeError("layout must be a Layout");
    if (Object.prototype.hasOwnProperty.call(u, "boundConstructor_"))
      throw new Error("layout is already bound to a constructor");
    s.layout_ = u, u.boundConstructor_ = s, u.makeDestinationObject = (() => new s()), Object.defineProperty(s.prototype, "encode", {
      value(E, S) {
        return u.encode(this, E, S);
      },
      writable: !0
    }), Object.defineProperty(s, "decode", {
      value(E, S) {
        return u.decode(E, S);
      },
      writable: !0
    });
  }
  K.bindConstructorLayout = o;
  class l extends n {
    /**
     * Return `true` iff the external layout decodes to an unsigned
     * integer layout.
     *
     * In that case it can be used as the source of {@link
     * Sequence#count|Sequence counts}, {@link Blob#length|Blob lengths},
     * or as {@link UnionLayoutDiscriminator#layout|external union
     * discriminators}.
     *
     * @abstract
     */
    isCount() {
      throw new Error("ExternalLayout is abstract");
    }
  }
  K.ExternalLayout = l;
  class d extends l {
    constructor(u = 1, E) {
      if (!Number.isInteger(u) || 0 >= u)
        throw new TypeError("elementSpan must be a (positive) integer");
      super(-1, E), this.elementSpan = u;
    }
    /** @override */
    isCount() {
      return !0;
    }
    /** @override */
    decode(u, E = 0) {
      e(u);
      const S = u.length - E;
      return Math.floor(S / this.elementSpan);
    }
    /** @override */
    encode(u, E, S) {
      return 0;
    }
  }
  K.GreedyCount = d;
  class _ extends l {
    constructor(u, E = 0, S) {
      if (!(u instanceof n))
        throw new TypeError("layout must be a Layout");
      if (!Number.isInteger(E))
        throw new TypeError("offset must be integer or undefined");
      super(u.span, S || u.property), this.layout = u, this.offset = E;
    }
    /** @override */
    isCount() {
      return this.layout instanceof N || this.layout instanceof L;
    }
    /** @override */
    decode(u, E = 0) {
      return this.layout.decode(u, E + this.offset);
    }
    /** @override */
    encode(u, E, S = 0) {
      return this.layout.encode(u, E, S + this.offset);
    }
  }
  K.OffsetLayout = _;
  class N extends n {
    constructor(u, E) {
      if (super(u, E), 6 < this.span)
        throw new RangeError("span must not exceed 6 bytes");
    }
    /** @override */
    decode(u, E = 0) {
      return r(u).readUIntLE(E, this.span);
    }
    /** @override */
    encode(u, E, S = 0) {
      return r(E).writeUIntLE(u, S, this.span), this.span;
    }
  }
  K.UInt = N;
  class L extends n {
    constructor(u, E) {
      if (super(u, E), 6 < this.span)
        throw new RangeError("span must not exceed 6 bytes");
    }
    /** @override */
    decode(u, E = 0) {
      return r(u).readUIntBE(E, this.span);
    }
    /** @override */
    encode(u, E, S = 0) {
      return r(E).writeUIntBE(u, S, this.span), this.span;
    }
  }
  K.UIntBE = L;
  class x extends n {
    constructor(u, E) {
      if (super(u, E), 6 < this.span)
        throw new RangeError("span must not exceed 6 bytes");
    }
    /** @override */
    decode(u, E = 0) {
      return r(u).readIntLE(E, this.span);
    }
    /** @override */
    encode(u, E, S = 0) {
      return r(E).writeIntLE(u, S, this.span), this.span;
    }
  }
  K.Int = x;
  class I extends n {
    constructor(u, E) {
      if (super(u, E), 6 < this.span)
        throw new RangeError("span must not exceed 6 bytes");
    }
    /** @override */
    decode(u, E = 0) {
      return r(u).readIntBE(E, this.span);
    }
    /** @override */
    encode(u, E, S = 0) {
      return r(E).writeIntBE(u, S, this.span), this.span;
    }
  }
  K.IntBE = I;
  const O = Math.pow(2, 32);
  function B(s) {
    const u = Math.floor(s / O), E = s - u * O;
    return { hi32: u, lo32: E };
  }
  function k(s, u) {
    return s * O + u;
  }
  class F extends n {
    constructor(u) {
      super(8, u);
    }
    /** @override */
    decode(u, E = 0) {
      const S = r(u), D = S.readUInt32LE(E), X = S.readUInt32LE(E + 4);
      return k(X, D);
    }
    /** @override */
    encode(u, E, S = 0) {
      const D = B(u), X = r(E);
      return X.writeUInt32LE(D.lo32, S), X.writeUInt32LE(D.hi32, S + 4), 8;
    }
  }
  K.NearUInt64 = F;
  class H extends n {
    constructor(u) {
      super(8, u);
    }
    /** @override */
    decode(u, E = 0) {
      const S = r(u), D = S.readUInt32BE(E), X = S.readUInt32BE(E + 4);
      return k(D, X);
    }
    /** @override */
    encode(u, E, S = 0) {
      const D = B(u), X = r(E);
      return X.writeUInt32BE(D.hi32, S), X.writeUInt32BE(D.lo32, S + 4), 8;
    }
  }
  K.NearUInt64BE = H;
  class Y extends n {
    constructor(u) {
      super(8, u);
    }
    /** @override */
    decode(u, E = 0) {
      const S = r(u), D = S.readUInt32LE(E), X = S.readInt32LE(E + 4);
      return k(X, D);
    }
    /** @override */
    encode(u, E, S = 0) {
      const D = B(u), X = r(E);
      return X.writeUInt32LE(D.lo32, S), X.writeInt32LE(D.hi32, S + 4), 8;
    }
  }
  K.NearInt64 = Y;
  class $ extends n {
    constructor(u) {
      super(8, u);
    }
    /** @override */
    decode(u, E = 0) {
      const S = r(u), D = S.readInt32BE(E), X = S.readUInt32BE(E + 4);
      return k(D, X);
    }
    /** @override */
    encode(u, E, S = 0) {
      const D = B(u), X = r(E);
      return X.writeInt32BE(D.hi32, S), X.writeUInt32BE(D.lo32, S + 4), 8;
    }
  }
  K.NearInt64BE = $;
  class Q extends n {
    constructor(u) {
      super(4, u);
    }
    /** @override */
    decode(u, E = 0) {
      return r(u).readFloatLE(E);
    }
    /** @override */
    encode(u, E, S = 0) {
      return r(E).writeFloatLE(u, S), 4;
    }
  }
  K.Float = Q;
  class j extends n {
    constructor(u) {
      super(4, u);
    }
    /** @override */
    decode(u, E = 0) {
      return r(u).readFloatBE(E);
    }
    /** @override */
    encode(u, E, S = 0) {
      return r(E).writeFloatBE(u, S), 4;
    }
  }
  K.FloatBE = j;
  class nt extends n {
    constructor(u) {
      super(8, u);
    }
    /** @override */
    decode(u, E = 0) {
      return r(u).readDoubleLE(E);
    }
    /** @override */
    encode(u, E, S = 0) {
      return r(E).writeDoubleLE(u, S), 8;
    }
  }
  K.Double = nt;
  class at extends n {
    constructor(u) {
      super(8, u);
    }
    /** @override */
    decode(u, E = 0) {
      return r(u).readDoubleBE(E);
    }
    /** @override */
    encode(u, E, S = 0) {
      return r(E).writeDoubleBE(u, S), 8;
    }
  }
  K.DoubleBE = at;
  class it extends n {
    constructor(u, E, S) {
      if (!(u instanceof n))
        throw new TypeError("elementLayout must be a Layout");
      if (!(E instanceof l && E.isCount() || Number.isInteger(E) && 0 <= E))
        throw new TypeError("count must be non-negative integer or an unsigned integer ExternalLayout");
      let D = -1;
      !(E instanceof l) && 0 < u.span && (D = E * u.span), super(D, S), this.elementLayout = u, this.count = E;
    }
    /** @override */
    getSpan(u, E = 0) {
      if (0 <= this.span)
        return this.span;
      let S = 0, D = this.count;
      if (D instanceof l && (D = D.decode(u, E)), 0 < this.elementLayout.span)
        S = D * this.elementLayout.span;
      else {
        let X = 0;
        for (; X < D; )
          S += this.elementLayout.getSpan(u, E + S), ++X;
      }
      return S;
    }
    /** @override */
    decode(u, E = 0) {
      const S = [];
      let D = 0, X = this.count;
      for (X instanceof l && (X = X.decode(u, E)); D < X; )
        S.push(this.elementLayout.decode(u, E)), E += this.elementLayout.getSpan(u, E), D += 1;
      return S;
    }
    /** Implement {@link Layout#encode|encode} for {@link Sequence}.
     *
     * **NOTE** If `src` is shorter than {@link Sequence#count|count} then
     * the unused space in the buffer is left unchanged.  If `src` is
     * longer than {@link Sequence#count|count} the unneeded elements are
     * ignored.
     *
     * **NOTE** If {@link Layout#count|count} is an instance of {@link
     * ExternalLayout} then the length of `src` will be encoded as the
     * count after `src` is encoded. */
    encode(u, E, S = 0) {
      const D = this.elementLayout, X = u.reduce((J, et) => J + D.encode(et, E, S + J), 0);
      return this.count instanceof l && this.count.encode(u.length, E, S), X;
    }
  }
  K.Sequence = it;
  class C extends n {
    constructor(u, E, S) {
      if (!(Array.isArray(u) && u.reduce((X, J) => X && J instanceof n, !0)))
        throw new TypeError("fields must be array of Layout instances");
      typeof E == "boolean" && S === void 0 && (S = E, E = void 0);
      for (const X of u)
        if (0 > X.span && X.property === void 0)
          throw new Error("fields cannot contain unnamed variable-length layout");
      let D = -1;
      try {
        D = u.reduce((X, J) => X + J.getSpan(), 0);
      } catch {
      }
      super(D, E), this.fields = u, this.decodePrefixes = !!S;
    }
    /** @override */
    getSpan(u, E = 0) {
      if (0 <= this.span)
        return this.span;
      let S = 0;
      try {
        S = this.fields.reduce((D, X) => {
          const J = X.getSpan(u, E);
          return E += J, D + J;
        }, 0);
      } catch {
        throw new RangeError("indeterminate span");
      }
      return S;
    }
    /** @override */
    decode(u, E = 0) {
      e(u);
      const S = this.makeDestinationObject();
      for (const D of this.fields)
        if (D.property !== void 0 && (S[D.property] = D.decode(u, E)), E += D.getSpan(u, E), this.decodePrefixes && u.length === E)
          break;
      return S;
    }
    /** Implement {@link Layout#encode|encode} for {@link Structure}.
     *
     * If `src` is missing a property for a member with a defined {@link
     * Layout#property|property} the corresponding region of the buffer is
     * left unmodified. */
    encode(u, E, S = 0) {
      const D = S;
      let X = 0, J = 0;
      for (const et of this.fields) {
        let dt = et.span;
        if (J = 0 < dt ? dt : 0, et.property !== void 0) {
          const pt = u[et.property];
          pt !== void 0 && (J = et.encode(pt, E, S), 0 > dt && (dt = et.getSpan(E, S)));
        }
        X = S, S += dt;
      }
      return X + J - D;
    }
    /** @override */
    fromArray(u) {
      const E = this.makeDestinationObject();
      for (const S of this.fields)
        S.property !== void 0 && 0 < u.length && (E[S.property] = u.shift());
      return E;
    }
    /**
     * Get access to the layout of a given property.
     *
     * @param {String} property - the structure member of interest.
     *
     * @return {Layout} - the layout associated with `property`, or
     * undefined if there is no such property.
     */
    layoutFor(u) {
      if (typeof u != "string")
        throw new TypeError("property must be string");
      for (const E of this.fields)
        if (E.property === u)
          return E;
    }
    /**
     * Get the offset of a structure member.
     *
     * @param {String} property - the structure member of interest.
     *
     * @return {Number} - the offset in bytes to the start of `property`
     * within the structure, or undefined if `property` is not a field
     * within the structure.  If the property is a member but follows a
     * variable-length structure member a negative number will be
     * returned.
     */
    offsetOf(u) {
      if (typeof u != "string")
        throw new TypeError("property must be string");
      let E = 0;
      for (const S of this.fields) {
        if (S.property === u)
          return E;
        0 > S.span ? E = -1 : 0 <= E && (E += S.span);
      }
    }
  }
  K.Structure = C;
  class U {
    constructor(u) {
      this.property = u;
    }
    /** Analog to {@link Layout#decode|Layout decode} for union discriminators.
     *
     * The implementation of this method need not reference the buffer if
     * variant information is available through other means. */
    decode(u, E) {
      throw new Error("UnionDiscriminator is abstract");
    }
    /** Analog to {@link Layout#decode|Layout encode} for union discriminators.
     *
     * The implementation of this method need not store the value if
     * variant information is maintained through other means. */
    encode(u, E, S) {
      throw new Error("UnionDiscriminator is abstract");
    }
  }
  K.UnionDiscriminator = U;
  class G extends U {
    constructor(u, E) {
      if (!(u instanceof l && u.isCount()))
        throw new TypeError("layout must be an unsigned integer ExternalLayout");
      super(E || u.property || "variant"), this.layout = u;
    }
    /** Delegate decoding to {@link UnionLayoutDiscriminator#layout|layout}. */
    decode(u, E) {
      return this.layout.decode(u, E);
    }
    /** Delegate encoding to {@link UnionLayoutDiscriminator#layout|layout}. */
    encode(u, E, S) {
      return this.layout.encode(u, E, S);
    }
  }
  K.UnionLayoutDiscriminator = G;
  class z extends n {
    constructor(u, E, S) {
      let D;
      if (u instanceof N || u instanceof L)
        D = new G(new _(u));
      else if (u instanceof l && u.isCount())
        D = new G(u);
      else if (u instanceof U)
        D = u;
      else
        throw new TypeError("discr must be a UnionDiscriminator or an unsigned integer layout");
      if (E === void 0 && (E = null), !(E === null || E instanceof n))
        throw new TypeError("defaultLayout must be null or a Layout");
      if (E !== null) {
        if (0 > E.span)
          throw new Error("defaultLayout must have constant span");
        E.property === void 0 && (E = E.replicate("content"));
      }
      let X = -1;
      E && (X = E.span, 0 <= X && (u instanceof N || u instanceof L) && (X += D.layout.span)), super(X, S), this.discriminator = D, this.usesPrefixDiscriminator = u instanceof N || u instanceof L, this.defaultLayout = E, this.registry = {};
      let J = this.defaultGetSourceVariant.bind(this);
      this.getSourceVariant = function(et) {
        return J(et);
      }, this.configGetSourceVariant = function(et) {
        J = et.bind(this);
      };
    }
    /** @override */
    getSpan(u, E = 0) {
      if (0 <= this.span)
        return this.span;
      const S = this.getVariant(u, E);
      if (!S)
        throw new Error("unable to determine span for unrecognized variant");
      return S.getSpan(u, E);
    }
    /**
     * Method to infer a registered Union variant compatible with `src`.
     *
     * The first satisfied rule in the following sequence defines the
     * return value:
     * * If `src` has properties matching the Union discriminator and
     *   the default layout, `undefined` is returned regardless of the
     *   value of the discriminator property (this ensures the default
     *   layout will be used);
     * * If `src` has a property matching the Union discriminator, the
     *   value of the discriminator identifies a registered variant, and
     *   either (a) the variant has no layout, or (b) `src` has the
     *   variant's property, then the variant is returned (because the
     *   source satisfies the constraints of the variant it identifies);
     * * If `src` does not have a property matching the Union
     *   discriminator, but does have a property matching a registered
     *   variant, then the variant is returned (because the source
     *   matches a variant without an explicit conflict);
     * * An error is thrown (because we either can't identify a variant,
     *   or we were explicitly told the variant but can't satisfy it).
     *
     * @param {Object} src - an object presumed to be compatible with
     * the content of the Union.
     *
     * @return {(undefined|VariantLayout)} - as described above.
     *
     * @throws {Error} - if `src` cannot be associated with a default or
     * registered variant.
     */
    defaultGetSourceVariant(u) {
      if (Object.prototype.hasOwnProperty.call(u, this.discriminator.property)) {
        if (this.defaultLayout && this.defaultLayout.property && Object.prototype.hasOwnProperty.call(u, this.defaultLayout.property))
          return;
        const E = this.registry[u[this.discriminator.property]];
        if (E && (!E.layout || E.property && Object.prototype.hasOwnProperty.call(u, E.property)))
          return E;
      } else
        for (const E in this.registry) {
          const S = this.registry[E];
          if (S.property && Object.prototype.hasOwnProperty.call(u, S.property))
            return S;
        }
      throw new Error("unable to infer src variant");
    }
    /** Implement {@link Layout#decode|decode} for {@link Union}.
     *
     * If the variant is {@link Union#addVariant|registered} the return
     * value is an instance of that variant, with no explicit
     * discriminator.  Otherwise the {@link Union#defaultLayout|default
     * layout} is used to decode the content. */
    decode(u, E = 0) {
      let S;
      const D = this.discriminator, X = D.decode(u, E), J = this.registry[X];
      if (J === void 0) {
        const et = this.defaultLayout;
        let dt = 0;
        this.usesPrefixDiscriminator && (dt = D.layout.span), S = this.makeDestinationObject(), S[D.property] = X, S[et.property] = et.decode(u, E + dt);
      } else
        S = J.decode(u, E);
      return S;
    }
    /** Implement {@link Layout#encode|encode} for {@link Union}.
     *
     * This API assumes the `src` object is consistent with the union's
     * {@link Union#defaultLayout|default layout}.  To encode variants
     * use the appropriate variant-specific {@link VariantLayout#encode}
     * method. */
    encode(u, E, S = 0) {
      const D = this.getSourceVariant(u);
      if (D === void 0) {
        const X = this.discriminator, J = this.defaultLayout;
        let et = 0;
        return this.usesPrefixDiscriminator && (et = X.layout.span), X.encode(u[X.property], E, S), et + J.encode(u[J.property], E, S + et);
      }
      return D.encode(u, E, S);
    }
    /** Register a new variant structure within a union.  The newly
     * created variant is returned.
     *
     * @param {Number} variant - initializer for {@link
     * VariantLayout#variant|variant}.
     *
     * @param {Layout} layout - initializer for {@link
     * VariantLayout#layout|layout}.
     *
     * @param {String} property - initializer for {@link
     * Layout#property|property}.
     *
     * @return {VariantLayout} */
    addVariant(u, E, S) {
      const D = new g(this, u, E, S);
      return this.registry[u] = D, D;
    }
    /**
     * Get the layout associated with a registered variant.
     *
     * If `vb` does not produce a registered variant the function returns
     * `undefined`.
     *
     * @param {(Number|Uint8Array)} vb - either the variant number, or a
     * buffer from which the discriminator is to be read.
     *
     * @param {Number} offset - offset into `vb` for the start of the
     * union.  Used only when `vb` is an instance of {Uint8Array}.
     *
     * @return {({VariantLayout}|undefined)}
     */
    getVariant(u, E = 0) {
      let S;
      return u instanceof Uint8Array ? S = this.discriminator.decode(u, E) : S = u, this.registry[S];
    }
  }
  K.Union = z;
  class g extends n {
    constructor(u, E, S, D) {
      if (!(u instanceof z))
        throw new TypeError("union must be a Union");
      if (!Number.isInteger(E) || 0 > E)
        throw new TypeError("variant must be a (non-negative) integer");
      if (typeof S == "string" && D === void 0 && (D = S, S = null), S) {
        if (!(S instanceof n))
          throw new TypeError("layout must be a Layout");
        if (u.defaultLayout !== null && 0 <= S.span && S.span > u.defaultLayout.span)
          throw new Error("variant span exceeds span of containing union");
        if (typeof D != "string")
          throw new TypeError("variant must have a String property");
      }
      let X = u.span;
      0 > u.span && (X = S ? S.span : 0, 0 <= X && u.usesPrefixDiscriminator && (X += u.discriminator.layout.span)), super(X, D), this.union = u, this.variant = E, this.layout = S || null;
    }
    /** @override */
    getSpan(u, E = 0) {
      if (0 <= this.span)
        return this.span;
      let S = 0;
      this.union.usesPrefixDiscriminator && (S = this.union.discriminator.layout.span);
      let D = 0;
      return this.layout && (D = this.layout.getSpan(u, E + S)), S + D;
    }
    /** @override */
    decode(u, E = 0) {
      const S = this.makeDestinationObject();
      if (this !== this.union.getVariant(u, E))
        throw new Error("variant mismatch");
      let D = 0;
      return this.union.usesPrefixDiscriminator && (D = this.union.discriminator.layout.span), this.layout ? S[this.property] = this.layout.decode(u, E + D) : this.property ? S[this.property] = !0 : this.union.usesPrefixDiscriminator && (S[this.union.discriminator.property] = this.variant), S;
    }
    /** @override */
    encode(u, E, S = 0) {
      let D = 0;
      if (this.union.usesPrefixDiscriminator && (D = this.union.discriminator.layout.span), this.layout && !Object.prototype.hasOwnProperty.call(u, this.property))
        throw new TypeError("variant lacks property " + this.property);
      this.union.discriminator.encode(this.variant, E, S);
      let X = D;
      if (this.layout && (this.layout.encode(u[this.property], E, S + D), X += this.layout.getSpan(E, S + D), 0 <= this.union.span && X > this.union.span))
        throw new Error("encoded variant overruns containing union");
      return X;
    }
    /** Delegate {@link Layout#fromArray|fromArray} to {@link
     * VariantLayout#layout|layout}. */
    fromArray(u) {
      if (this.layout)
        return this.layout.fromArray(u);
    }
  }
  K.VariantLayout = g;
  function i(s) {
    return 0 > s && (s += 4294967296), s;
  }
  class f extends n {
    constructor(u, E, S) {
      if (!(u instanceof N || u instanceof L))
        throw new TypeError("word must be a UInt or UIntBE layout");
      if (typeof E == "string" && S === void 0 && (S = E, E = !1), 4 < u.span)
        throw new RangeError("word cannot exceed 32 bits");
      super(u.span, S), this.word = u, this.msb = !!E, this.fields = [];
      let D = 0;
      this._packedSetValue = function(X) {
        return D = i(X), this;
      }, this._packedGetValue = function() {
        return D;
      };
    }
    /** @override */
    decode(u, E = 0) {
      const S = this.makeDestinationObject(), D = this.word.decode(u, E);
      this._packedSetValue(D);
      for (const X of this.fields)
        X.property !== void 0 && (S[X.property] = X.decode(u));
      return S;
    }
    /** Implement {@link Layout#encode|encode} for {@link BitStructure}.
     *
     * If `src` is missing a property for a member with a defined {@link
     * Layout#property|property} the corresponding region of the packed
     * value is left unmodified.  Unused bits are also left unmodified. */
    encode(u, E, S = 0) {
      const D = this.word.decode(E, S);
      this._packedSetValue(D);
      for (const X of this.fields)
        if (X.property !== void 0) {
          const J = u[X.property];
          J !== void 0 && X.encode(J);
        }
      return this.word.encode(this._packedGetValue(), E, S);
    }
    /** Register a new bitfield with a containing bit structure.  The
     * resulting bitfield is returned.
     *
     * @param {Number} bits - initializer for {@link BitField#bits|bits}.
     *
     * @param {string} property - initializer for {@link
     * Layout#property|property}.
     *
     * @return {BitField} */
    addField(u, E) {
      const S = new p(this, u, E);
      return this.fields.push(S), S;
    }
    /** As with {@link BitStructure#addField|addField} for single-bit
     * fields with `boolean` value representation.
     *
     * @param {string} property - initializer for {@link
     * Layout#property|property}.
     *
     * @return {Boolean} */
    // `Boolean` conflicts with the native primitive type
    // eslint-disable-next-line @typescript-eslint/ban-types
    addBoolean(u) {
      const E = new y(this, u);
      return this.fields.push(E), E;
    }
    /**
     * Get access to the bit field for a given property.
     *
     * @param {String} property - the bit field of interest.
     *
     * @return {BitField} - the field associated with `property`, or
     * undefined if there is no such property.
     */
    fieldFor(u) {
      if (typeof u != "string")
        throw new TypeError("property must be string");
      for (const E of this.fields)
        if (E.property === u)
          return E;
    }
  }
  K.BitStructure = f;
  class p {
    constructor(u, E, S) {
      if (!(u instanceof f))
        throw new TypeError("container must be a BitStructure");
      if (!Number.isInteger(E) || 0 >= E)
        throw new TypeError("bits must be positive integer");
      const D = 8 * u.span, X = u.fields.reduce((J, et) => J + et.bits, 0);
      if (E + X > D)
        throw new Error("bits too long for span remainder (" + (D - X) + " of " + D + " remain)");
      this.container = u, this.bits = E, this.valueMask = (1 << E) - 1, E === 32 && (this.valueMask = 4294967295), this.start = X, this.container.msb && (this.start = D - X - E), this.wordMask = i(this.valueMask << this.start), this.property = S;
    }
    /** Store a value into the corresponding subsequence of the containing
     * bit field. */
    decode(u, E) {
      const S = this.container._packedGetValue();
      return i(S & this.wordMask) >>> this.start;
    }
    /** Store a value into the corresponding subsequence of the containing
     * bit field.
     *
     * **NOTE** This is not a specialization of {@link
     * Layout#encode|Layout.encode} and there is no return value. */
    encode(u) {
      if (typeof u != "number" || !Number.isInteger(u) || u !== i(u & this.valueMask))
        throw new TypeError(a("BitField.encode", this) + " value must be integer not exceeding " + this.valueMask);
      const E = this.container._packedGetValue(), S = i(u << this.start);
      this.container._packedSetValue(i(E & ~this.wordMask) | S);
    }
  }
  K.BitField = p;
  class y extends p {
    constructor(u, E) {
      super(u, 1, E);
    }
    /** Override {@link BitField#decode|decode} for {@link Boolean|Boolean}.
     *
     * @returns {boolean} */
    decode(u, E) {
      return !!super.decode(u, E);
    }
    /** @override */
    encode(u) {
      typeof u == "boolean" && (u = +u), super.encode(u);
    }
  }
  K.Boolean = y;
  class w extends n {
    constructor(u, E) {
      if (!(u instanceof l && u.isCount() || Number.isInteger(u) && 0 <= u))
        throw new TypeError("length must be positive integer or an unsigned integer ExternalLayout");
      let S = -1;
      u instanceof l || (S = u), super(S, E), this.length = u;
    }
    /** @override */
    getSpan(u, E) {
      let S = this.span;
      return 0 > S && (S = this.length.decode(u, E)), S;
    }
    /** @override */
    decode(u, E = 0) {
      let S = this.span;
      return 0 > S && (S = this.length.decode(u, E)), r(u).slice(E, E + S);
    }
    /** Implement {@link Layout#encode|encode} for {@link Blob}.
     *
     * **NOTE** If {@link Layout#count|count} is an instance of {@link
     * ExternalLayout} then the length of `src` will be encoded as the
     * count after `src` is encoded. */
    encode(u, E, S) {
      let D = this.length;
      if (this.length instanceof l && (D = u.length), !(u instanceof Uint8Array && D === u.length))
        throw new TypeError(a("Blob.encode", this) + " requires (length " + D + ") Uint8Array as src");
      if (S + D > E.length)
        throw new RangeError("encoding overruns Uint8Array");
      const X = r(u);
      return r(E).write(X.toString("hex"), S, D, "hex"), this.length instanceof l && this.length.encode(D, E, S), D;
    }
  }
  K.Blob = w;
  class v extends n {
    constructor(u) {
      super(-1, u);
    }
    /** @override */
    getSpan(u, E = 0) {
      e(u);
      let S = E;
      for (; S < u.length && u[S] !== 0; )
        S += 1;
      return 1 + S - E;
    }
    /** @override */
    decode(u, E = 0) {
      const S = this.getSpan(u, E);
      return r(u).slice(E, E + S - 1).toString("utf-8");
    }
    /** @override */
    encode(u, E, S = 0) {
      typeof u != "string" && (u = String(u));
      const D = t.Buffer.from(u, "utf8"), X = D.length;
      if (S + X > E.length)
        throw new RangeError("encoding overruns Buffer");
      const J = r(E);
      return D.copy(J, S), J[S + X] = 0, X + 1;
    }
  }
  K.CString = v;
  class T extends n {
    constructor(u, E) {
      if (typeof u == "string" && E === void 0 && (E = u, u = void 0), u === void 0)
        u = -1;
      else if (!Number.isInteger(u))
        throw new TypeError("maxSpan must be an integer");
      super(-1, E), this.maxSpan = u;
    }
    /** @override */
    getSpan(u, E = 0) {
      return e(u), u.length - E;
    }
    /** @override */
    decode(u, E = 0) {
      const S = this.getSpan(u, E);
      if (0 <= this.maxSpan && this.maxSpan < S)
        throw new RangeError("text length exceeds maxSpan");
      return r(u).slice(E, E + S).toString("utf-8");
    }
    /** @override */
    encode(u, E, S = 0) {
      typeof u != "string" && (u = String(u));
      const D = t.Buffer.from(u, "utf8"), X = D.length;
      if (0 <= this.maxSpan && this.maxSpan < X)
        throw new RangeError("text length exceeds maxSpan");
      if (S + X > E.length)
        throw new RangeError("encoding overruns Buffer");
      return D.copy(r(E), S), X;
    }
  }
  K.UTF8 = T;
  class m extends n {
    constructor(u, E) {
      super(0, E), this.value = u;
    }
    /** @override */
    decode(u, E) {
      return this.value;
    }
    /** @override */
    encode(u, E, S) {
      return 0;
    }
  }
  return K.Constant = m, K.greedy = ((s, u) => new d(s, u)), K.offset = ((s, u, E) => new _(s, u, E)), K.u8 = ((s) => new N(1, s)), K.u16 = ((s) => new N(2, s)), K.u24 = ((s) => new N(3, s)), K.u32 = ((s) => new N(4, s)), K.u40 = ((s) => new N(5, s)), K.u48 = ((s) => new N(6, s)), K.nu64 = ((s) => new F(s)), K.u16be = ((s) => new L(2, s)), K.u24be = ((s) => new L(3, s)), K.u32be = ((s) => new L(4, s)), K.u40be = ((s) => new L(5, s)), K.u48be = ((s) => new L(6, s)), K.nu64be = ((s) => new H(s)), K.s8 = ((s) => new x(1, s)), K.s16 = ((s) => new x(2, s)), K.s24 = ((s) => new x(3, s)), K.s32 = ((s) => new x(4, s)), K.s40 = ((s) => new x(5, s)), K.s48 = ((s) => new x(6, s)), K.ns64 = ((s) => new Y(s)), K.s16be = ((s) => new I(2, s)), K.s24be = ((s) => new I(3, s)), K.s32be = ((s) => new I(4, s)), K.s40be = ((s) => new I(5, s)), K.s48be = ((s) => new I(6, s)), K.ns64be = ((s) => new $(s)), K.f32 = ((s) => new Q(s)), K.f32be = ((s) => new j(s)), K.f64 = ((s) => new nt(s)), K.f64be = ((s) => new at(s)), K.struct = ((s, u, E) => new C(s, u, E)), K.bits = ((s, u, E) => new f(s, u, E)), K.seq = ((s, u, E) => new it(s, u, E)), K.union = ((s, u, E) => new z(s, u, E)), K.unionLayoutDiscriminator = ((s, u) => new G(s, u)), K.blob = ((s, u) => new w(s, u)), K.cstr = ((s) => new v(s)), K.utf8 = ((s, u) => new T(s, u)), K.constant = ((s, u) => new m(s, u)), K;
}
var b = Ma(), Ua = 1, Da = 2, Fa = 3, ka = 4, Pa = 5, $a = 6, Ga = 7, Va = 8, Ka = 9, za = 10, Ha = -32700, qa = -32603, Xa = -32602, Ya = -32601, Za = -32600, ja = -32019, Wa = -32018, Ja = -32017, Qa = -32016, tu = -32015, eu = -32014, ru = -32013, nu = -32012, iu = -32011, ou = -32010, su = -32009, au = -32008, uu = -32007, cu = -32006, fu = -32005, hu = -32004, lu = -32003, du = -32002, _u = -32001, pu = 28e5, gu = 2800001, Ru = 2800002, Eu = 2800003, mu = 2800004, yu = 2800005, Au = 2800006, wu = 2800007, Su = 2800008, Ou = 2800009, vu = 2800010, Nu = 2800011, Iu = 323e4, bu = 32300001, xu = 3230002, Tu = 3230003, Lu = 3230004, Bu = 361e4, Cu = 3610001, Mu = 3610002, Uu = 3610003, Du = 3610004, Fu = 3610005, ku = 3610006, Pu = 3610007, $u = 3611e3, Gu = 3704e3, Vu = 3704001, Ku = 3704002, zu = 3704003, Hu = 3704004, qu = 4128e3, Xu = 4128001, Yu = 4128002, Zu = 4615e3, ju = 4615001, Wu = 4615002, Ju = 4615003, Qu = 4615004, tc = 4615005, ec = 4615006, rc = 4615007, nc = 4615008, ic = 4615009, oc = 4615010, sc = 4615011, ac = 4615012, uc = 4615013, cc = 4615014, fc = 4615015, hc = 4615016, lc = 4615017, dc = 4615018, _c = 4615019, pc = 4615020, gc = 4615021, Rc = 4615022, Ec = 4615023, mc = 4615024, yc = 4615025, Ac = 4615026, wc = 4615027, Sc = 4615028, Oc = 4615029, vc = 4615030, Nc = 4615031, Ic = 4615032, bc = 4615033, xc = 4615034, Tc = 4615035, Lc = 4615036, Bc = 4615037, Cc = 4615038, Mc = 4615039, Uc = 4615040, Dc = 4615041, Fc = 4615042, kc = 4615043, Pc = 4615044, $c = 4615045, Gc = 4615046, Vc = 4615047, Kc = 4615048, zc = 4615049, Hc = 4615050, qc = 4615051, Xc = 4615052, Yc = 4615053, Zc = 4615054, jc = 5508e3, Wc = 5508001, Jc = 5508002, Qc = 5508003, tf = 5508004, ef = 5508005, rf = 5508006, nf = 5508007, of = 5508008, sf = 5508009, af = 5508010, uf = 5508011, cf = 5607e3, ff = 5607001, hf = 5607002, lf = 5607003, df = 5607004, _f = 5607005, pf = 5607006, gf = 5607007, Rf = 5607008, Ef = 5607009, mf = 5607010, yf = 5607011, Af = 5607012, wf = 5607013, Sf = 5607014, Of = 5607015, vf = 5607016, Nf = 5607017, If = 5663e3, bf = 5663001, xf = 5663002, Tf = 5663003, Lf = 5663004, Bf = 5663005, Cf = 5663006, Mf = 5663007, Uf = 5663008, Df = 5663009, Ff = 5663010, kf = 5663011, Pf = 5663012, $f = 5663013, Gf = 5663014, Vf = 5663015, Kf = 5663016, zf = 5663017, Hf = 5663018, qf = 5663019, Xf = 5663020, Yf = 5663021, Zf = 5663022, jf = 705e4, Wf = 7050001, Jf = 7050002, Qf = 7050003, th = 7050004, eh = 7050005, rh = 7050006, nh = 7050007, ih = 7050008, oh = 7050009, sh = 7050010, ah = 7050011, uh = 7050012, ch = 7050013, fh = 7050014, hh = 7050015, lh = 7050016, dh = 7050017, _h = 7050018, ph = 7050019, gh = 7050020, Rh = 7050021, Eh = 7050022, mh = 7050023, yh = 7050024, Ah = 7050025, wh = 7050026, Sh = 7050027, Oh = 7050028, vh = 7050029, Nh = 7050030, Ih = 7050031, bh = 7050032, xh = 7050033, Th = 7050034, Lh = 7050035, Bh = 7050036, Ch = 7618e3, Mh = 7618001, Uh = 7618002, Dh = 7618003, Fh = 7618004, kh = 7618005, Ph = 7618006, $h = 7618007, Gh = 7618008, Vh = 7618009, Fo = 8078e3, ko = 8078001, Kh = 8078002, zh = 8078003, Po = 8078004, $o = 8078005, Go = 8078006, Hh = 8078007, qh = 8078008, Xh = 8078009, Yh = 8078010, Vo = 8078011, Zh = 8078012, jh = 8078013, Wh = 8078014, Jh = 8078015, Qh = 8078016, t0 = 8078017, e0 = 8078018, r0 = 8078019, n0 = 8078020, i0 = 8078021, o0 = 8078022, s0 = 8078023, a0 = 81e5, u0 = 8100001, c0 = 8100002, f0 = 8100003, h0 = 819e4, l0 = 8190001, d0 = 8190002, _0 = 8190003, p0 = 8190004, g0 = 99e5, R0 = 9900001, E0 = 9900002, m0 = 9900003, y0 = 9900004, A0 = 9900005, w0 = 9900006;
function Ko(t) {
  return Array.isArray(t) ? "%5B" + t.map(Ko).join(
    "%2C%20"
    /* ", " */
  ) + /* "]" */
  "%5D" : typeof t == "bigint" ? `${t}n` : encodeURIComponent(
    String(
      t != null && Object.getPrototypeOf(t) === null ? (
        // Plain objects with no prototype don't have a `toString` method.
        // Convert them before stringifying them.
        { ...t }
      ) : t
    )
  );
}
function S0([t, e]) {
  return `${t}=${Ko(e)}`;
}
function O0(t) {
  const e = Object.entries(t).map(S0).join("&");
  return btoa(e);
}
var v0 = {
  [Iu]: "Account not found at address: $address",
  [Lu]: "Not all accounts were decoded. Encoded accounts found at addresses: $addresses.",
  [Tu]: "Expected decoded account at address: $address",
  [xu]: "Failed to decode account data at address: $address",
  [bu]: "Accounts not found at addresses: $addresses",
  [Ou]: "Unable to find a viable program address bump seed.",
  [Ru]: "$putativeAddress is not a base58-encoded address.",
  [pu]: "Expected base58 encoded address to decode to a byte array of length 32. Actual length: $actualLength.",
  [Eu]: "The `CryptoKey` must be an `Ed25519` public key.",
  [Nu]: "$putativeOffCurveAddress is not a base58-encoded off-curve address.",
  [Su]: "Invalid seeds; point must fall off the Ed25519 curve.",
  [mu]: "Expected given program derived address to have the following format: [Address, ProgramDerivedAddressBump].",
  [Au]: "A maximum of $maxSeeds seeds, including the bump seed, may be supplied when creating an address. Received: $actual.",
  [wu]: "The seed at index $index with length $actual exceeds the maximum length of $maxSeedLength bytes.",
  [yu]: "Expected program derived address bump to be in the range [0, 255], got: $bump.",
  [vu]: "Program address cannot end with PDA marker.",
  [gu]: "Expected base58-encoded address string of length in the range [32, 44]. Actual length: $actualLength.",
  [ka]: "Expected base58-encoded blockash string of length in the range [32, 44]. Actual length: $actualLength.",
  [Ua]: "The network has progressed past the last block for which this transaction could have been committed.",
  [Fo]: "Codec [$codecDescription] cannot decode empty byte arrays.",
  [o0]: "Enum codec cannot use lexical values [$stringValues] as discriminators. Either remove all lexical values or set `useValuesAsDiscriminators` to `false`.",
  [n0]: "Sentinel [$hexSentinel] must not be present in encoded bytes [$hexEncodedBytes].",
  [$o]: "Encoder and decoder must have the same fixed size, got [$encoderFixedSize] and [$decoderFixedSize].",
  [Go]: "Encoder and decoder must have the same max size, got [$encoderMaxSize] and [$decoderMaxSize].",
  [Po]: "Encoder and decoder must either both be fixed-size or variable-size.",
  [qh]: "Enum discriminator out of range. Expected a number in [$formattedValidDiscriminators], got $discriminator.",
  [Kh]: "Expected a fixed-size codec, got a variable-size one.",
  [jh]: "Codec [$codecDescription] expected a positive byte length, got $bytesLength.",
  [zh]: "Expected a variable-size codec, got a fixed-size one.",
  [r0]: "Codec [$codecDescription] expected zero-value [$hexZeroValue] to have the same size as the provided fixed-size item [$expectedSize bytes].",
  [ko]: "Codec [$codecDescription] expected $expected bytes, got $bytesLength.",
  [e0]: "Expected byte array constant [$hexConstant] to be present in data [$hexData] at offset [$offset].",
  [Xh]: "Invalid discriminated union variant. Expected one of [$variants], got $value.",
  [Yh]: "Invalid enum variant. Expected one of [$stringValues] or a number in [$formattedNumericalValues], got $variant.",
  [Jh]: "Invalid literal union variant. Expected one of [$variants], got $value.",
  [Hh]: "Expected [$codecDescription] to have $expected items, got $actual.",
  [Zh]: "Invalid value $value for base $base with alphabet $alphabet.",
  [Qh]: "Literal union discriminator out of range. Expected a number between $minRange and $maxRange, got $discriminator.",
  [Vo]: "Codec [$codecDescription] expected number to be in the range [$min, $max], got $value.",
  [Wh]: "Codec [$codecDescription] expected offset to be in the range [0, $bytesLength], got $offset.",
  [i0]: "Expected sentinel [$hexSentinel] to be present in decoded bytes [$hexDecodedBytes].",
  [t0]: "Union variant out of range. Expected an index between $minRange and $maxRange, got $variant.",
  [s0]: "This decoder expected a byte array of exactly $expectedLength bytes, but $numExcessBytes unexpected excess bytes remained after decoding. Are you sure that you have chosen the correct decoder for this data?",
  [$u]: "No random values implementation could be found.",
  [ic]: "instruction requires an uninitialized account",
  [Ec]: "instruction tries to borrow reference for an account which is already borrowed",
  [mc]: "instruction left account with an outstanding borrowed reference",
  [gc]: "program other than the account's owner changed the size of the account data",
  [tc]: "account data too small for instruction",
  [Rc]: "instruction expected an executable account",
  [Gc]: "An account does not have enough lamports to be rent-exempt",
  [Kc]: "Program arithmetic overflowed",
  [$c]: "Failed to serialize or deserialize account data: $encodedData",
  [Zc]: "Builtin programs must consume compute units",
  [Ic]: "Cross-program invocation call depth too deep",
  [Cc]: "Computational budget exceeded",
  [Ac]: "custom program error: #$code",
  [lc]: "instruction contains duplicate accounts",
  [yc]: "instruction modifications of multiply-passed account differ",
  [vc]: "executable accounts must be rent exempt",
  [Sc]: "instruction changed executable accounts data",
  [Oc]: "instruction changed the balance of an executable account",
  [dc]: "instruction changed executable bit of an account",
  [cc]: "instruction modified data of an account it does not own",
  [uc]: "instruction spent from the balance of an account it does not own",
  [ju]: "generic instruction error",
  [Hc]: "Provided owner is not allowed",
  [kc]: "Account is immutable",
  [Pc]: "Incorrect authority provided",
  [rc]: "incorrect program id for instruction",
  [ec]: "insufficient funds for instruction",
  [Qu]: "invalid account data for instruction",
  [Vc]: "Invalid account owner",
  [Wu]: "invalid program argument",
  [wc]: "program returned invalid error code",
  [Ju]: "invalid instruction data",
  [Bc]: "Failed to reallocate account data",
  [Lc]: "Provided seeds do not result in a valid address",
  [qc]: "Accounts data allocations exceeded the maximum allowed per transaction",
  [Xc]: "Max accounts exceeded",
  [Yc]: "Max instruction trace length exceeded",
  [Tc]: "Length of the seed is too long for address generation",
  [bc]: "An account required by the instruction is missing",
  [nc]: "missing required signature for instruction",
  [ac]: "instruction illegally modified the program id of an account",
  [pc]: "insufficient account keys for instruction",
  [Mc]: "Cross-program invocation with unauthorized signer or writable account",
  [Uc]: "Failed to create program execution environment",
  [Fc]: "Program failed to compile",
  [Dc]: "Program failed to complete",
  [hc]: "instruction modified data of a read-only account",
  [fc]: "instruction changed the balance of a read-only account",
  [xc]: "Cross-program invocation reentrancy not allowed for this instruction",
  [_c]: "instruction modified rent epoch of an account",
  [sc]: "sum of account balances before and after instruction do not match",
  [oc]: "instruction requires an initialized account",
  [Zu]: "",
  [Nc]: "Unsupported program id",
  [zc]: "Unsupported sysvar",
  [A0]: "Invalid instruction plan kind: $kind.",
  [Uh]: "The provided instruction plan is empty.",
  [kh]: "No failed transaction plan result was found in the provided transaction plan result.",
  [Fh]: "This transaction plan executor does not support non-divisible sequential plans. To support them, you may create your own executor such that multi-transaction atomicity is preserved — e.g. by targetting RPCs that support transaction bundles.",
  [Dh]: "The provided transaction plan failed to execute. See the `transactionPlanResult` attribute for more details. Note that the `cause` property is deprecated, and a future version will not set it.",
  [Ch]: "The provided message has insufficient capacity to accommodate the next instruction(s) in this plan. Expected at least $numBytesRequired free byte(s), got $numFreeBytes byte(s).",
  [w0]: "Invalid transaction plan kind: $kind.",
  [Mh]: "No more instructions to pack; the message packer has completed the instruction plan.",
  [Ph]: "Unexpected instruction plan. Expected $expectedKind plan, got $actualKind plan.",
  [$h]: "Unexpected transaction plan. Expected $expectedKind plan, got $actualKind plan.",
  [Gh]: "Unexpected transaction plan result. Expected $expectedKind plan, got $actualKind plan.",
  [Vh]: "Expected a successful transaction plan result. I.e. there is at least one failed or cancelled transaction in the plan.",
  [qu]: "The instruction does not have any accounts.",
  [Xu]: "The instruction does not have any data.",
  [Yu]: "Expected instruction to have progress address $expectedProgramAddress, got $actualProgramAddress.",
  [Pa]: "Expected base58 encoded blockhash to decode to a byte array of length 32. Actual length: $actualLength.",
  [Da]: "The nonce `$expectedNonceValue` is no longer valid. It has advanced to `$actualNonceValue`",
  [E0]: "Invariant violation: Found no abortable iterable cache entry for key `$cacheKey`. It should be impossible to hit this error; please file an issue at https://sola.na/web3invariant",
  [y0]: "Invariant violation: This data publisher does not publish to the channel named `$channelName`. Supported channels include $supportedChannelNames.",
  [R0]: "Invariant violation: WebSocket message iterator state is corrupt; iterated without first resolving existing message promise. It should be impossible to hit this error; please file an issue at https://sola.na/web3invariant",
  [g0]: "Invariant violation: WebSocket message iterator is missing state storage. It should be impossible to hit this error; please file an issue at https://sola.na/web3invariant",
  [m0]: "Invariant violation: Switch statement non-exhaustive. Received unexpected value `$unexpectedValue`. It should be impossible to hit this error; please file an issue at https://sola.na/web3invariant",
  [qa]: "JSON-RPC error: Internal JSON-RPC error ($__serverMessage)",
  [Xa]: "JSON-RPC error: Invalid method parameter(s) ($__serverMessage)",
  [Za]: "JSON-RPC error: The JSON sent is not a valid `Request` object ($__serverMessage)",
  [Ya]: "JSON-RPC error: The method does not exist / is not available ($__serverMessage)",
  [Ha]: "JSON-RPC error: An error occurred on the server while parsing the JSON text ($__serverMessage)",
  [nu]: "$__serverMessage",
  [_u]: "$__serverMessage",
  [hu]: "$__serverMessage",
  [eu]: "$__serverMessage",
  [Ja]: "Epoch rewards period still active at slot $slot",
  [ou]: "$__serverMessage",
  [su]: "$__serverMessage",
  [ja]: "Failed to query long-term storage; please try again",
  [Qa]: "Minimum context slot has not been reached",
  [fu]: "Node is unhealthy; behind by $numSlotsBehind slots",
  [au]: "No snapshot",
  [du]: "Transaction simulation failed",
  [Wa]: "Rewards cannot be found because slot $slot is not the epoch boundary. This may be due to gap in the queried node's local ledger or long-term storage",
  [uu]: "$__serverMessage",
  [iu]: "Transaction history is not available from this node",
  [cu]: "$__serverMessage",
  [ru]: "Transaction signature length mismatch",
  [lu]: "Transaction signature verification failure",
  [tu]: "$__serverMessage",
  [Gu]: "Key pair bytes must be of length 64, got $byteLength.",
  [Vu]: "Expected private key bytes with length 32. Actual length: $actualLength.",
  [Ku]: "Expected base58-encoded signature to decode to a byte array of length 64. Actual length: $actualLength.",
  [Hu]: "The provided private key does not match the provided public key.",
  [zu]: "Expected base58-encoded signature string of length in the range [64, 88]. Actual length: $actualLength.",
  [$a]: "Lamports value must be in the range [0, 2e64-1]",
  [Ga]: "`$value` cannot be parsed as a `BigInt`",
  [za]: "$message",
  [Va]: "`$value` cannot be parsed as a `Number`",
  [Fa]: "No nonce account could be found at address `$nonceAccountAddress`",
  [lf]: "Expected base58 encoded application domain to decode to a byte array of length 32. Actual length: $actualLength.",
  [wf]: "Attempted to sign an offchain message with an address that is not a signer for it",
  [hf]: "Expected base58-encoded application domain string of length in the range [32, 44]. Actual length: $actualLength.",
  [Af]: "The signer addresses in this offchain message envelope do not match the list of required signers in the message preamble. These unexpected signers were present in the envelope: `[$unexpectedSigners]`. These required signers were missing from the envelope `[$missingSigners]`.",
  [cf]: "The message body provided has a byte-length of $actualBytes. The maximum allowable byte-length is $maxBytes",
  [gf]: "Expected message format $expectedMessageFormat, got $actualMessageFormat",
  [Rf]: "The message length specified in the message preamble is $specifiedLength bytes. The actual length of the message is $actualLength bytes.",
  [Ef]: "Offchain message content must be non-empty",
  [_f]: "Offchain message must specify the address of at least one required signer",
  [mf]: "Offchain message envelope must reserve space for at least one signature",
  [df]: "The offchain message preamble specifies $numRequiredSignatures required signature(s), got $signaturesLength.",
  [Of]: "The signatories of this offchain message must be listed in lexicographical order",
  [vf]: "An address must be listed no more than once among the signatories of an offchain message",
  [yf]: "Offchain message is missing signatures for addresses: $addresses.",
  [Nf]: "Offchain message signature verification failed. Signature mismatch for required signatories [$signatoriesWithInvalidSignatures]. Missing signatures for signatories [$signatoriesWithMissingSignatures]",
  [ff]: "The message body provided contains characters whose codes fall outside the allowed range. In order to ensure clear-signing compatiblity with hardware wallets, the message may only contain line feeds and characters in the range [\\x20-\\x7e].",
  [Sf]: "Expected offchain message version $expectedVersion. Got $actualVersion.",
  [pf]: "This version of Kit does not support decoding offchain messages with version $unsupportedVersion. The current max supported version is 0.",
  [h0]: "The notification name must end in 'Notifications' and the API must supply a subscription plan creator function for the notification '$notificationName'.",
  [d0]: "WebSocket was closed before payload could be added to the send buffer",
  [_0]: "WebSocket connection closed",
  [p0]: "WebSocket failed to connect",
  [l0]: "Failed to obtain a subscription id from the server",
  [f0]: "Could not find an API plan for RPC method: `$method`",
  [a0]: "The $argumentLabel argument to the `$methodName` RPC method$optionalPathLabel was `$value`. This number is unsafe for use with the Solana JSON-RPC because it exceeds `Number.MAX_SAFE_INTEGER`.",
  [c0]: "HTTP error ($statusCode): $message",
  [u0]: "HTTP header(s) forbidden: $headers. Learn more at https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name.",
  [jc]: "Multiple distinct signers were identified for address `$address`. Please ensure that you are using the same signer instance for each address.",
  [Wc]: "The provided value does not implement the `KeyPairSigner` interface",
  [Qc]: "The provided value does not implement the `MessageModifyingSigner` interface",
  [tf]: "The provided value does not implement the `MessagePartialSigner` interface",
  [Jc]: "The provided value does not implement any of the `MessageSigner` interfaces",
  [rf]: "The provided value does not implement the `TransactionModifyingSigner` interface",
  [nf]: "The provided value does not implement the `TransactionPartialSigner` interface",
  [of]: "The provided value does not implement the `TransactionSendingSigner` interface",
  [ef]: "The provided value does not implement any of the `TransactionSigner` interfaces",
  [sf]: "More than one `TransactionSendingSigner` was identified.",
  [af]: "No `TransactionSendingSigner` was identified. Please provide a valid `TransactionWithSingleSendingSigner` transaction.",
  [uf]: "Wallet account signers do not support signing multiple messages/transactions in a single operation",
  [Pu]: "Cannot export a non-extractable key.",
  [Cu]: "No digest implementation could be found.",
  [Bu]: "Cryptographic operations are only allowed in secure browser contexts. Read more here: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts.",
  [Mu]: `This runtime does not support the generation of Ed25519 key pairs.

Install @solana/webcrypto-ed25519-polyfill and call its \`install\` function before generating keys in environments that do not support Ed25519.

For a list of runtimes that currently support Ed25519 operations, visit https://github.com/WICG/webcrypto-secure-curves/issues/20.`,
  [Uu]: "No signature verification implementation could be found.",
  [Du]: "No key generation implementation could be found.",
  [Fu]: "No signing implementation could be found.",
  [ku]: "No key export implementation could be found.",
  [Ka]: "Timestamp value must be in the range [-(2n ** 63n), (2n ** 63n) - 1]. `$value` given",
  [lh]: "Transaction processing left an account with an outstanding borrowed reference",
  [Wf]: "Account in use",
  [Jf]: "Account loaded twice",
  [Qf]: "Attempt to debit an account but found no record of a prior credit.",
  [mh]: "Transaction loads an address table account that doesn't exist",
  [nh]: "This transaction has already been processed",
  [ih]: "Blockhash not found",
  [oh]: "Loader call chain is too deep",
  [hh]: "Transactions are currently disabled due to cluster maintenance",
  [Nh]: "Transaction contains a duplicate instruction ($index) that is not allowed",
  [eh]: "Insufficient funds for fee",
  [Ih]: "Transaction results in an account ($accountIndex) with insufficient funds for rent",
  [rh]: "This account may not be used to pay transaction fees",
  [ah]: "Transaction contains an invalid account reference",
  [Ah]: "Transaction loads an address table account with invalid data",
  [wh]: "Transaction address table lookup uses an invalid index",
  [yh]: "Transaction loads an address table account with an invalid owner",
  [xh]: "LoadedAccountsDataSizeLimit set for transaction must be greater than 0.",
  [ch]: "This program may not be used for executing instructions",
  [Sh]: "Transaction leaves an account with a lower balance than rent-exempt minimum",
  [ph]: "Transaction loads a writable account that cannot be written",
  [bh]: "Transaction exceeded max loaded accounts data size cap",
  [sh]: "Transaction requires a fee but has no signature present",
  [th]: "Attempt to load a program that does not exist",
  [Lh]: "Execution of the program referenced by account at index $accountIndex is temporarily restricted.",
  [Th]: "ResanitizationNeeded",
  [fh]: "Transaction failed to sanitize accounts offsets correctly",
  [uh]: "Transaction did not pass signature verification",
  [Eh]: "Transaction locked too many accounts",
  [Bh]: "Sum of account balances before and after transaction do not match",
  [jf]: "The transaction failed with the error `$errorName`",
  [_h]: "Transaction version is unsupported",
  [Rh]: "Transaction would exceed account data limit within the block",
  [vh]: "Transaction would exceed total account data limit",
  [gh]: "Transaction would exceed max account limit within the block",
  [dh]: "Transaction would exceed max Block Cost Limit",
  [Oh]: "Transaction would exceed max Vote Cost Limit",
  [Vf]: "Attempted to sign a transaction with an address that is not a signer for it",
  [Ff]: "Transaction is missing an address at index: $index.",
  [Kf]: "Transaction has no expected signers therefore it cannot be encoded",
  [Xf]: "Transaction size $transactionSize exceeds limit of $transactionSizeLimit bytes",
  [xf]: "Transaction does not have a blockhash lifetime",
  [Tf]: "Transaction is not a durable nonce transaction",
  [Bf]: "Contents of these address lookup tables unknown: $lookupTableAddresses",
  [Cf]: "Lookup of address at index $highestRequestedIndex failed for lookup table `$lookupTableAddress`. Highest known index is $highestKnownIndex. The lookup table may have been extended since its contents were retrieved",
  [Uf]: "No fee payer set in CompiledTransaction",
  [Mf]: "Could not find program address at index $index",
  [Hf]: "Failed to estimate the compute unit consumption for this transaction message. This is likely because simulating the transaction failed. Inspect the `cause` property of this error to learn more",
  [qf]: "Transaction failed when it was simulated in order to estimate the compute unit consumption. The compute unit estimate provided is for a transaction that failed when simulated and may not be representative of the compute units this transaction would consume if successful. Inspect the `cause` property of this error to learn more",
  [kf]: "Transaction is missing a fee payer.",
  [Pf]: "Could not determine this transaction's signature. Make sure that the transaction has been signed by its fee payer.",
  [Gf]: "Transaction first instruction is not advance nonce account instruction.",
  [$f]: "Transaction with no instructions cannot be durable nonce transaction.",
  [If]: "This transaction includes an address (`$programAddress`) which is both invoked and set as the fee payer. Program addresses may not pay fees",
  [bf]: "This transaction includes an address (`$programAddress`) which is both invoked and marked writable. Program addresses may not be writable",
  [zf]: "The transaction message expected the transaction to have $numRequiredSignatures signatures, got $signaturesLength.",
  [Df]: "Transaction is missing signatures for addresses: $addresses.",
  [Lf]: "Transaction version must be in the range [0, 127]. `$actualVersion` given",
  [Yf]: "This version of Kit does not support decoding transactions with version $unsupportedVersion. The current max supported version is 0.",
  [Zf]: "The transaction has a durable nonce lifetime (with nonce `$nonce`), but the nonce account address is in a lookup table. The lifetime constraint cannot be constructed without fetching the lookup tables for the transaction."
}, Ie = "i", ye = "t";
function N0(t, e = {}) {
  const r = v0[t];
  if (r.length === 0)
    return "";
  let n;
  function a(l) {
    if (n[ye] === 2) {
      const d = r.slice(n[Ie] + 1, l);
      o.push(
        d in e ? (
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `${e[d]}`
        ) : `$${d}`
      );
    } else n[ye] === 1 && o.push(r.slice(n[Ie], l));
  }
  const o = [];
  return r.split("").forEach((l, d) => {
    if (d === 0) {
      n = {
        [Ie]: 0,
        [ye]: r[0] === "\\" ? 0 : r[0] === "$" ? 2 : 1
        /* Text */
      };
      return;
    }
    let _;
    switch (n[ye]) {
      case 0:
        _ = {
          [Ie]: d,
          [ye]: 1
          /* Text */
        };
        break;
      case 1:
        l === "\\" ? _ = {
          [Ie]: d,
          [ye]: 0
          /* EscapeSequence */
        } : l === "$" && (_ = {
          [Ie]: d,
          [ye]: 2
          /* Variable */
        });
        break;
      case 2:
        l === "\\" ? _ = {
          [Ie]: d,
          [ye]: 0
          /* EscapeSequence */
        } : l === "$" ? _ = {
          [Ie]: d,
          [ye]: 2
          /* Variable */
        } : l.match(/\w/) || (_ = {
          [Ie]: d,
          [ye]: 1
          /* Text */
        });
        break;
    }
    _ && (n !== _ && a(d), n = _);
  }), a(), o.join("");
}
function I0(t, e = {}) {
  if (process.env.NODE_ENV !== "production")
    return N0(t, e);
  {
    let r = `Solana error #${t}; Decode this error by running \`npx @solana/errors decode -- ${t}`;
    return Object.keys(e).length && (r += ` '${O0(e)}'`), `${r}\``;
  }
}
var tr = class extends Error {
  constructor(...[e, r]) {
    let n, a;
    r && Object.entries(Object.getOwnPropertyDescriptors(r)).forEach(([l, d]) => {
      l === "cause" ? a = { cause: d.value } : (n === void 0 && (n = {
        __code: e
      }), Object.defineProperty(n, l, d));
    });
    const o = I0(e, n);
    super(o, a);
    /**
     * Indicates the root cause of this {@link SolanaError}, if any.
     *
     * For example, a transaction error might have an instruction error as its root cause. In this
     * case, you will be able to access the instruction error on the transaction error as `cause`.
     */
    An(this, "cause", this.cause);
    /**
     * Contains context that can assist in understanding or recovering from a {@link SolanaError}.
     */
    An(this, "context");
    this.context = Object.freeze(
      n === void 0 ? {
        __code: e
      } : n
    ), this.name = "SolanaError";
  }
};
function b0(t, e) {
  return "fixedSize" in e ? e.fixedSize : e.getSizeFromValue(t);
}
function x0(t) {
  return Object.freeze({
    ...t,
    encode: (e) => {
      const r = new Uint8Array(b0(e, t));
      return t.write(e, r, 0), r;
    }
  });
}
function T0(t) {
  return Object.freeze({
    ...t,
    decode: (e, r = 0) => t.read(e, r)[0]
  });
}
function je(t) {
  return "fixedSize" in t && typeof t.fixedSize == "number";
}
function L0(t, e) {
  if (je(t) !== je(e))
    throw new tr(Po);
  if (je(t) && je(e) && t.fixedSize !== e.fixedSize)
    throw new tr($o, {
      decoderFixedSize: e.fixedSize,
      encoderFixedSize: t.fixedSize
    });
  if (!je(t) && !je(e) && t.maxSize !== e.maxSize)
    throw new tr(Go, {
      decoderMaxSize: e.maxSize,
      encoderMaxSize: t.maxSize
    });
  return {
    ...e,
    ...t,
    decode: e.decode,
    encode: t.encode,
    read: e.read,
    write: t.write
  };
}
function B0(t, e, r = 0) {
  if (e.length - r <= 0)
    throw new tr(Fo, {
      codecDescription: t
    });
}
function C0(t, e, r, n = 0) {
  const a = r.length - n;
  if (a < e)
    throw new tr(ko, {
      bytesLength: a,
      codecDescription: t,
      expected: e
    });
}
function M0(t, e, r) {
  const n = t.byteOffset + (e ?? 0), a = r ?? t.byteLength;
  let o;
  return typeof SharedArrayBuffer > "u" ? o = t.buffer : t.buffer instanceof SharedArrayBuffer ? (o = new ArrayBuffer(t.length), new Uint8Array(o).set(new Uint8Array(t))) : o = t.buffer, (n === 0 || n === -t.byteLength) && a === t.byteLength ? o : o.slice(n, n + a);
}
function U0(t, e, r, n) {
  if (n < e || n > r)
    throw new tr(Vo, {
      codecDescription: t,
      max: r,
      min: e,
      value: n
    });
}
function zo(t) {
  return t?.endian !== 1;
}
function D0(t) {
  return x0({
    fixedSize: t.size,
    write(e, r, n) {
      t.range && U0(t.name, t.range[0], t.range[1], e);
      const a = new ArrayBuffer(t.size);
      return t.set(new DataView(a), e, zo(t.config)), r.set(new Uint8Array(a), n), n + t.size;
    }
  });
}
function F0(t) {
  return T0({
    fixedSize: t.size,
    read(e, r = 0) {
      B0(t.name, e, r), C0(t.name, t.size, e, r);
      const n = new DataView(M0(e, r, t.size));
      return [t.get(n, zo(t.config)), r + t.size];
    }
  });
}
var k0 = (t = {}) => D0({
  config: t,
  name: "u64",
  range: [0n, BigInt("0xffffffffffffffff")],
  set: (e, r, n) => e.setBigUint64(0, BigInt(r), n),
  size: 8
}), P0 = (t = {}) => F0({
  config: t,
  get: (e, r) => e.getBigUint64(0, r),
  name: "u64",
  size: 8
}), $0 = (t = {}) => L0(k0(t), P0(t));
class G0 extends TypeError {
  constructor(e, r) {
    let n;
    const { message: a, explanation: o, ...l } = e, { path: d } = e, _ = d.length === 0 ? a : `At path: ${d.join(".")} -- ${a}`;
    super(o ?? _), o != null && (this.cause = _), Object.assign(this, l), this.name = this.constructor.name, this.failures = () => n ?? (n = [e, ...r()]);
  }
}
function V0(t) {
  return gr(t) && typeof t[Symbol.iterator] == "function";
}
function gr(t) {
  return typeof t == "object" && t != null;
}
function Gr(t) {
  return gr(t) && !Array.isArray(t);
}
function Re(t) {
  return typeof t == "symbol" ? t.toString() : typeof t == "string" ? JSON.stringify(t) : `${t}`;
}
function K0(t) {
  const { done: e, value: r } = t.next();
  return e ? void 0 : r;
}
function z0(t, e, r, n) {
  if (t === !0)
    return;
  t === !1 ? t = {} : typeof t == "string" && (t = { message: t });
  const { path: a, branch: o } = e, { type: l } = r, { refinement: d, message: _ = `Expected a value of type \`${l}\`${d ? ` with refinement \`${d}\`` : ""}, but received: \`${Re(n)}\`` } = t;
  return {
    value: n,
    type: l,
    refinement: d,
    key: a[a.length - 1],
    path: a,
    branch: o,
    ...t,
    message: _
  };
}
function* Hi(t, e, r, n) {
  V0(t) || (t = [t]);
  for (const a of t) {
    const o = z0(a, e, r, n);
    o && (yield o);
  }
}
function* oi(t, e, r = {}) {
  const { path: n = [], branch: a = [t], coerce: o = !1, mask: l = !1 } = r, d = { path: n, branch: a, mask: l };
  o && (t = e.coercer(t, d));
  let _ = "valid";
  for (const N of e.validator(t, d))
    N.explanation = r.message, _ = "not_valid", yield [N, void 0];
  for (let [N, L, x] of e.entries(t, d)) {
    const I = oi(L, x, {
      path: N === void 0 ? n : [...n, N],
      branch: N === void 0 ? a : [...a, L],
      coerce: o,
      mask: l,
      message: r.message
    });
    for (const O of I)
      O[0] ? (_ = O[0].refinement != null ? "not_refined" : "not_valid", yield [O[0], void 0]) : o && (L = O[1], N === void 0 ? t = L : t instanceof Map ? t.set(N, L) : t instanceof Set ? t.add(L) : gr(t) && (L !== void 0 || N in t) && (t[N] = L));
  }
  if (_ !== "not_valid")
    for (const N of e.refiner(t, d))
      N.explanation = r.message, _ = "not_refined", yield [N, void 0];
  _ === "valid" && (yield [void 0, t]);
}
let Oe = class {
  constructor(e) {
    const { type: r, schema: n, validator: a, refiner: o, coercer: l = (_) => _, entries: d = function* () {
    } } = e;
    this.type = r, this.schema = n, this.entries = d, this.coercer = l, a ? this.validator = (_, N) => {
      const L = a(_, N);
      return Hi(L, N, this, _);
    } : this.validator = () => [], o ? this.refiner = (_, N) => {
      const L = o(_, N);
      return Hi(L, N, this, _);
    } : this.refiner = () => [];
  }
  /**
   * Assert that a value passes the struct's validation, throwing if it doesn't.
   */
  assert(e, r) {
    return H0(e, this, r);
  }
  /**
   * Create a value with the struct's coercion logic, then validate it.
   */
  create(e, r) {
    return fr(e, this, r);
  }
  /**
   * Check if a value passes the struct's validation.
   */
  is(e) {
    return Ho(e, this);
  }
  /**
   * Mask a value, coercing and validating it, but returning only the subset of
   * properties defined by the struct's schema. Masking applies recursively to
   * props of `object` structs only.
   */
  mask(e, r) {
    return q0(e, this, r);
  }
  /**
   * Validate a value with the struct's validation logic, returning a tuple
   * representing the result.
   *
   * You may optionally pass `true` for the `coerce` argument to coerce
   * the value before attempting to validate it. If you do, the result will
   * contain the coerced result when successful. Also, `mask` will turn on
   * masking of the unknown `object` props recursively if passed.
   */
  validate(e, r = {}) {
    return Rr(e, this, r);
  }
};
function H0(t, e, r) {
  const n = Rr(t, e, { message: r });
  if (n[0])
    throw n[0];
}
function fr(t, e, r) {
  const n = Rr(t, e, { coerce: !0, message: r });
  if (n[0])
    throw n[0];
  return n[1];
}
function q0(t, e, r) {
  const n = Rr(t, e, { coerce: !0, mask: !0, message: r });
  if (n[0])
    throw n[0];
  return n[1];
}
function Ho(t, e) {
  return !Rr(t, e)[0];
}
function Rr(t, e, r = {}) {
  const n = oi(t, e, r), a = K0(n);
  return a[0] ? [new G0(a[0], function* () {
    for (const l of n)
      l[0] && (yield l[0]);
  }), void 0] : [void 0, a[1]];
}
function ze(t, e) {
  return new Oe({ type: t, schema: null, validator: e });
}
function X0() {
  return ze("any", () => !0);
}
function rt(t) {
  return new Oe({
    type: "array",
    schema: t,
    *entries(e) {
      if (t && Array.isArray(e))
        for (const [r, n] of e.entries())
          yield [r, n, t];
    },
    coercer(e) {
      return Array.isArray(e) ? e.slice() : e;
    },
    validator(e) {
      return Array.isArray(e) || `Expected an array value, but received: ${Re(e)}`;
    }
  });
}
function Se() {
  return ze("boolean", (t) => typeof t == "boolean");
}
function si(t) {
  return ze("instance", (e) => e instanceof t || `Expected a \`${t.name}\` instance, but received: ${Re(e)}`);
}
function Ot(t) {
  const e = Re(t), r = typeof t;
  return new Oe({
    type: "literal",
    schema: r === "string" || r === "number" || r === "boolean" ? t : null,
    validator(n) {
      return n === t || `Expected the literal \`${e}\`, but received: ${Re(n)}`;
    }
  });
}
function Y0() {
  return ze("never", () => !1);
}
function tt(t) {
  return new Oe({
    ...t,
    validator: (e, r) => e === null || t.validator(e, r),
    refiner: (e, r) => e === null || t.refiner(e, r)
  });
}
function V() {
  return ze("number", (t) => typeof t == "number" && !isNaN(t) || `Expected a number, but received: ${Re(t)}`);
}
function ot(t) {
  return new Oe({
    ...t,
    validator: (e, r) => e === void 0 || t.validator(e, r),
    refiner: (e, r) => e === void 0 || t.refiner(e, r)
  });
}
function qo(t, e) {
  return new Oe({
    type: "record",
    schema: null,
    *entries(r) {
      if (gr(r))
        for (const n in r) {
          const a = r[n];
          yield [n, n, t], yield [n, a, e];
        }
    },
    validator(r) {
      return Gr(r) || `Expected an object, but received: ${Re(r)}`;
    },
    coercer(r) {
      return Gr(r) ? { ...r } : r;
    }
  });
}
function W() {
  return ze("string", (t) => typeof t == "string" || `Expected a string, but received: ${Re(t)}`);
}
function ai(t) {
  const e = Y0();
  return new Oe({
    type: "tuple",
    schema: null,
    *entries(r) {
      if (Array.isArray(r)) {
        const n = Math.max(t.length, r.length);
        for (let a = 0; a < n; a++)
          yield [a, r[a], t[a] || e];
      }
    },
    validator(r) {
      return Array.isArray(r) || `Expected an array, but received: ${Re(r)}`;
    },
    coercer(r) {
      return Array.isArray(r) ? r.slice() : r;
    }
  });
}
function Z(t) {
  const e = Object.keys(t);
  return new Oe({
    type: "type",
    schema: t,
    *entries(r) {
      if (gr(r))
        for (const n of e)
          yield [n, r[n], t[n]];
    },
    validator(r) {
      return Gr(r) || `Expected an object, but received: ${Re(r)}`;
    },
    coercer(r) {
      return Gr(r) ? { ...r } : r;
    }
  });
}
function ue(t) {
  const e = t.map((r) => r.type).join(" | ");
  return new Oe({
    type: "union",
    schema: null,
    coercer(r, n) {
      for (const a of t) {
        const [o, l] = a.validate(r, {
          coerce: !0,
          mask: n.mask
        });
        if (!o)
          return l;
      }
      return r;
    },
    validator(r, n) {
      const a = [];
      for (const o of t) {
        const [...l] = oi(r, o, n), [d] = l;
        if (d[0])
          for (const [_] of l)
            _ && a.push(_);
        else
          return [];
      }
      return [
        `Expected the value to satisfy a union of \`${e}\`, but received: ${Re(r)}`,
        ...a
      ];
    }
  });
}
function sr() {
  return ze("unknown", () => !0);
}
function Er(t, e, r) {
  return new Oe({
    ...t,
    coercer: (n, a) => Ho(n, e) ? t.coercer(r(n, a), a) : t.coercer(n, a)
  });
}
var Ir, Z0 = new Uint8Array(16);
function Xo() {
  if (!Ir && (Ir = typeof crypto < "u" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto < "u" && typeof msCrypto.getRandomValues == "function" && msCrypto.getRandomValues.bind(msCrypto), !Ir))
    throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
  return Ir(Z0);
}
const j0 = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
function Yr(t) {
  return typeof t == "string" && j0.test(t);
}
var te = [];
for (var Cn = 0; Cn < 256; ++Cn)
  te.push((Cn + 256).toString(16).substr(1));
function Zr(t) {
  var e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, r = (te[t[e + 0]] + te[t[e + 1]] + te[t[e + 2]] + te[t[e + 3]] + "-" + te[t[e + 4]] + te[t[e + 5]] + "-" + te[t[e + 6]] + te[t[e + 7]] + "-" + te[t[e + 8]] + te[t[e + 9]] + "-" + te[t[e + 10]] + te[t[e + 11]] + te[t[e + 12]] + te[t[e + 13]] + te[t[e + 14]] + te[t[e + 15]]).toLowerCase();
  if (!Yr(r))
    throw TypeError("Stringified UUID is invalid");
  return r;
}
var qi, Mn, Un = 0, Dn = 0;
function W0(t, e, r) {
  var n = e && r || 0, a = e || new Array(16);
  t = t || {};
  var o = t.node || qi, l = t.clockseq !== void 0 ? t.clockseq : Mn;
  if (o == null || l == null) {
    var d = t.random || (t.rng || Xo)();
    o == null && (o = qi = [d[0] | 1, d[1], d[2], d[3], d[4], d[5]]), l == null && (l = Mn = (d[6] << 8 | d[7]) & 16383);
  }
  var _ = t.msecs !== void 0 ? t.msecs : Date.now(), N = t.nsecs !== void 0 ? t.nsecs : Dn + 1, L = _ - Un + (N - Dn) / 1e4;
  if (L < 0 && t.clockseq === void 0 && (l = l + 1 & 16383), (L < 0 || _ > Un) && t.nsecs === void 0 && (N = 0), N >= 1e4)
    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
  Un = _, Dn = N, Mn = l, _ += 122192928e5;
  var x = ((_ & 268435455) * 1e4 + N) % 4294967296;
  a[n++] = x >>> 24 & 255, a[n++] = x >>> 16 & 255, a[n++] = x >>> 8 & 255, a[n++] = x & 255;
  var I = _ / 4294967296 * 1e4 & 268435455;
  a[n++] = I >>> 8 & 255, a[n++] = I & 255, a[n++] = I >>> 24 & 15 | 16, a[n++] = I >>> 16 & 255, a[n++] = l >>> 8 | 128, a[n++] = l & 255;
  for (var O = 0; O < 6; ++O)
    a[n + O] = o[O];
  return e || Zr(a);
}
function Yo(t) {
  if (!Yr(t))
    throw TypeError("Invalid UUID");
  var e, r = new Uint8Array(16);
  return r[0] = (e = parseInt(t.slice(0, 8), 16)) >>> 24, r[1] = e >>> 16 & 255, r[2] = e >>> 8 & 255, r[3] = e & 255, r[4] = (e = parseInt(t.slice(9, 13), 16)) >>> 8, r[5] = e & 255, r[6] = (e = parseInt(t.slice(14, 18), 16)) >>> 8, r[7] = e & 255, r[8] = (e = parseInt(t.slice(19, 23), 16)) >>> 8, r[9] = e & 255, r[10] = (e = parseInt(t.slice(24, 36), 16)) / 1099511627776 & 255, r[11] = e / 4294967296 & 255, r[12] = e >>> 24 & 255, r[13] = e >>> 16 & 255, r[14] = e >>> 8 & 255, r[15] = e & 255, r;
}
function J0(t) {
  t = unescape(encodeURIComponent(t));
  for (var e = [], r = 0; r < t.length; ++r)
    e.push(t.charCodeAt(r));
  return e;
}
var Q0 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8", tl = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
function Zo(t, e, r) {
  function n(a, o, l, d) {
    if (typeof a == "string" && (a = J0(a)), typeof o == "string" && (o = Yo(o)), o.length !== 16)
      throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
    var _ = new Uint8Array(16 + a.length);
    if (_.set(o), _.set(a, o.length), _ = r(_), _[6] = _[6] & 15 | e, _[8] = _[8] & 63 | 128, l) {
      d = d || 0;
      for (var N = 0; N < 16; ++N)
        l[d + N] = _[N];
      return l;
    }
    return Zr(_);
  }
  try {
    n.name = t;
  } catch {
  }
  return n.DNS = Q0, n.URL = tl, n;
}
function el(t) {
  if (typeof t == "string") {
    var e = unescape(encodeURIComponent(t));
    t = new Uint8Array(e.length);
    for (var r = 0; r < e.length; ++r)
      t[r] = e.charCodeAt(r);
  }
  return rl(nl(il(t), t.length * 8));
}
function rl(t) {
  for (var e = [], r = t.length * 32, n = "0123456789abcdef", a = 0; a < r; a += 8) {
    var o = t[a >> 5] >>> a % 32 & 255, l = parseInt(n.charAt(o >>> 4 & 15) + n.charAt(o & 15), 16);
    e.push(l);
  }
  return e;
}
function jo(t) {
  return (t + 64 >>> 9 << 4) + 14 + 1;
}
function nl(t, e) {
  t[e >> 5] |= 128 << e % 32, t[jo(e) - 1] = e;
  for (var r = 1732584193, n = -271733879, a = -1732584194, o = 271733878, l = 0; l < t.length; l += 16) {
    var d = r, _ = n, N = a, L = o;
    r = ie(r, n, a, o, t[l], 7, -680876936), o = ie(o, r, n, a, t[l + 1], 12, -389564586), a = ie(a, o, r, n, t[l + 2], 17, 606105819), n = ie(n, a, o, r, t[l + 3], 22, -1044525330), r = ie(r, n, a, o, t[l + 4], 7, -176418897), o = ie(o, r, n, a, t[l + 5], 12, 1200080426), a = ie(a, o, r, n, t[l + 6], 17, -1473231341), n = ie(n, a, o, r, t[l + 7], 22, -45705983), r = ie(r, n, a, o, t[l + 8], 7, 1770035416), o = ie(o, r, n, a, t[l + 9], 12, -1958414417), a = ie(a, o, r, n, t[l + 10], 17, -42063), n = ie(n, a, o, r, t[l + 11], 22, -1990404162), r = ie(r, n, a, o, t[l + 12], 7, 1804603682), o = ie(o, r, n, a, t[l + 13], 12, -40341101), a = ie(a, o, r, n, t[l + 14], 17, -1502002290), n = ie(n, a, o, r, t[l + 15], 22, 1236535329), r = oe(r, n, a, o, t[l + 1], 5, -165796510), o = oe(o, r, n, a, t[l + 6], 9, -1069501632), a = oe(a, o, r, n, t[l + 11], 14, 643717713), n = oe(n, a, o, r, t[l], 20, -373897302), r = oe(r, n, a, o, t[l + 5], 5, -701558691), o = oe(o, r, n, a, t[l + 10], 9, 38016083), a = oe(a, o, r, n, t[l + 15], 14, -660478335), n = oe(n, a, o, r, t[l + 4], 20, -405537848), r = oe(r, n, a, o, t[l + 9], 5, 568446438), o = oe(o, r, n, a, t[l + 14], 9, -1019803690), a = oe(a, o, r, n, t[l + 3], 14, -187363961), n = oe(n, a, o, r, t[l + 8], 20, 1163531501), r = oe(r, n, a, o, t[l + 13], 5, -1444681467), o = oe(o, r, n, a, t[l + 2], 9, -51403784), a = oe(a, o, r, n, t[l + 7], 14, 1735328473), n = oe(n, a, o, r, t[l + 12], 20, -1926607734), r = se(r, n, a, o, t[l + 5], 4, -378558), o = se(o, r, n, a, t[l + 8], 11, -2022574463), a = se(a, o, r, n, t[l + 11], 16, 1839030562), n = se(n, a, o, r, t[l + 14], 23, -35309556), r = se(r, n, a, o, t[l + 1], 4, -1530992060), o = se(o, r, n, a, t[l + 4], 11, 1272893353), a = se(a, o, r, n, t[l + 7], 16, -155497632), n = se(n, a, o, r, t[l + 10], 23, -1094730640), r = se(r, n, a, o, t[l + 13], 4, 681279174), o = se(o, r, n, a, t[l], 11, -358537222), a = se(a, o, r, n, t[l + 3], 16, -722521979), n = se(n, a, o, r, t[l + 6], 23, 76029189), r = se(r, n, a, o, t[l + 9], 4, -640364487), o = se(o, r, n, a, t[l + 12], 11, -421815835), a = se(a, o, r, n, t[l + 15], 16, 530742520), n = se(n, a, o, r, t[l + 2], 23, -995338651), r = ae(r, n, a, o, t[l], 6, -198630844), o = ae(o, r, n, a, t[l + 7], 10, 1126891415), a = ae(a, o, r, n, t[l + 14], 15, -1416354905), n = ae(n, a, o, r, t[l + 5], 21, -57434055), r = ae(r, n, a, o, t[l + 12], 6, 1700485571), o = ae(o, r, n, a, t[l + 3], 10, -1894986606), a = ae(a, o, r, n, t[l + 10], 15, -1051523), n = ae(n, a, o, r, t[l + 1], 21, -2054922799), r = ae(r, n, a, o, t[l + 8], 6, 1873313359), o = ae(o, r, n, a, t[l + 15], 10, -30611744), a = ae(a, o, r, n, t[l + 6], 15, -1560198380), n = ae(n, a, o, r, t[l + 13], 21, 1309151649), r = ae(r, n, a, o, t[l + 4], 6, -145523070), o = ae(o, r, n, a, t[l + 11], 10, -1120210379), a = ae(a, o, r, n, t[l + 2], 15, 718787259), n = ae(n, a, o, r, t[l + 9], 21, -343485551), r = De(r, d), n = De(n, _), a = De(a, N), o = De(o, L);
  }
  return [r, n, a, o];
}
function il(t) {
  if (t.length === 0)
    return [];
  for (var e = t.length * 8, r = new Uint32Array(jo(e)), n = 0; n < e; n += 8)
    r[n >> 5] |= (t[n / 8] & 255) << n % 32;
  return r;
}
function De(t, e) {
  var r = (t & 65535) + (e & 65535), n = (t >> 16) + (e >> 16) + (r >> 16);
  return n << 16 | r & 65535;
}
function ol(t, e) {
  return t << e | t >>> 32 - e;
}
function jr(t, e, r, n, a, o) {
  return De(ol(De(De(e, t), De(n, o)), a), r);
}
function ie(t, e, r, n, a, o, l) {
  return jr(e & r | ~e & n, t, e, a, o, l);
}
function oe(t, e, r, n, a, o, l) {
  return jr(e & n | r & ~n, t, e, a, o, l);
}
function se(t, e, r, n, a, o, l) {
  return jr(e ^ r ^ n, t, e, a, o, l);
}
function ae(t, e, r, n, a, o, l) {
  return jr(r ^ (e | ~n), t, e, a, o, l);
}
var sl = Zo("v3", 48, el);
function al(t, e, r) {
  t = t || {};
  var n = t.random || (t.rng || Xo)();
  if (n[6] = n[6] & 15 | 64, n[8] = n[8] & 63 | 128, e) {
    r = r || 0;
    for (var a = 0; a < 16; ++a)
      e[r + a] = n[a];
    return e;
  }
  return Zr(n);
}
function ul(t, e, r, n) {
  switch (t) {
    case 0:
      return e & r ^ ~e & n;
    case 1:
      return e ^ r ^ n;
    case 2:
      return e & r ^ e & n ^ r & n;
    case 3:
      return e ^ r ^ n;
  }
}
function Fn(t, e) {
  return t << e | t >>> 32 - e;
}
function cl(t) {
  var e = [1518500249, 1859775393, 2400959708, 3395469782], r = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
  if (typeof t == "string") {
    var n = unescape(encodeURIComponent(t));
    t = [];
    for (var a = 0; a < n.length; ++a)
      t.push(n.charCodeAt(a));
  } else Array.isArray(t) || (t = Array.prototype.slice.call(t));
  t.push(128);
  for (var o = t.length / 4 + 2, l = Math.ceil(o / 16), d = new Array(l), _ = 0; _ < l; ++_) {
    for (var N = new Uint32Array(16), L = 0; L < 16; ++L)
      N[L] = t[_ * 64 + L * 4] << 24 | t[_ * 64 + L * 4 + 1] << 16 | t[_ * 64 + L * 4 + 2] << 8 | t[_ * 64 + L * 4 + 3];
    d[_] = N;
  }
  d[l - 1][14] = (t.length - 1) * 8 / Math.pow(2, 32), d[l - 1][14] = Math.floor(d[l - 1][14]), d[l - 1][15] = (t.length - 1) * 8 & 4294967295;
  for (var x = 0; x < l; ++x) {
    for (var I = new Uint32Array(80), O = 0; O < 16; ++O)
      I[O] = d[x][O];
    for (var B = 16; B < 80; ++B)
      I[B] = Fn(I[B - 3] ^ I[B - 8] ^ I[B - 14] ^ I[B - 16], 1);
    for (var k = r[0], F = r[1], H = r[2], Y = r[3], $ = r[4], Q = 0; Q < 80; ++Q) {
      var j = Math.floor(Q / 20), nt = Fn(k, 5) + ul(j, F, H, Y) + $ + e[j] + I[Q] >>> 0;
      $ = Y, Y = H, H = Fn(F, 30) >>> 0, F = k, k = nt;
    }
    r[0] = r[0] + k >>> 0, r[1] = r[1] + F >>> 0, r[2] = r[2] + H >>> 0, r[3] = r[3] + Y >>> 0, r[4] = r[4] + $ >>> 0;
  }
  return [r[0] >> 24 & 255, r[0] >> 16 & 255, r[0] >> 8 & 255, r[0] & 255, r[1] >> 24 & 255, r[1] >> 16 & 255, r[1] >> 8 & 255, r[1] & 255, r[2] >> 24 & 255, r[2] >> 16 & 255, r[2] >> 8 & 255, r[2] & 255, r[3] >> 24 & 255, r[3] >> 16 & 255, r[3] >> 8 & 255, r[3] & 255, r[4] >> 24 & 255, r[4] >> 16 & 255, r[4] >> 8 & 255, r[4] & 255];
}
var fl = Zo("v5", 80, cl);
const hl = "00000000-0000-0000-0000-000000000000";
function ll(t) {
  if (!Yr(t))
    throw TypeError("Invalid UUID");
  return parseInt(t.substr(14, 1), 16);
}
const dl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  NIL: hl,
  parse: Yo,
  stringify: Zr,
  v1: W0,
  v3: sl,
  v4: al,
  v5: fl,
  validate: Yr,
  version: ll
}, Symbol.toStringTag, { value: "Module" })), Wo = /* @__PURE__ */ jn(dl);
var kn, Xi;
function _l() {
  if (Xi) return kn;
  Xi = 1;
  const t = Wo.v4;
  return kn = function(r, n, a, o) {
    if (typeof r != "string")
      throw new TypeError(r + " must be a string");
    o = o || {};
    const l = typeof o.version == "number" ? o.version : 2;
    if (l !== 1 && l !== 2)
      throw new TypeError(l + " must be 1 or 2");
    const d = {
      method: r
    };
    if (l === 2 && (d.jsonrpc = "2.0"), n) {
      if (typeof n != "object" && !Array.isArray(n))
        throw new TypeError(n + " must be an object, array or omitted");
      d.params = n;
    }
    if (typeof a > "u") {
      const _ = typeof o.generator == "function" ? o.generator : function() {
        return t();
      };
      d.id = _(d, o);
    } else l === 2 && a === null ? o.notificationIdNull && (d.id = null) : d.id = a;
    return d;
  }, kn;
}
var Pn, Yi;
function pl() {
  if (Yi) return Pn;
  Yi = 1;
  const t = Wo.v4, e = _l(), r = function(n, a) {
    if (!(this instanceof r))
      return new r(n, a);
    a || (a = {}), this.options = {
      reviver: typeof a.reviver < "u" ? a.reviver : null,
      replacer: typeof a.replacer < "u" ? a.replacer : null,
      generator: typeof a.generator < "u" ? a.generator : function() {
        return t();
      },
      version: typeof a.version < "u" ? a.version : 2,
      notificationIdNull: typeof a.notificationIdNull == "boolean" ? a.notificationIdNull : !1
    }, this.callServer = n;
  };
  return Pn = r, r.prototype.request = function(n, a, o, l) {
    const d = this;
    let _ = null;
    const N = Array.isArray(n) && typeof a == "function";
    if (this.options.version === 1 && N)
      throw new TypeError("JSON-RPC 1.0 does not support batching");
    if (N || !N && n && typeof n == "object" && typeof a == "function")
      l = a, _ = n;
    else {
      typeof o == "function" && (l = o, o = void 0);
      const I = typeof l == "function";
      try {
        _ = e(n, a, o, {
          generator: this.options.generator,
          version: this.options.version,
          notificationIdNull: this.options.notificationIdNull
        });
      } catch (O) {
        if (I) {
          l(O);
          return;
        }
        throw O;
      }
      if (!I)
        return _;
    }
    let x;
    try {
      x = JSON.stringify(_, this.options.replacer);
    } catch (I) {
      l(I);
      return;
    }
    return this.callServer(x, function(I, O) {
      d._parseResponse(I, O, l);
    }), _;
  }, r.prototype._parseResponse = function(n, a, o) {
    if (n) {
      o(n);
      return;
    }
    if (!a) {
      o();
      return;
    }
    let l;
    try {
      l = JSON.parse(a, this.options.reviver);
    } catch (d) {
      o(d);
      return;
    }
    if (o.length === 3)
      if (Array.isArray(l)) {
        const d = function(N) {
          return typeof N.error < "u";
        }, _ = function(N) {
          return !d(N);
        };
        o(null, l.filter(d), l.filter(_));
        return;
      } else {
        o(null, l.error, l.result);
        return;
      }
    o(null, l);
  }, Pn;
}
pl();
var $n = { exports: {} }, Zi;
function gl() {
  return Zi || (Zi = 1, (function(t) {
    var e = Object.prototype.hasOwnProperty, r = "~";
    function n() {
    }
    Object.create && (n.prototype = /* @__PURE__ */ Object.create(null), new n().__proto__ || (r = !1));
    function a(_, N, L) {
      this.fn = _, this.context = N, this.once = L || !1;
    }
    function o(_, N, L, x, I) {
      if (typeof L != "function")
        throw new TypeError("The listener must be a function");
      var O = new a(L, x || _, I), B = r ? r + N : N;
      return _._events[B] ? _._events[B].fn ? _._events[B] = [_._events[B], O] : _._events[B].push(O) : (_._events[B] = O, _._eventsCount++), _;
    }
    function l(_, N) {
      --_._eventsCount === 0 ? _._events = new n() : delete _._events[N];
    }
    function d() {
      this._events = new n(), this._eventsCount = 0;
    }
    d.prototype.eventNames = function() {
      var N = [], L, x;
      if (this._eventsCount === 0) return N;
      for (x in L = this._events)
        e.call(L, x) && N.push(r ? x.slice(1) : x);
      return Object.getOwnPropertySymbols ? N.concat(Object.getOwnPropertySymbols(L)) : N;
    }, d.prototype.listeners = function(N) {
      var L = r ? r + N : N, x = this._events[L];
      if (!x) return [];
      if (x.fn) return [x.fn];
      for (var I = 0, O = x.length, B = new Array(O); I < O; I++)
        B[I] = x[I].fn;
      return B;
    }, d.prototype.listenerCount = function(N) {
      var L = r ? r + N : N, x = this._events[L];
      return x ? x.fn ? 1 : x.length : 0;
    }, d.prototype.emit = function(N, L, x, I, O, B) {
      var k = r ? r + N : N;
      if (!this._events[k]) return !1;
      var F = this._events[k], H = arguments.length, Y, $;
      if (F.fn) {
        switch (F.once && this.removeListener(N, F.fn, void 0, !0), H) {
          case 1:
            return F.fn.call(F.context), !0;
          case 2:
            return F.fn.call(F.context, L), !0;
          case 3:
            return F.fn.call(F.context, L, x), !0;
          case 4:
            return F.fn.call(F.context, L, x, I), !0;
          case 5:
            return F.fn.call(F.context, L, x, I, O), !0;
          case 6:
            return F.fn.call(F.context, L, x, I, O, B), !0;
        }
        for ($ = 1, Y = new Array(H - 1); $ < H; $++)
          Y[$ - 1] = arguments[$];
        F.fn.apply(F.context, Y);
      } else {
        var Q = F.length, j;
        for ($ = 0; $ < Q; $++)
          switch (F[$].once && this.removeListener(N, F[$].fn, void 0, !0), H) {
            case 1:
              F[$].fn.call(F[$].context);
              break;
            case 2:
              F[$].fn.call(F[$].context, L);
              break;
            case 3:
              F[$].fn.call(F[$].context, L, x);
              break;
            case 4:
              F[$].fn.call(F[$].context, L, x, I);
              break;
            default:
              if (!Y) for (j = 1, Y = new Array(H - 1); j < H; j++)
                Y[j - 1] = arguments[j];
              F[$].fn.apply(F[$].context, Y);
          }
      }
      return !0;
    }, d.prototype.on = function(N, L, x) {
      return o(this, N, L, x, !1);
    }, d.prototype.once = function(N, L, x) {
      return o(this, N, L, x, !0);
    }, d.prototype.removeListener = function(N, L, x, I) {
      var O = r ? r + N : N;
      if (!this._events[O]) return this;
      if (!L)
        return l(this, O), this;
      var B = this._events[O];
      if (B.fn)
        B.fn === L && (!I || B.once) && (!x || B.context === x) && l(this, O);
      else {
        for (var k = 0, F = [], H = B.length; k < H; k++)
          (B[k].fn !== L || I && !B[k].once || x && B[k].context !== x) && F.push(B[k]);
        F.length ? this._events[O] = F.length === 1 ? F[0] : F : l(this, O);
      }
      return this;
    }, d.prototype.removeAllListeners = function(N) {
      var L;
      return N ? (L = r ? r + N : N, this._events[L] && l(this, L)) : (this._events = new n(), this._eventsCount = 0), this;
    }, d.prototype.off = d.prototype.removeListener, d.prototype.addListener = d.prototype.on, d.prefixed = r, d.EventEmitter = d, t.exports = d;
  })($n)), $n.exports;
}
gl();
class Jo extends co {
  constructor(e, r) {
    super(), this.finished = !1, this.destroyed = !1, ao(e);
    const n = Jn(r);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const a = this.blockLen, o = new Uint8Array(a);
    o.set(n.length > a ? e.create().update(n).digest() : n);
    for (let l = 0; l < o.length; l++)
      o[l] ^= 54;
    this.iHash.update(o), this.oHash = e.create();
    for (let l = 0; l < o.length; l++)
      o[l] ^= 106;
    this.oHash.update(o), rr(o);
  }
  update(e) {
    return Cr(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    Cr(this), Ve(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: r, iHash: n, finished: a, destroyed: o, blockLen: l, outputLen: d } = this;
    return e = e, e.finished = a, e.destroyed = o, e.blockLen = l, e.outputLen = d, e.oHash = r._cloneInto(e.oHash), e.iHash = n._cloneInto(e.iHash), e;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const Qo = (t, e, r) => new Jo(t, e).update(r).digest();
Qo.create = (t, e) => new Jo(t, e);
const ji = (t, e) => (t + (t >= 0 ? e : -e) / ts) / e;
function Rl(t, e, r) {
  const [[n, a], [o, l]] = e, d = ji(l * t, r), _ = ji(-a * t, r);
  let N = t - d * n - _ * o, L = -d * a - _ * l;
  const x = N < Te, I = L < Te;
  x && (N = -N), I && (L = -L);
  const O = dr(Math.ceil(Ro(r) / 2)) + er;
  if (N < Te || N >= O || L < Te || L >= O)
    throw new Error("splitScalar (endomorphism): failed, k=" + t);
  return { k1neg: x, k1: N, k2neg: I, k2: L };
}
function qn(t) {
  if (!["compact", "recovered", "der"].includes(t))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return t;
}
function Gn(t, e) {
  const r = {};
  for (let n of Object.keys(e))
    r[n] = t[n] === void 0 ? e[n] : t[n];
  return Ge(r.lowS, "lowS"), Ge(r.prehash, "prehash"), r.format !== void 0 && qn(r.format), r;
}
class El extends Error {
  constructor(e = "") {
    super(e);
  }
}
const be = {
  // asn.1 DER encoding utils
  Err: El,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: r } = be;
      if (t < 0 || t > 256)
        throw new r("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new r("tlv.encode: unpadded data");
      const n = e.length / 2, a = vr(n);
      if (a.length / 2 & 128)
        throw new r("tlv.encode: long form length too big");
      const o = n > 127 ? vr(a.length / 2 | 128) : "";
      return vr(t) + o + a + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: r } = be;
      let n = 0;
      if (t < 0 || t > 256)
        throw new r("tlv.encode: wrong tag");
      if (e.length < 2 || e[n++] !== t)
        throw new r("tlv.decode: wrong tlv");
      const a = e[n++], o = !!(a & 128);
      let l = 0;
      if (!o)
        l = a;
      else {
        const _ = a & 127;
        if (!_)
          throw new r("tlv.decode(long): indefinite length not supported");
        if (_ > 4)
          throw new r("tlv.decode(long): byte length is too big");
        const N = e.subarray(n, n + _);
        if (N.length !== _)
          throw new r("tlv.decode: length bytes not complete");
        if (N[0] === 0)
          throw new r("tlv.decode(long): zero leftmost byte");
        for (const L of N)
          l = l << 8 | L;
        if (n += _, l < 128)
          throw new r("tlv.decode(long): not minimal encoding");
      }
      const d = e.subarray(n, n + l);
      if (d.length !== l)
        throw new r("tlv.decode: wrong value length");
      return { v: d, l: e.subarray(n + l) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(t) {
      const { Err: e } = be;
      if (t < Te)
        throw new e("integer: negative integers are not allowed");
      let r = vr(t);
      if (Number.parseInt(r[0], 16) & 8 && (r = "00" + r), r.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return r;
    },
    decode(t) {
      const { Err: e } = be;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return qr(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: r, _tlv: n } = be, a = Lt("signature", t), { v: o, l } = n.decode(48, a);
    if (l.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: d, l: _ } = n.decode(2, o), { v: N, l: L } = n.decode(2, _);
    if (L.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: r.decode(d), s: r.decode(N) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: r } = be, n = e.encode(2, r.encode(t.r)), a = e.encode(2, r.encode(t.s)), o = n + a;
    return e.encode(48, o);
  }
}, Te = BigInt(0), er = BigInt(1), ts = BigInt(2), br = BigInt(3), ml = BigInt(4);
function Je(t, e) {
  const { BYTES: r } = t;
  let n;
  if (typeof e == "bigint")
    n = e;
  else {
    let a = Lt("private key", e);
    try {
      n = t.fromBytes(a);
    } catch {
      throw new Error(`invalid private key: expected ui8a of size ${r}, got ${typeof e}`);
    }
  }
  if (!t.isValidNot0(n))
    throw new Error("invalid private key: out of range [1..N-1]");
  return n;
}
function yl(t, e = {}) {
  const r = Co("weierstrass", t, e), { Fp: n, Fn: a } = r;
  let o = r.CURVE;
  const { h: l, n: d } = o;
  _r(e, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object",
    wrapPrivateKey: "boolean"
  });
  const { endo: _ } = e;
  if (_ && (!n.is0(o.a) || typeof _.beta != "bigint" || !Array.isArray(_.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const N = rs(n, a);
  function L() {
    if (!n.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function x(z, g, i) {
    const { x: f, y: p } = g.toAffine(), y = n.toBytes(f);
    if (Ge(i, "isCompressed"), i) {
      L();
      const w = !n.isOdd(p);
      return Ae(es(w), y);
    } else
      return Ae(Uint8Array.of(4), y, n.toBytes(p));
  }
  function I(z) {
    ge(z, void 0, "Point");
    const { publicKey: g, publicKeyUncompressed: i } = N, f = z.length, p = z[0], y = z.subarray(1);
    if (f === g && (p === 2 || p === 3)) {
      const w = n.fromBytes(y);
      if (!n.isValid(w))
        throw new Error("bad point: is not on curve, wrong x");
      const v = k(w);
      let T;
      try {
        T = n.sqrt(v);
      } catch (u) {
        const E = u instanceof Error ? ": " + u.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + E);
      }
      L();
      const m = n.isOdd(T);
      return (p & 1) === 1 !== m && (T = n.neg(T)), { x: w, y: T };
    } else if (f === i && p === 4) {
      const w = n.BYTES, v = n.fromBytes(y.subarray(0, w)), T = n.fromBytes(y.subarray(w, w * 2));
      if (!F(v, T))
        throw new Error("bad point: is not on curve");
      return { x: v, y: T };
    } else
      throw new Error(`bad point: got length ${f}, expected compressed=${g} or uncompressed=${i}`);
  }
  const O = e.toBytes || x, B = e.fromBytes || I;
  function k(z) {
    const g = n.sqr(z), i = n.mul(g, z);
    return n.add(n.add(i, n.mul(z, o.a)), o.b);
  }
  function F(z, g) {
    const i = n.sqr(g), f = k(z);
    return n.eql(i, f);
  }
  if (!F(o.Gx, o.Gy))
    throw new Error("bad curve params: generator point");
  const H = n.mul(n.pow(o.a, br), ml), Y = n.mul(n.sqr(o.b), BigInt(27));
  if (n.is0(n.add(H, Y)))
    throw new Error("bad curve params: a or b");
  function $(z, g, i = !1) {
    if (!n.isValid(g) || i && n.is0(g))
      throw new Error(`bad point coordinate ${z}`);
    return g;
  }
  function Q(z) {
    if (!(z instanceof C))
      throw new Error("ProjectivePoint expected");
  }
  function j(z) {
    if (!_ || !_.basises)
      throw new Error("no endo");
    return Rl(z, _.basises, a.ORDER);
  }
  const nt = Ur((z, g) => {
    const { X: i, Y: f, Z: p } = z;
    if (n.eql(p, n.ONE))
      return { x: i, y: f };
    const y = z.is0();
    g == null && (g = y ? n.ONE : n.inv(p));
    const w = n.mul(i, g), v = n.mul(f, g), T = n.mul(p, g);
    if (y)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(T, n.ONE))
      throw new Error("invZ was invalid");
    return { x: w, y: v };
  }), at = Ur((z) => {
    if (z.is0()) {
      if (e.allowInfinityPoint && !n.is0(z.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: g, y: i } = z.toAffine();
    if (!n.isValid(g) || !n.isValid(i))
      throw new Error("bad point: x or y not field elements");
    if (!F(g, i))
      throw new Error("bad point: equation left != right");
    if (!z.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function it(z, g, i, f, p) {
    return i = new C(n.mul(i.X, z), i.Y, i.Z), g = Dr(f, g), i = Dr(p, i), g.add(i);
  }
  class C {
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(g, i, f) {
      this.X = $("x", g), this.Y = $("y", i, !0), this.Z = $("z", f), Object.freeze(this);
    }
    static CURVE() {
      return o;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(g) {
      const { x: i, y: f } = g || {};
      if (!g || !n.isValid(i) || !n.isValid(f))
        throw new Error("invalid affine point");
      if (g instanceof C)
        throw new Error("projective point not allowed");
      return n.is0(i) && n.is0(f) ? C.ZERO : new C(i, f, n.ONE);
    }
    static fromBytes(g) {
      const i = C.fromAffine(B(ge(g, void 0, "point")));
      return i.assertValidity(), i;
    }
    static fromHex(g) {
      return C.fromBytes(Lt("pointHex", g));
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     *
     * @param windowSize
     * @param isLazy true will defer table computation until the first multiplication
     * @returns
     */
    precompute(g = 8, i = !0) {
      return G.createCache(this, g), i || this.multiply(br), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      at(this);
    }
    hasEvenY() {
      const { y: g } = this.toAffine();
      if (!n.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !n.isOdd(g);
    }
    /** Compare one point to another. */
    equals(g) {
      Q(g);
      const { X: i, Y: f, Z: p } = this, { X: y, Y: w, Z: v } = g, T = n.eql(n.mul(i, v), n.mul(y, p)), m = n.eql(n.mul(f, v), n.mul(w, p));
      return T && m;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new C(this.X, n.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: g, b: i } = o, f = n.mul(i, br), { X: p, Y: y, Z: w } = this;
      let v = n.ZERO, T = n.ZERO, m = n.ZERO, s = n.mul(p, p), u = n.mul(y, y), E = n.mul(w, w), S = n.mul(p, y);
      return S = n.add(S, S), m = n.mul(p, w), m = n.add(m, m), v = n.mul(g, m), T = n.mul(f, E), T = n.add(v, T), v = n.sub(u, T), T = n.add(u, T), T = n.mul(v, T), v = n.mul(S, v), m = n.mul(f, m), E = n.mul(g, E), S = n.sub(s, E), S = n.mul(g, S), S = n.add(S, m), m = n.add(s, s), s = n.add(m, s), s = n.add(s, E), s = n.mul(s, S), T = n.add(T, s), E = n.mul(y, w), E = n.add(E, E), s = n.mul(E, S), v = n.sub(v, s), m = n.mul(E, u), m = n.add(m, m), m = n.add(m, m), new C(v, T, m);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(g) {
      Q(g);
      const { X: i, Y: f, Z: p } = this, { X: y, Y: w, Z: v } = g;
      let T = n.ZERO, m = n.ZERO, s = n.ZERO;
      const u = o.a, E = n.mul(o.b, br);
      let S = n.mul(i, y), D = n.mul(f, w), X = n.mul(p, v), J = n.add(i, f), et = n.add(y, w);
      J = n.mul(J, et), et = n.add(S, D), J = n.sub(J, et), et = n.add(i, p);
      let dt = n.add(y, v);
      return et = n.mul(et, dt), dt = n.add(S, X), et = n.sub(et, dt), dt = n.add(f, p), T = n.add(w, v), dt = n.mul(dt, T), T = n.add(D, X), dt = n.sub(dt, T), s = n.mul(u, et), T = n.mul(E, X), s = n.add(T, s), T = n.sub(D, s), s = n.add(D, s), m = n.mul(T, s), D = n.add(S, S), D = n.add(D, S), X = n.mul(u, X), et = n.mul(E, et), D = n.add(D, X), X = n.sub(S, X), X = n.mul(u, X), et = n.add(et, X), S = n.mul(D, et), m = n.add(m, S), S = n.mul(dt, et), T = n.mul(J, T), T = n.sub(T, S), S = n.mul(J, D), s = n.mul(dt, s), s = n.add(s, S), new C(T, m, s);
    }
    subtract(g) {
      return this.add(g.negate());
    }
    is0() {
      return this.equals(C.ZERO);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(g) {
      const { endo: i } = e;
      if (!a.isValidNot0(g))
        throw new Error("invalid scalar: out of range");
      let f, p;
      const y = (w) => G.cached(this, w, (v) => Pe(C, v));
      if (i) {
        const { k1neg: w, k1: v, k2neg: T, k2: m } = j(g), { p: s, f: u } = y(v), { p: E, f: S } = y(m);
        p = u.add(S), f = it(i.beta, s, E, w, T);
      } else {
        const { p: w, f: v } = y(g);
        f = w, p = v;
      }
      return Pe(C, [f, p])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(g) {
      const { endo: i } = e, f = this;
      if (!a.isValid(g))
        throw new Error("invalid scalar: out of range");
      if (g === Te || f.is0())
        return C.ZERO;
      if (g === er)
        return f;
      if (G.hasCache(this))
        return this.multiply(g);
      if (i) {
        const { k1neg: p, k1: y, k2neg: w, k2: v } = j(g), { p1: T, p2: m } = na(C, f, y, v);
        return it(i.beta, T, m, p, w);
      } else
        return G.unsafe(f, g);
    }
    multiplyAndAddUnsafe(g, i, f) {
      const p = this.multiplyUnsafe(i).add(g.multiplyUnsafe(f));
      return p.is0() ? void 0 : p;
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(g) {
      return nt(this, g);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: g } = e;
      return l === er ? !0 : g ? g(C, this) : G.unsafe(this, d).is0();
    }
    clearCofactor() {
      const { clearCofactor: g } = e;
      return l === er ? this : g ? g(C, this) : this.multiplyUnsafe(l);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(l).is0();
    }
    toBytes(g = !0) {
      return Ge(g, "isCompressed"), this.assertValidity(), O(C, this, g);
    }
    toHex(g = !0) {
      return $e(this.toBytes(g));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
    // TODO: remove
    get px() {
      return this.X;
    }
    get py() {
      return this.X;
    }
    get pz() {
      return this.Z;
    }
    toRawBytes(g = !0) {
      return this.toBytes(g);
    }
    _setWindowSize(g) {
      this.precompute(g);
    }
    static normalizeZ(g) {
      return Pe(C, g);
    }
    static msm(g, i) {
      return Bo(C, a, g, i);
    }
    static fromPrivateKey(g) {
      return C.BASE.multiply(Je(a, g));
    }
  }
  C.BASE = new C(o.Gx, o.Gy, n.ONE), C.ZERO = new C(n.ZERO, n.ONE, n.ZERO), C.Fp = n, C.Fn = a;
  const U = a.BITS, G = new Lo(C, e.endo ? Math.ceil(U / 2) : U);
  return C.BASE.precompute(8), C;
}
function es(t) {
  return Uint8Array.of(t ? 2 : 3);
}
function rs(t, e) {
  return {
    secretKey: e.BYTES,
    publicKey: 1 + t.BYTES,
    publicKeyUncompressed: 1 + 2 * t.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * e.BYTES
  };
}
function Al(t, e = {}) {
  const { Fn: r } = t, n = e.randomBytes || Qn, a = Object.assign(rs(t.Fp, r), { seed: bo(r.ORDER) });
  function o(O) {
    try {
      return !!Je(r, O);
    } catch {
      return !1;
    }
  }
  function l(O, B) {
    const { publicKey: k, publicKeyUncompressed: F } = a;
    try {
      const H = O.length;
      return B === !0 && H !== k || B === !1 && H !== F ? !1 : !!t.fromBytes(O);
    } catch {
      return !1;
    }
  }
  function d(O = n(a.seed)) {
    return ta(ge(O, a.seed, "seed"), r.ORDER);
  }
  function _(O, B = !0) {
    return t.BASE.multiply(Je(r, O)).toBytes(B);
  }
  function N(O) {
    const B = d(O);
    return { secretKey: B, publicKey: _(B) };
  }
  function L(O) {
    if (typeof O == "bigint")
      return !1;
    if (O instanceof t)
      return !0;
    const { secretKey: B, publicKey: k, publicKeyUncompressed: F } = a;
    if (r.allowedLengths || B === k)
      return;
    const H = Lt("key", O).length;
    return H === k || H === F;
  }
  function x(O, B, k = !0) {
    if (L(O) === !0)
      throw new Error("first arg must be private key");
    if (L(B) === !1)
      throw new Error("second arg must be public key");
    const F = Je(r, O);
    return t.fromHex(B).multiply(F).toBytes(k);
  }
  return Object.freeze({ getPublicKey: _, getSharedSecret: x, keygen: N, Point: t, utils: {
    isValidSecretKey: o,
    isValidPublicKey: l,
    randomSecretKey: d,
    // TODO: remove
    isValidPrivateKey: o,
    randomPrivateKey: d,
    normPrivateKeyToScalar: (O) => Je(r, O),
    precompute(O = 8, B = t.BASE) {
      return B.precompute(O, !1);
    }
  }, lengths: a });
}
function wl(t, e, r = {}) {
  ao(e), _r(r, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  });
  const n = r.randomBytes || Qn, a = r.hmac || ((i, ...f) => Qo(e, i, Ae(...f))), { Fp: o, Fn: l } = t, { ORDER: d, BITS: _ } = l, { keygen: N, getPublicKey: L, getSharedSecret: x, utils: I, lengths: O } = Al(t, r), B = {
    prehash: !1,
    lowS: typeof r.lowS == "boolean" ? r.lowS : !1,
    format: void 0,
    //'compact' as ECDSASigFormat,
    extraEntropy: !1
  }, k = "compact";
  function F(i) {
    const f = d >> er;
    return i > f;
  }
  function H(i, f) {
    if (!l.isValidNot0(f))
      throw new Error(`invalid signature ${i}: out of range 1..Point.Fn.ORDER`);
    return f;
  }
  function Y(i, f) {
    qn(f);
    const p = O.signature, y = f === "compact" ? p : f === "recovered" ? p + 1 : void 0;
    return ge(i, y, `${f} signature`);
  }
  class $ {
    constructor(f, p, y) {
      this.r = H("r", f), this.s = H("s", p), y != null && (this.recovery = y), Object.freeze(this);
    }
    static fromBytes(f, p = k) {
      Y(f, p);
      let y;
      if (p === "der") {
        const { r: m, s } = be.toSig(ge(f));
        return new $(m, s);
      }
      p === "recovered" && (y = f[0], p = "compact", f = f.subarray(1));
      const w = l.BYTES, v = f.subarray(0, w), T = f.subarray(w, w * 2);
      return new $(l.fromBytes(v), l.fromBytes(T), y);
    }
    static fromHex(f, p) {
      return this.fromBytes(Mr(f), p);
    }
    addRecoveryBit(f) {
      return new $(this.r, this.s, f);
    }
    recoverPublicKey(f) {
      const p = o.ORDER, { r: y, s: w, recovery: v } = this;
      if (v == null || ![0, 1, 2, 3].includes(v))
        throw new Error("recovery id invalid");
      if (d * ts < p && v > 1)
        throw new Error("recovery id is ambiguous for h>1 curve");
      const m = v === 2 || v === 3 ? y + d : y;
      if (!o.isValid(m))
        throw new Error("recovery id 2 or 3 invalid");
      const s = o.toBytes(m), u = t.fromBytes(Ae(es((v & 1) === 0), s)), E = l.inv(m), S = j(Lt("msgHash", f)), D = l.create(-S * E), X = l.create(w * E), J = t.BASE.multiplyUnsafe(D).add(u.multiplyUnsafe(X));
      if (J.is0())
        throw new Error("point at infinify");
      return J.assertValidity(), J;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return F(this.s);
    }
    toBytes(f = k) {
      if (qn(f), f === "der")
        return Mr(be.hexFromSig(this));
      const p = l.toBytes(this.r), y = l.toBytes(this.s);
      if (f === "recovered") {
        if (this.recovery == null)
          throw new Error("recovery bit must be present");
        return Ae(Uint8Array.of(this.recovery), p, y);
      }
      return Ae(p, y);
    }
    toHex(f) {
      return $e(this.toBytes(f));
    }
    // TODO: remove
    assertValidity() {
    }
    static fromCompact(f) {
      return $.fromBytes(Lt("sig", f), "compact");
    }
    static fromDER(f) {
      return $.fromBytes(Lt("sig", f), "der");
    }
    normalizeS() {
      return this.hasHighS() ? new $(this.r, l.neg(this.s), this.recovery) : this;
    }
    toDERRawBytes() {
      return this.toBytes("der");
    }
    toDERHex() {
      return $e(this.toBytes("der"));
    }
    toCompactRawBytes() {
      return this.toBytes("compact");
    }
    toCompactHex() {
      return $e(this.toBytes("compact"));
    }
  }
  const Q = r.bits2int || function(f) {
    if (f.length > 8192)
      throw new Error("input is too large");
    const p = qr(f), y = f.length * 8 - _;
    return y > 0 ? p >> BigInt(y) : p;
  }, j = r.bits2int_modN || function(f) {
    return l.create(Q(f));
  }, nt = dr(_);
  function at(i) {
    return Hn("num < 2^" + _, i, Te, nt), l.toBytes(i);
  }
  function it(i, f) {
    return ge(i, void 0, "message"), f ? ge(e(i), void 0, "prehashed message") : i;
  }
  function C(i, f, p) {
    if (["recovered", "canonical"].some((D) => D in p))
      throw new Error("sign() legacy options not supported");
    const { lowS: y, prehash: w, extraEntropy: v } = Gn(p, B);
    i = it(i, w);
    const T = j(i), m = Je(l, f), s = [at(m), at(T)];
    if (v != null && v !== !1) {
      const D = v === !0 ? n(O.secretKey) : v;
      s.push(Lt("extraEntropy", D));
    }
    const u = Ae(...s), E = T;
    function S(D) {
      const X = Q(D);
      if (!l.isValidNot0(X))
        return;
      const J = l.inv(X), et = t.BASE.multiply(X).toAffine(), dt = l.create(et.x);
      if (dt === Te)
        return;
      const pt = l.create(J * l.create(E + dt * m));
      if (pt === Te)
        return;
      let Rt = (et.x === dt ? 0 : 2) | Number(et.y & er), he = pt;
      return y && F(pt) && (he = l.neg(pt), Rt ^= 1), new $(dt, he, Rt);
    }
    return { seed: u, k2sig: S };
  }
  function U(i, f, p = {}) {
    i = Lt("message", i);
    const { seed: y, k2sig: w } = C(i, f, p);
    return zs(e.outputLen, l.BYTES, a)(y, w);
  }
  function G(i) {
    let f;
    const p = typeof i == "string" || lr(i), y = !p && i !== null && typeof i == "object" && typeof i.r == "bigint" && typeof i.s == "bigint";
    if (!p && !y)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    if (y)
      f = new $(i.r, i.s);
    else if (p) {
      try {
        f = $.fromBytes(Lt("sig", i), "der");
      } catch (w) {
        if (!(w instanceof be.Err))
          throw w;
      }
      if (!f)
        try {
          f = $.fromBytes(Lt("sig", i), "compact");
        } catch {
          return !1;
        }
    }
    return f || !1;
  }
  function z(i, f, p, y = {}) {
    const { lowS: w, prehash: v, format: T } = Gn(y, B);
    if (p = Lt("publicKey", p), f = it(Lt("message", f), v), "strict" in y)
      throw new Error("options.strict was renamed to lowS");
    const m = T === void 0 ? G(i) : $.fromBytes(Lt("sig", i), T);
    if (m === !1)
      return !1;
    try {
      const s = t.fromBytes(p);
      if (w && m.hasHighS())
        return !1;
      const { r: u, s: E } = m, S = j(f), D = l.inv(E), X = l.create(S * D), J = l.create(u * D), et = t.BASE.multiplyUnsafe(X).add(s.multiplyUnsafe(J));
      return et.is0() ? !1 : l.create(et.x) === u;
    } catch {
      return !1;
    }
  }
  function g(i, f, p = {}) {
    const { prehash: y } = Gn(p, B);
    return f = it(f, y), $.fromBytes(i, "recovered").recoverPublicKey(f).toBytes();
  }
  return Object.freeze({
    keygen: N,
    getPublicKey: L,
    getSharedSecret: x,
    utils: I,
    lengths: O,
    Point: t,
    sign: U,
    verify: z,
    recoverPublicKey: g,
    Signature: $,
    hash: e
  });
}
function Sl(t) {
  const e = {
    a: t.a,
    b: t.b,
    p: t.Fp.ORDER,
    n: t.n,
    h: t.h,
    Gx: t.Gx,
    Gy: t.Gy
  }, r = t.Fp;
  let n = t.allowedPrivateKeyLengths ? Array.from(new Set(t.allowedPrivateKeyLengths.map((l) => Math.ceil(l / 2)))) : void 0;
  const a = Ke(e.n, {
    BITS: t.nBitLength,
    allowedLengths: n,
    modFromBytes: t.wrapPrivateKey
  }), o = {
    Fp: r,
    Fn: a,
    allowInfinityPoint: t.allowInfinityPoint,
    endo: t.endo,
    isTorsionFree: t.isTorsionFree,
    clearCofactor: t.clearCofactor,
    fromBytes: t.fromBytes,
    toBytes: t.toBytes
  };
  return { CURVE: e, curveOpts: o };
}
function Ol(t) {
  const { CURVE: e, curveOpts: r } = Sl(t), n = {
    hmac: t.hmac,
    randomBytes: t.randomBytes,
    lowS: t.lowS,
    bits2int: t.bits2int,
    bits2int_modN: t.bits2int_modN
  };
  return { CURVE: e, curveOpts: r, hash: t.hash, ecdsaOpts: n };
}
function vl(t, e) {
  const r = e.Point;
  return Object.assign({}, e, {
    ProjectivePoint: r,
    CURVE: Object.assign({}, t, No(r.Fn.ORDER, r.Fn.BITS))
  });
}
function Nl(t) {
  const { CURVE: e, curveOpts: r, hash: n, ecdsaOpts: a } = Ol(t), o = yl(e, r), l = wl(o, n, a);
  return vl(t, l);
}
function Il(t, e) {
  const r = (n) => Nl({ ...t, hash: n });
  return { ...r(e), create: r };
}
const ui = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, bl = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Wi = /* @__PURE__ */ BigInt(2);
function xl(t) {
  const e = ui.p, r = BigInt(3), n = BigInt(6), a = BigInt(11), o = BigInt(22), l = BigInt(23), d = BigInt(44), _ = BigInt(88), N = t * t * t % e, L = N * N * t % e, x = Tt(L, r, e) * L % e, I = Tt(x, r, e) * L % e, O = Tt(I, Wi, e) * N % e, B = Tt(O, a, e) * O % e, k = Tt(B, o, e) * B % e, F = Tt(k, d, e) * k % e, H = Tt(F, _, e) * F % e, Y = Tt(H, d, e) * k % e, $ = Tt(Y, r, e) * L % e, Q = Tt($, l, e) * B % e, j = Tt(Q, n, e) * N % e, nt = Tt(j, Wi, e);
  if (!Xn.eql(Xn.sqr(nt), t))
    throw new Error("Cannot find square root");
  return nt;
}
const Xn = Ke(ui.p, { sqrt: xl }), Tl = Il({ ...ui, Fp: Xn, lowS: !0, endo: bl }, _o);
pr.utils.randomPrivateKey;
pr.getPublicKey;
function Ji(t) {
  try {
    return pr.ExtendedPoint.fromHex(t), !0;
  } catch {
    return !1;
  }
}
const Ll = (t, e) => pr.sign(t, e.slice(0, 32));
pr.verify;
const ns = (t) => _t.Buffer.isBuffer(t) ? t : t instanceof Uint8Array ? _t.Buffer.from(t.buffer, t.byteOffset, t.byteLength) : _t.Buffer.from(t);
class Bl {
  constructor(e) {
    Object.assign(this, e);
  }
  encode() {
    return _t.Buffer.from(Bn.serialize(Lr, this));
  }
  static decode(e) {
    return Bn.deserialize(Lr, this, e);
  }
  static decodeUnchecked(e) {
    return Bn.deserializeUnchecked(Lr, this, e);
  }
}
const Lr = /* @__PURE__ */ new Map();
var is;
const Cl = 32, we = 32;
function Ml(t) {
  return t._bn !== void 0;
}
let Qi = 1;
class ft extends Bl {
  /**
   * Create a new PublicKey object
   * @param value ed25519 public key as buffer or base-58 encoded string
   */
  constructor(e) {
    if (super({}), this._bn = void 0, Ml(e))
      this._bn = e._bn;
    else {
      if (typeof e == "string") {
        const r = pe.decode(e);
        if (r.length != we)
          throw new Error("Invalid public key input");
        this._bn = new ki(r);
      } else
        this._bn = new ki(e);
      if (this._bn.byteLength() > we)
        throw new Error("Invalid public key input");
    }
  }
  /**
   * Returns a unique PublicKey for tests and benchmarks using a counter
   */
  static unique() {
    const e = new ft(Qi);
    return Qi += 1, new ft(e.toBuffer());
  }
  /**
   * Default public key value. The base58-encoded string representation is all ones (as seen below)
   * The underlying BN number is 32 bytes that are all zeros
   */
  /**
   * Checks if two publicKeys are equal
   */
  equals(e) {
    return this._bn.eq(e._bn);
  }
  /**
   * Return the base-58 representation of the public key
   */
  toBase58() {
    return pe.encode(this.toBytes());
  }
  toJSON() {
    return this.toBase58();
  }
  /**
   * Return the byte array representation of the public key in big endian
   */
  toBytes() {
    const e = this.toBuffer();
    return new Uint8Array(e.buffer, e.byteOffset, e.byteLength);
  }
  /**
   * Return the Buffer representation of the public key in big endian
   */
  toBuffer() {
    const e = this._bn.toArrayLike(_t.Buffer);
    if (e.length === we)
      return e;
    const r = _t.Buffer.alloc(32);
    return e.copy(r, 32 - e.length), r;
  }
  get [Symbol.toStringTag]() {
    return `PublicKey(${this.toString()})`;
  }
  /**
   * Return the base-58 representation of the public key
   */
  toString() {
    return this.toBase58();
  }
  /**
   * Derive a public key from another key, a seed, and a program ID.
   * The program ID will also serve as the owner of the public key, giving
   * it permission to write data to the account.
   */
  /* eslint-disable require-await */
  static async createWithSeed(e, r, n) {
    const a = _t.Buffer.concat([e.toBuffer(), _t.Buffer.from(r), n.toBuffer()]), o = Vi(a);
    return new ft(o);
  }
  /**
   * Derive a program address from seeds and a program ID.
   */
  /* eslint-disable require-await */
  static createProgramAddressSync(e, r) {
    let n = _t.Buffer.alloc(0);
    e.forEach(function(o) {
      if (o.length > Cl)
        throw new TypeError("Max seed length exceeded");
      n = _t.Buffer.concat([n, ns(o)]);
    }), n = _t.Buffer.concat([n, r.toBuffer(), _t.Buffer.from("ProgramDerivedAddress")]);
    const a = Vi(n);
    if (Ji(a))
      throw new Error("Invalid seeds, address must fall off the curve");
    return new ft(a);
  }
  /**
   * Async version of createProgramAddressSync
   * For backwards compatibility
   *
   * @deprecated Use {@link createProgramAddressSync} instead
   */
  /* eslint-disable require-await */
  static async createProgramAddress(e, r) {
    return this.createProgramAddressSync(e, r);
  }
  /**
   * Find a valid program address
   *
   * Valid program addresses must fall off the ed25519 curve.  This function
   * iterates a nonce until it finds one that when combined with the seeds
   * results in a valid program address.
   */
  static findProgramAddressSync(e, r) {
    let n = 255, a;
    for (; n != 0; ) {
      try {
        const o = e.concat(_t.Buffer.from([n]));
        a = this.createProgramAddressSync(o, r);
      } catch (o) {
        if (o instanceof TypeError)
          throw o;
        n--;
        continue;
      }
      return [a, n];
    }
    throw new Error("Unable to find a viable program address nonce");
  }
  /**
   * Async version of findProgramAddressSync
   * For backwards compatibility
   *
   * @deprecated Use {@link findProgramAddressSync} instead
   */
  static async findProgramAddress(e, r) {
    return this.findProgramAddressSync(e, r);
  }
  /**
   * Check that a pubkey is on the ed25519 curve.
   */
  static isOnCurve(e) {
    const r = new ft(e);
    return Ji(r.toBytes());
  }
}
is = ft;
ft.default = new is("11111111111111111111111111111111");
Lr.set(ft, {
  kind: "struct",
  fields: [["_bn", "u256"]]
});
new ft("BPFLoader1111111111111111111111111111111111");
const Br = 1232, Wr = 127, We = 64, Ul = 129;
class hr {
  constructor(e, r) {
    this.staticAccountKeys = void 0, this.accountKeysFromLookups = void 0, this.staticAccountKeys = e, this.accountKeysFromLookups = r;
  }
  keySegments() {
    const e = [this.staticAccountKeys];
    return this.accountKeysFromLookups && (e.push(this.accountKeysFromLookups.writable), e.push(this.accountKeysFromLookups.readonly)), e;
  }
  get(e) {
    for (const r of this.keySegments()) {
      if (e < r.length)
        return r[e];
      e -= r.length;
    }
  }
  get length() {
    return this.keySegments().flat().length;
  }
  compileInstructions(e) {
    if (this.length > 256)
      throw new Error("Account index overflow encountered during compilation");
    const n = /* @__PURE__ */ new Map();
    this.keySegments().flat().forEach((o, l) => {
      n.set(o.toBase58(), l);
    });
    const a = (o) => {
      const l = n.get(o.toBase58());
      if (l === void 0) throw new Error("Encountered an unknown instruction account key during compilation");
      return l;
    };
    return e.map((o) => ({
      programIdIndex: a(o.programId),
      accountKeyIndexes: o.keys.map((l) => a(l.pubkey)),
      data: o.data
    }));
  }
}
const lt = (t = "publicKey") => b.blob(32, t), Dl = (t = "signature") => b.blob(64, t), Qe = (t = "string") => {
  const e = b.struct([b.u32("length"), b.u32("lengthPadding"), b.blob(b.offset(b.u32(), -8), "chars")], t), r = e.decode.bind(e), n = e.encode.bind(e), a = e;
  return a.decode = (o, l) => r(o, l).chars.toString(), a.encode = (o, l, d) => {
    const _ = {
      chars: _t.Buffer.from(o, "utf8")
    };
    return n(_, l, d);
  }, a.alloc = (o) => b.u32().span + b.u32().span + _t.Buffer.from(o, "utf8").length, a;
}, Fl = (t = "authorized") => b.struct([lt("staker"), lt("withdrawer")], t), kl = (t = "lockup") => b.struct([b.ns64("unixTimestamp"), b.ns64("epoch"), lt("custodian")], t), Pl = (t = "voteInit") => b.struct([lt("nodePubkey"), lt("authorizedVoter"), lt("authorizedWithdrawer"), b.u8("commission")], t), $l = (t = "voteAuthorizeWithSeedArgs") => b.struct([b.u32("voteAuthorizationType"), lt("currentAuthorityDerivedKeyOwnerPubkey"), Qe("currentAuthorityDerivedKeySeed"), lt("newAuthorized")], t);
function le(t) {
  let e = 0, r = 0;
  for (; ; ) {
    let n = t.shift();
    if (e |= (n & 127) << r * 7, r += 1, (n & 128) === 0)
      break;
  }
  return e;
}
function de(t, e) {
  let r = e;
  for (; ; ) {
    let n = r & 127;
    if (r >>= 7, r == 0) {
      t.push(n);
      break;
    } else
      n |= 128, t.push(n);
  }
}
function ee(t, e) {
  if (!t)
    throw new Error(e || "Assertion failed");
}
class Jr {
  constructor(e, r) {
    this.payer = void 0, this.keyMetaMap = void 0, this.payer = e, this.keyMetaMap = r;
  }
  static compile(e, r) {
    const n = /* @__PURE__ */ new Map(), a = (l) => {
      const d = l.toBase58();
      let _ = n.get(d);
      return _ === void 0 && (_ = {
        isSigner: !1,
        isWritable: !1,
        isInvoked: !1
      }, n.set(d, _)), _;
    }, o = a(r);
    o.isSigner = !0, o.isWritable = !0;
    for (const l of e) {
      a(l.programId).isInvoked = !0;
      for (const d of l.keys) {
        const _ = a(d.pubkey);
        _.isSigner || (_.isSigner = d.isSigner), _.isWritable || (_.isWritable = d.isWritable);
      }
    }
    return new Jr(r, n);
  }
  getMessageComponents() {
    const e = [...this.keyMetaMap.entries()];
    ee(e.length <= 256, "Max static account keys length exceeded");
    const r = e.filter(([, _]) => _.isSigner && _.isWritable), n = e.filter(([, _]) => _.isSigner && !_.isWritable), a = e.filter(([, _]) => !_.isSigner && _.isWritable), o = e.filter(([, _]) => !_.isSigner && !_.isWritable), l = {
      numRequiredSignatures: r.length + n.length,
      numReadonlySignedAccounts: n.length,
      numReadonlyUnsignedAccounts: o.length
    };
    {
      ee(r.length > 0, "Expected at least one writable signer key");
      const [_] = r[0];
      ee(_ === this.payer.toBase58(), "Expected first writable signer key to be the fee payer");
    }
    const d = [...r.map(([_]) => new ft(_)), ...n.map(([_]) => new ft(_)), ...a.map(([_]) => new ft(_)), ...o.map(([_]) => new ft(_))];
    return [l, d];
  }
  extractTableLookup(e) {
    const [r, n] = this.drainKeysFoundInLookupTable(e.state.addresses, (l) => !l.isSigner && !l.isInvoked && l.isWritable), [a, o] = this.drainKeysFoundInLookupTable(e.state.addresses, (l) => !l.isSigner && !l.isInvoked && !l.isWritable);
    if (!(r.length === 0 && a.length === 0))
      return [{
        accountKey: e.key,
        writableIndexes: r,
        readonlyIndexes: a
      }, {
        writable: n,
        readonly: o
      }];
  }
  /** @internal */
  drainKeysFoundInLookupTable(e, r) {
    const n = new Array(), a = new Array();
    for (const [o, l] of this.keyMetaMap.entries())
      if (r(l)) {
        const d = new ft(o), _ = e.findIndex((N) => N.equals(d));
        _ >= 0 && (ee(_ < 256, "Max lookup table index exceeded"), n.push(_), a.push(d), this.keyMetaMap.delete(o));
      }
    return [n, a];
  }
}
const os = "Reached end of buffer unexpectedly";
function Wt(t) {
  if (t.length === 0)
    throw new Error(os);
  return t.shift();
}
function Qt(t, ...e) {
  const [r] = e;
  if (e.length === 2 ? r + (e[1] ?? 0) > t.length : r >= t.length)
    throw new Error(os);
  return t.splice(...e);
}
class Vr {
  constructor(e) {
    this.header = void 0, this.accountKeys = void 0, this.recentBlockhash = void 0, this.instructions = void 0, this.indexToProgramIds = /* @__PURE__ */ new Map(), this.header = e.header, this.accountKeys = e.accountKeys.map((r) => new ft(r)), this.recentBlockhash = e.recentBlockhash, this.instructions = e.instructions, this.instructions.forEach((r) => this.indexToProgramIds.set(r.programIdIndex, this.accountKeys[r.programIdIndex]));
  }
  get version() {
    return "legacy";
  }
  get staticAccountKeys() {
    return this.accountKeys;
  }
  get compiledInstructions() {
    return this.instructions.map((e) => ({
      programIdIndex: e.programIdIndex,
      accountKeyIndexes: e.accounts,
      data: pe.decode(e.data)
    }));
  }
  get addressTableLookups() {
    return [];
  }
  getAccountKeys() {
    return new hr(this.staticAccountKeys);
  }
  static compile(e) {
    const r = Jr.compile(e.instructions, e.payerKey), [n, a] = r.getMessageComponents(), l = new hr(a).compileInstructions(e.instructions).map((d) => ({
      programIdIndex: d.programIdIndex,
      accounts: d.accountKeyIndexes,
      data: pe.encode(d.data)
    }));
    return new Vr({
      header: n,
      accountKeys: a,
      recentBlockhash: e.recentBlockhash,
      instructions: l
    });
  }
  isAccountSigner(e) {
    return e < this.header.numRequiredSignatures;
  }
  isAccountWritable(e) {
    const r = this.header.numRequiredSignatures;
    if (e >= this.header.numRequiredSignatures) {
      const n = e - r, o = this.accountKeys.length - r - this.header.numReadonlyUnsignedAccounts;
      return n < o;
    } else {
      const n = r - this.header.numReadonlySignedAccounts;
      return e < n;
    }
  }
  isProgramId(e) {
    return this.indexToProgramIds.has(e);
  }
  programIds() {
    return [...this.indexToProgramIds.values()];
  }
  nonProgramIds() {
    return this.accountKeys.filter((e, r) => !this.isProgramId(r));
  }
  serialize() {
    const e = this.accountKeys.length;
    let r = [];
    de(r, e);
    const n = this.instructions.map((x) => {
      const {
        accounts: I,
        programIdIndex: O
      } = x, B = Array.from(pe.decode(x.data));
      let k = [];
      de(k, I.length);
      let F = [];
      return de(F, B.length), {
        programIdIndex: O,
        keyIndicesCount: _t.Buffer.from(k),
        keyIndices: I,
        dataLength: _t.Buffer.from(F),
        data: B
      };
    });
    let a = [];
    de(a, n.length);
    let o = _t.Buffer.alloc(Br);
    _t.Buffer.from(a).copy(o);
    let l = a.length;
    n.forEach((x) => {
      const O = b.struct([b.u8("programIdIndex"), b.blob(x.keyIndicesCount.length, "keyIndicesCount"), b.seq(b.u8("keyIndex"), x.keyIndices.length, "keyIndices"), b.blob(x.dataLength.length, "dataLength"), b.seq(b.u8("userdatum"), x.data.length, "data")]).encode(x, o, l);
      l += O;
    }), o = o.slice(0, l);
    const d = b.struct([b.blob(1, "numRequiredSignatures"), b.blob(1, "numReadonlySignedAccounts"), b.blob(1, "numReadonlyUnsignedAccounts"), b.blob(r.length, "keyCount"), b.seq(lt("key"), e, "keys"), lt("recentBlockhash")]), _ = {
      numRequiredSignatures: _t.Buffer.from([this.header.numRequiredSignatures]),
      numReadonlySignedAccounts: _t.Buffer.from([this.header.numReadonlySignedAccounts]),
      numReadonlyUnsignedAccounts: _t.Buffer.from([this.header.numReadonlyUnsignedAccounts]),
      keyCount: _t.Buffer.from(r),
      keys: this.accountKeys.map((x) => ns(x.toBytes())),
      recentBlockhash: pe.decode(this.recentBlockhash)
    };
    let N = _t.Buffer.alloc(2048);
    const L = d.encode(_, N);
    return o.copy(N, L), N.slice(0, L + o.length);
  }
  /**
   * Decode a compiled message into a Message object.
   */
  static from(e) {
    let r = [...e];
    const n = Wt(r);
    if (n !== (n & Wr))
      throw new Error("Versioned messages must be deserialized with VersionedMessage.deserialize()");
    const a = Wt(r), o = Wt(r), l = le(r);
    let d = [];
    for (let I = 0; I < l; I++) {
      const O = Qt(r, 0, we);
      d.push(new ft(_t.Buffer.from(O)));
    }
    const _ = Qt(r, 0, we), N = le(r);
    let L = [];
    for (let I = 0; I < N; I++) {
      const O = Wt(r), B = le(r), k = Qt(r, 0, B), F = le(r), H = Qt(r, 0, F), Y = pe.encode(_t.Buffer.from(H));
      L.push({
        programIdIndex: O,
        accounts: k,
        data: Y
      });
    }
    const x = {
      header: {
        numRequiredSignatures: n,
        numReadonlySignedAccounts: a,
        numReadonlyUnsignedAccounts: o
      },
      recentBlockhash: pe.encode(_t.Buffer.from(_)),
      accountKeys: d,
      instructions: L
    };
    return new Vr(x);
  }
}
class Kr {
  constructor(e) {
    this.header = void 0, this.staticAccountKeys = void 0, this.recentBlockhash = void 0, this.compiledInstructions = void 0, this.addressTableLookups = void 0, this.header = e.header, this.staticAccountKeys = e.staticAccountKeys, this.recentBlockhash = e.recentBlockhash, this.compiledInstructions = e.compiledInstructions, this.addressTableLookups = e.addressTableLookups;
  }
  get version() {
    return 0;
  }
  get numAccountKeysFromLookups() {
    let e = 0;
    for (const r of this.addressTableLookups)
      e += r.readonlyIndexes.length + r.writableIndexes.length;
    return e;
  }
  getAccountKeys(e) {
    let r;
    if (e && "accountKeysFromLookups" in e && e.accountKeysFromLookups) {
      if (this.numAccountKeysFromLookups != e.accountKeysFromLookups.writable.length + e.accountKeysFromLookups.readonly.length)
        throw new Error("Failed to get account keys because of a mismatch in the number of account keys from lookups");
      r = e.accountKeysFromLookups;
    } else if (e && "addressLookupTableAccounts" in e && e.addressLookupTableAccounts)
      r = this.resolveAddressTableLookups(e.addressLookupTableAccounts);
    else if (this.addressTableLookups.length > 0)
      throw new Error("Failed to get account keys because address table lookups were not resolved");
    return new hr(this.staticAccountKeys, r);
  }
  isAccountSigner(e) {
    return e < this.header.numRequiredSignatures;
  }
  isAccountWritable(e) {
    const r = this.header.numRequiredSignatures, n = this.staticAccountKeys.length;
    if (e >= n) {
      const a = e - n, o = this.addressTableLookups.reduce((l, d) => l + d.writableIndexes.length, 0);
      return a < o;
    } else if (e >= this.header.numRequiredSignatures) {
      const a = e - r, l = n - r - this.header.numReadonlyUnsignedAccounts;
      return a < l;
    } else {
      const a = r - this.header.numReadonlySignedAccounts;
      return e < a;
    }
  }
  resolveAddressTableLookups(e) {
    const r = {
      writable: [],
      readonly: []
    };
    for (const n of this.addressTableLookups) {
      const a = e.find((o) => o.key.equals(n.accountKey));
      if (!a)
        throw new Error(`Failed to find address lookup table account for table key ${n.accountKey.toBase58()}`);
      for (const o of n.writableIndexes)
        if (o < a.state.addresses.length)
          r.writable.push(a.state.addresses[o]);
        else
          throw new Error(`Failed to find address for index ${o} in address lookup table ${n.accountKey.toBase58()}`);
      for (const o of n.readonlyIndexes)
        if (o < a.state.addresses.length)
          r.readonly.push(a.state.addresses[o]);
        else
          throw new Error(`Failed to find address for index ${o} in address lookup table ${n.accountKey.toBase58()}`);
    }
    return r;
  }
  static compile(e) {
    const r = Jr.compile(e.instructions, e.payerKey), n = new Array(), a = {
      writable: new Array(),
      readonly: new Array()
    }, o = e.addressLookupTableAccounts || [];
    for (const L of o) {
      const x = r.extractTableLookup(L);
      if (x !== void 0) {
        const [I, {
          writable: O,
          readonly: B
        }] = x;
        n.push(I), a.writable.push(...O), a.readonly.push(...B);
      }
    }
    const [l, d] = r.getMessageComponents(), N = new hr(d, a).compileInstructions(e.instructions);
    return new Kr({
      header: l,
      staticAccountKeys: d,
      recentBlockhash: e.recentBlockhash,
      compiledInstructions: N,
      addressTableLookups: n
    });
  }
  serialize() {
    const e = Array();
    de(e, this.staticAccountKeys.length);
    const r = this.serializeInstructions(), n = Array();
    de(n, this.compiledInstructions.length);
    const a = this.serializeAddressTableLookups(), o = Array();
    de(o, this.addressTableLookups.length);
    const l = b.struct([b.u8("prefix"), b.struct([b.u8("numRequiredSignatures"), b.u8("numReadonlySignedAccounts"), b.u8("numReadonlyUnsignedAccounts")], "header"), b.blob(e.length, "staticAccountKeysLength"), b.seq(lt(), this.staticAccountKeys.length, "staticAccountKeys"), lt("recentBlockhash"), b.blob(n.length, "instructionsLength"), b.blob(r.length, "serializedInstructions"), b.blob(o.length, "addressTableLookupsLength"), b.blob(a.length, "serializedAddressTableLookups")]), d = new Uint8Array(Br), N = l.encode({
      prefix: 128,
      header: this.header,
      staticAccountKeysLength: new Uint8Array(e),
      staticAccountKeys: this.staticAccountKeys.map((L) => L.toBytes()),
      recentBlockhash: pe.decode(this.recentBlockhash),
      instructionsLength: new Uint8Array(n),
      serializedInstructions: r,
      addressTableLookupsLength: new Uint8Array(o),
      serializedAddressTableLookups: a
    }, d);
    return d.slice(0, N);
  }
  serializeInstructions() {
    let e = 0;
    const r = new Uint8Array(Br);
    for (const n of this.compiledInstructions) {
      const a = Array();
      de(a, n.accountKeyIndexes.length);
      const o = Array();
      de(o, n.data.length);
      const l = b.struct([b.u8("programIdIndex"), b.blob(a.length, "encodedAccountKeyIndexesLength"), b.seq(b.u8(), n.accountKeyIndexes.length, "accountKeyIndexes"), b.blob(o.length, "encodedDataLength"), b.blob(n.data.length, "data")]);
      e += l.encode({
        programIdIndex: n.programIdIndex,
        encodedAccountKeyIndexesLength: new Uint8Array(a),
        accountKeyIndexes: n.accountKeyIndexes,
        encodedDataLength: new Uint8Array(o),
        data: n.data
      }, r, e);
    }
    return r.slice(0, e);
  }
  serializeAddressTableLookups() {
    let e = 0;
    const r = new Uint8Array(Br);
    for (const n of this.addressTableLookups) {
      const a = Array();
      de(a, n.writableIndexes.length);
      const o = Array();
      de(o, n.readonlyIndexes.length);
      const l = b.struct([lt("accountKey"), b.blob(a.length, "encodedWritableIndexesLength"), b.seq(b.u8(), n.writableIndexes.length, "writableIndexes"), b.blob(o.length, "encodedReadonlyIndexesLength"), b.seq(b.u8(), n.readonlyIndexes.length, "readonlyIndexes")]);
      e += l.encode({
        accountKey: n.accountKey.toBytes(),
        encodedWritableIndexesLength: new Uint8Array(a),
        writableIndexes: n.writableIndexes,
        encodedReadonlyIndexesLength: new Uint8Array(o),
        readonlyIndexes: n.readonlyIndexes
      }, r, e);
    }
    return r.slice(0, e);
  }
  static deserialize(e) {
    let r = [...e];
    const n = Wt(r), a = n & Wr;
    ee(n !== a, "Expected versioned message but received legacy message");
    const o = a;
    ee(o === 0, `Expected versioned message with version 0 but found version ${o}`);
    const l = {
      numRequiredSignatures: Wt(r),
      numReadonlySignedAccounts: Wt(r),
      numReadonlyUnsignedAccounts: Wt(r)
    }, d = [], _ = le(r);
    for (let B = 0; B < _; B++)
      d.push(new ft(Qt(r, 0, we)));
    const N = pe.encode(Qt(r, 0, we)), L = le(r), x = [];
    for (let B = 0; B < L; B++) {
      const k = Wt(r), F = le(r), H = Qt(r, 0, F), Y = le(r), $ = new Uint8Array(Qt(r, 0, Y));
      x.push({
        programIdIndex: k,
        accountKeyIndexes: H,
        data: $
      });
    }
    const I = le(r), O = [];
    for (let B = 0; B < I; B++) {
      const k = new ft(Qt(r, 0, we)), F = le(r), H = Qt(r, 0, F), Y = le(r), $ = Qt(r, 0, Y);
      O.push({
        accountKey: k,
        writableIndexes: H,
        readonlyIndexes: $
      });
    }
    return new Kr({
      header: l,
      staticAccountKeys: d,
      recentBlockhash: N,
      compiledInstructions: x,
      addressTableLookups: O
    });
  }
}
const to = 3, Gl = 4, Vl = 8, Kl = 16;
function xr(t) {
  const e = Qt(t, 0, 4);
  return e[0] + e[1] * 2 ** 8 + e[2] * 2 ** 16 + e[3] * 2 ** 24;
}
function zl(t) {
  const e = Qt(t, 0, 8);
  let r = BigInt(0);
  for (let n = e.length - 1; n >= 0; n--)
    r = r << BigInt(8) | BigInt(e[n]);
  return ee(r <= BigInt(Number.MAX_SAFE_INTEGER), "Expected u64 value to be within the safe integer range"), Number(r);
}
class ci {
  constructor(e) {
    this.header = void 0, this.staticAccountKeys = void 0, this.recentBlockhash = void 0, this.compiledInstructions = void 0, this.transactionConfig = void 0, this.header = e.header, this.staticAccountKeys = e.staticAccountKeys, this.recentBlockhash = e.recentBlockhash, this.compiledInstructions = e.compiledInstructions, this.transactionConfig = e.transactionConfig ?? {
      computeUnitLimit: null,
      heapSize: null,
      loadedAccountsDataSizeLimit: null,
      priorityFee: null
    };
  }
  get version() {
    return 1;
  }
  get addressTableLookups() {
    return [];
  }
  getAccountKeys() {
    return new hr(this.staticAccountKeys);
  }
  isAccountSigner(e) {
    return e < this.header.numRequiredSignatures;
  }
  isAccountWritable(e) {
    const r = this.header.numRequiredSignatures, n = this.staticAccountKeys.length;
    if (e >= n)
      return !1;
    if (e >= this.header.numRequiredSignatures) {
      const a = e - r, l = n - r - this.header.numReadonlyUnsignedAccounts;
      return a < l;
    } else {
      const a = r - this.header.numReadonlySignedAccounts;
      return e < a;
    }
  }
  serialize() {
    throw new Error("Serialization of version 1 transaction messages is not supported");
  }
  static deserialize(e) {
    let r = [...e];
    const n = Wt(r), a = n & Wr;
    ee(n !== a, "Expected versioned message but received legacy message");
    const o = a;
    ee(o === 1, `Expected versioned message with version 1 but found version ${o}`);
    const l = {
      numRequiredSignatures: Wt(r),
      numReadonlySignedAccounts: Wt(r),
      numReadonlyUnsignedAccounts: Wt(r)
    }, d = xr(r);
    ee((d & -32) === 0, "Unexpected bits set in the transaction config mask");
    const _ = d & to;
    ee(_ === 0 || _ === to, "Expected both or neither of the priority fee bits to be set in the transaction config mask");
    const N = pe.encode(Qt(r, 0, we)), L = Wt(r), x = Wt(r), I = [];
    for (let F = 0; F < x; F++)
      I.push(new ft(Qt(r, 0, we)));
    const O = {
      computeUnitLimit: null,
      heapSize: null,
      loadedAccountsDataSizeLimit: null,
      priorityFee: null
    };
    _ !== 0 && (O.priorityFee = zl(r)), d & Gl && (O.computeUnitLimit = xr(r)), d & Vl && (O.loadedAccountsDataSizeLimit = xr(r)), d & Kl && (O.heapSize = xr(r));
    const B = [];
    for (let F = 0; F < L; F++) {
      const H = Wt(r), Y = Wt(r), $ = Wt(r) + Wt(r) * 256;
      B.push({
        accountKeyIndexesLength: Y,
        dataLength: $,
        programIdIndex: H
      });
    }
    const k = [];
    for (const F of B)
      k.push({
        programIdIndex: F.programIdIndex,
        accountKeyIndexes: Qt(r, 0, F.accountKeyIndexesLength),
        data: new Uint8Array(Qt(r, 0, F.dataLength))
      });
    return ee(r.length === 0, "Expected no bytes to remain after deserializing a version 1 message"), new ci({
      header: l,
      staticAccountKeys: I,
      recentBlockhash: N,
      compiledInstructions: k,
      transactionConfig: O
    });
  }
}
const Yn = {
  deserializeMessageVersion(t) {
    const e = t[0], r = e & Wr;
    return r === e ? "legacy" : r;
  },
  deserialize: (t) => {
    const e = Yn.deserializeMessageVersion(t);
    if (e === "legacy")
      return Vr.from(t);
    if (e === 0)
      return Kr.deserialize(t);
    if (e === 1)
      return ci.deserialize(t);
    throw new Error(`Transaction message version ${e} deserialization is not supported`);
  }
};
_t.Buffer.alloc(We).fill(0);
class zr {
  get version() {
    return this.message.version;
  }
  constructor(e, r) {
    if (this.signatures = void 0, this.message = void 0, r !== void 0)
      ee(r.length === e.header.numRequiredSignatures, "Expected signatures length to be equal to the number of required signatures"), this.signatures = r;
    else {
      const n = [];
      for (let a = 0; a < e.header.numRequiredSignatures; a++)
        n.push(new Uint8Array(We));
      this.signatures = n;
    }
    this.message = e;
  }
  serialize() {
    const e = this.message.serialize(), r = Array();
    de(r, this.signatures.length);
    const n = b.struct([b.blob(r.length, "encodedSignaturesLength"), b.seq(Dl(), this.signatures.length, "signatures"), b.blob(e.length, "serializedMessage")]), a = new Uint8Array(2048), o = n.encode({
      encodedSignaturesLength: new Uint8Array(r),
      signatures: this.signatures,
      serializedMessage: e
    }, a);
    return a.slice(0, o);
  }
  static deserialize(e) {
    if (e[0] === Ul)
      return this.deserializeV1(e);
    let r = [...e];
    const n = [], a = le(r);
    for (let l = 0; l < a; l++)
      n.push(new Uint8Array(Qt(r, 0, We)));
    const o = Yn.deserialize(new Uint8Array(r));
    return new zr(o, n);
  }
  static deserializeV1(e) {
    const r = e[1], n = r * We, a = e.length - n;
    ee(a > 0, "Expected transaction to have enough bytes for its signatures");
    const o = Yn.deserialize(e.slice(0, a)), l = [];
    for (let d = 0; d < r; d++) {
      const _ = a + d * We;
      l.push(e.slice(_, _ + We));
    }
    return new zr(o, l);
  }
  sign(e) {
    const r = this.message.serialize(), n = this.message.staticAccountKeys.slice(0, this.message.header.numRequiredSignatures);
    for (const a of e) {
      const o = n.findIndex((l) => l.equals(a.publicKey));
      ee(o >= 0, `Cannot sign with non signer key ${a.publicKey.toBase58()}`), this.signatures[o] = Ll(r, a.secretKey);
    }
  }
  addSignature(e, r) {
    ee(r.byteLength === 64, "Signature must be 64 bytes long");
    const a = this.message.staticAccountKeys.slice(0, this.message.header.numRequiredSignatures).findIndex((o) => o.equals(e));
    ee(a >= 0, `Can not add signature; \`${e.toBase58()}\` is not required to sign this transaction`), this.signatures[a] = r;
  }
}
new ft("SysvarC1ock11111111111111111111111111111111");
new ft("SysvarEpochSchedu1e111111111111111111111111");
new ft("Sysvar1nstructions1111111111111111111111111");
new ft("SysvarRecentB1ockHashes11111111111111111111");
new ft("SysvarRent111111111111111111111111111111111");
new ft("SysvarRewards111111111111111111111111111111");
new ft("SysvarS1otHashes111111111111111111111111111");
new ft("SysvarS1otHistory11111111111111111111111111");
new ft("SysvarStakeHistory1111111111111111111111111");
const Hl = b.nu64("lamportsPerSignature"), ql = b.struct([b.u32("version"), b.u32("state"), lt("authorizedPubkey"), lt("nonce"), b.struct([Hl], "feeCalculator")]);
ql.span;
function or(t) {
  const e = b.blob(8, t), r = e.decode.bind(e), n = e.encode.bind(e), a = e, o = $0();
  return a.decode = (l, d) => {
    const _ = r(l, d);
    return o.decode(_);
  }, a.encode = (l, d, _) => {
    const N = o.encode(l);
    return n(N, d, _);
  }, a;
}
Object.freeze({
  Create: {
    index: 0,
    layout: b.struct([b.u32("instruction"), b.ns64("lamports"), b.ns64("space"), lt("programId")])
  },
  Assign: {
    index: 1,
    layout: b.struct([b.u32("instruction"), lt("programId")])
  },
  Transfer: {
    index: 2,
    layout: b.struct([b.u32("instruction"), or("lamports")])
  },
  CreateWithSeed: {
    index: 3,
    layout: b.struct([b.u32("instruction"), lt("base"), Qe("seed"), b.ns64("lamports"), b.ns64("space"), lt("programId")])
  },
  AdvanceNonceAccount: {
    index: 4,
    layout: b.struct([b.u32("instruction")])
  },
  WithdrawNonceAccount: {
    index: 5,
    layout: b.struct([b.u32("instruction"), b.ns64("lamports")])
  },
  InitializeNonceAccount: {
    index: 6,
    layout: b.struct([b.u32("instruction"), lt("authorized")])
  },
  AuthorizeNonceAccount: {
    index: 7,
    layout: b.struct([b.u32("instruction"), lt("authorized")])
  },
  Allocate: {
    index: 8,
    layout: b.struct([b.u32("instruction"), b.ns64("space")])
  },
  AllocateWithSeed: {
    index: 9,
    layout: b.struct([b.u32("instruction"), lt("base"), Qe("seed"), b.ns64("space"), lt("programId")])
  },
  AssignWithSeed: {
    index: 10,
    layout: b.struct([b.u32("instruction"), lt("base"), Qe("seed"), lt("programId")])
  },
  TransferWithSeed: {
    index: 11,
    layout: b.struct([b.u32("instruction"), or("lamports"), Qe("seed"), lt("programId")])
  },
  UpgradeNonceAccount: {
    index: 12,
    layout: b.struct([b.u32("instruction")])
  }
});
new ft("11111111111111111111111111111111");
new ft("BPFLoader2111111111111111111111111111111111");
b.struct([
  b.u32("typeIndex"),
  or("deactivationSlot"),
  b.nu64("lastExtendedSlot"),
  b.u8("lastExtendedStartIndex"),
  b.u8(),
  // option
  b.seq(lt(), b.offset(b.u8(), -1), "authority")
]);
const Bt = Er(si(ft), W(), (t) => new ft(t)), ss = ai([W(), Ot("base64")]), fi = Er(si(_t.Buffer), ss, (t) => _t.Buffer.from(t[0], "base64"));
function as(t) {
  return ue([Z({
    jsonrpc: Ot("2.0"),
    id: W(),
    result: t
  }), Z({
    jsonrpc: Ot("2.0"),
    id: W(),
    error: Z({
      code: sr(),
      message: W(),
      data: ot(X0())
    })
  })]);
}
const Xl = as(sr());
function mt(t) {
  return Er(as(t), Xl, (e) => "error" in e ? e : {
    ...e,
    result: fr(e.result, t)
  });
}
function Ee(t) {
  return mt(Z({
    context: Z({
      slot: V()
    }),
    value: t
  }));
}
function Qr(t) {
  return Z({
    context: Z({
      slot: V()
    }),
    value: t
  });
}
const Yl = Z({
  foundation: V(),
  foundationTerm: V(),
  initial: V(),
  taper: V(),
  terminal: V()
});
mt(rt(tt(Z({
  epoch: V(),
  effectiveSlot: V(),
  amount: V(),
  postBalance: V(),
  commission: ot(tt(V()))
}))));
const Zl = rt(Z({
  slot: V(),
  prioritizationFee: V()
})), jl = Z({
  total: V(),
  validator: V(),
  foundation: V(),
  epoch: V()
}), Wl = Z({
  epoch: V(),
  slotIndex: V(),
  slotsInEpoch: V(),
  absoluteSlot: V(),
  blockHeight: ot(V()),
  transactionCount: ot(V())
}), Jl = Z({
  slotsPerEpoch: V(),
  leaderScheduleSlotOffset: V(),
  warmup: Se(),
  firstNormalEpoch: V(),
  firstNormalSlot: V()
}), Ql = qo(W(), rt(V())), He = tt(ue([Z({}), W()])), td = Z({
  err: He
}), ed = Ot("receivedSignature");
Z({
  "solana-core": W(),
  "feature-set": ot(V())
});
const rd = Z({
  program: W(),
  programId: Bt,
  parsed: sr()
}), nd = Z({
  programId: Bt,
  accounts: rt(Bt),
  data: W()
});
Ee(Z({
  err: tt(ue([Z({}), W()])),
  logs: tt(rt(W())),
  accounts: ot(tt(rt(tt(Z({
    executable: Se(),
    owner: W(),
    lamports: V(),
    data: rt(W()),
    rentEpoch: ot(V())
  }))))),
  unitsConsumed: ot(V()),
  returnData: ot(tt(Z({
    programId: W(),
    data: ai([W(), Ot("base64")])
  }))),
  innerInstructions: ot(tt(rt(Z({
    index: V(),
    instructions: rt(ue([rd, nd]))
  }))))
}));
Ee(Z({
  byIdentity: qo(W(), rt(V())),
  range: Z({
    firstSlot: V(),
    lastSlot: V()
  })
}));
mt(Yl);
mt(jl);
mt(Zl);
mt(Wl);
mt(Jl);
mt(Ql);
mt(V());
Ee(Z({
  total: V(),
  circulating: V(),
  nonCirculating: V(),
  nonCirculatingAccounts: rt(Bt)
}));
const id = Z({
  amount: W(),
  uiAmount: tt(V()),
  decimals: V(),
  uiAmountString: ot(W())
});
Ee(rt(Z({
  address: Bt,
  amount: W(),
  uiAmount: tt(V()),
  decimals: V(),
  uiAmountString: ot(W())
})));
Ee(rt(Z({
  pubkey: Bt,
  account: Z({
    executable: Se(),
    owner: Bt,
    lamports: V(),
    data: fi,
    rentEpoch: V()
  })
})));
const Zn = Z({
  program: W(),
  parsed: sr(),
  space: V()
});
Ee(rt(Z({
  pubkey: Bt,
  account: Z({
    executable: Se(),
    owner: Bt,
    lamports: V(),
    data: Zn,
    rentEpoch: V()
  })
})));
Ee(rt(Z({
  lamports: V(),
  address: Bt
})));
const hi = Z({
  executable: Se(),
  owner: Bt,
  lamports: V(),
  data: fi,
  rentEpoch: V()
});
Z({
  pubkey: Bt,
  account: hi
});
const od = Er(ue([si(_t.Buffer), Zn]), ue([ss, Zn]), (t) => Array.isArray(t) ? fr(t, fi) : t), sd = Z({
  executable: Se(),
  owner: Bt,
  lamports: V(),
  data: od,
  rentEpoch: V()
});
Z({
  pubkey: Bt,
  account: sd
});
Z({
  state: ue([Ot("active"), Ot("inactive"), Ot("activating"), Ot("deactivating")]),
  active: V(),
  inactive: V()
});
mt(rt(Z({
  signature: W(),
  slot: V(),
  err: He,
  memo: tt(W()),
  blockTime: ot(tt(V()))
})));
mt(rt(Z({
  signature: W(),
  slot: V(),
  err: He,
  memo: tt(W()),
  blockTime: ot(tt(V()))
})));
Z({
  subscription: V(),
  result: Qr(hi)
});
const ad = Z({
  pubkey: Bt,
  account: hi
});
Z({
  subscription: V(),
  result: Qr(ad)
});
const ud = Z({
  parent: V(),
  slot: V(),
  root: V()
});
Z({
  subscription: V(),
  result: ud
});
const cd = ue([Z({
  type: ue([Ot("firstShredReceived"), Ot("completed"), Ot("optimisticConfirmation"), Ot("root")]),
  slot: V(),
  timestamp: V()
}), Z({
  type: Ot("createdBank"),
  parent: V(),
  slot: V(),
  timestamp: V()
}), Z({
  type: Ot("frozen"),
  slot: V(),
  timestamp: V(),
  stats: Z({
    numTransactionEntries: V(),
    numSuccessfulTransactions: V(),
    numFailedTransactions: V(),
    maxTransactionsPerEntry: V()
  })
}), Z({
  type: Ot("dead"),
  slot: V(),
  timestamp: V(),
  err: W()
})]);
Z({
  subscription: V(),
  result: cd
});
Z({
  subscription: V(),
  result: Qr(ue([td, ed]))
});
Z({
  subscription: V(),
  result: V()
});
Z({
  pubkey: W(),
  gossip: tt(W()),
  tpu: tt(W()),
  rpc: tt(W()),
  version: tt(W())
});
const eo = Z({
  votePubkey: W(),
  nodePubkey: W(),
  activatedStake: V(),
  epochVoteAccount: Se(),
  epochCredits: rt(ai([V(), V(), V()])),
  commission: V(),
  lastVote: V(),
  rootSlot: tt(V())
});
mt(Z({
  current: rt(eo),
  delinquent: rt(eo)
}));
const fd = ue([Ot("processed"), Ot("confirmed"), Ot("finalized")]), hd = Z({
  slot: V(),
  confirmations: tt(V()),
  err: He,
  confirmationStatus: ot(fd)
});
Ee(rt(tt(hd)));
mt(V());
const us = Z({
  accountKey: Bt,
  writableIndexes: rt(V()),
  readonlyIndexes: rt(V())
}), cs = Z({
  computeUnitLimit: tt(V()),
  heapSize: tt(V()),
  loadedAccountsDataSizeLimit: tt(V()),
  priorityFee: tt(V())
}), li = Z({
  signatures: rt(W()),
  message: Z({
    accountKeys: rt(W()),
    header: Z({
      numRequiredSignatures: V(),
      numReadonlySignedAccounts: V(),
      numReadonlyUnsignedAccounts: V()
    }),
    instructions: rt(Z({
      accounts: rt(V()),
      data: W(),
      programIdIndex: V()
    })),
    recentBlockhash: W(),
    addressTableLookups: ot(rt(us)),
    transactionConfig: ot(tt(cs))
  })
}), fs = Z({
  pubkey: Bt,
  signer: Se(),
  writable: Se(),
  source: ot(ue([Ot("transaction"), Ot("lookupTable")]))
}), hs = Z({
  accountKeys: rt(fs),
  signatures: rt(W())
}), ls = Z({
  parsed: sr(),
  program: W(),
  programId: Bt
}), ds = Z({
  accounts: rt(Bt),
  data: W(),
  programId: Bt
}), ld = ue([ds, ls]), dd = ue([Z({
  parsed: sr(),
  program: W(),
  programId: W()
}), Z({
  accounts: rt(W()),
  data: W(),
  programId: W()
})]), _s = Er(ld, dd, (t) => "accounts" in t ? fr(t, ds) : fr(t, ls)), ps = Z({
  signatures: rt(W()),
  message: Z({
    accountKeys: rt(fs),
    instructions: rt(_s),
    recentBlockhash: W(),
    addressTableLookups: ot(tt(rt(us))),
    transactionConfig: ot(tt(cs))
  })
}), Hr = Z({
  accountIndex: V(),
  mint: W(),
  owner: ot(W()),
  programId: ot(W()),
  uiTokenAmount: id
}), gs = Z({
  writable: rt(Bt),
  readonly: rt(Bt)
}), tn = Z({
  err: He,
  fee: V(),
  innerInstructions: ot(tt(rt(Z({
    index: V(),
    instructions: rt(Z({
      accounts: rt(V()),
      data: W(),
      programIdIndex: V()
    }))
  })))),
  preBalances: rt(V()),
  postBalances: rt(V()),
  logMessages: ot(tt(rt(W()))),
  preTokenBalances: ot(tt(rt(Hr))),
  postTokenBalances: ot(tt(rt(Hr))),
  loadedAddresses: ot(gs),
  computeUnitsConsumed: ot(V()),
  costUnits: ot(V())
}), di = Z({
  err: He,
  fee: V(),
  innerInstructions: ot(tt(rt(Z({
    index: V(),
    instructions: rt(_s)
  })))),
  preBalances: rt(V()),
  postBalances: rt(V()),
  logMessages: ot(tt(rt(W()))),
  preTokenBalances: ot(tt(rt(Hr))),
  postTokenBalances: ot(tt(rt(Hr))),
  loadedAddresses: ot(gs),
  computeUnitsConsumed: ot(V()),
  costUnits: ot(V())
}), ar = ue([Ot(0), Ot(1), Ot("legacy")]), qe = Z({
  pubkey: W(),
  lamports: V(),
  postBalance: tt(V()),
  rewardType: tt(W()),
  commission: ot(tt(V()))
});
mt(tt(Z({
  blockhash: W(),
  previousBlockhash: W(),
  parentSlot: V(),
  transactions: rt(Z({
    transaction: li,
    meta: tt(tn),
    version: ot(ar)
  })),
  rewards: ot(rt(qe)),
  blockTime: tt(V()),
  blockHeight: tt(V())
})));
mt(tt(Z({
  blockhash: W(),
  previousBlockhash: W(),
  parentSlot: V(),
  rewards: ot(rt(qe)),
  blockTime: tt(V()),
  blockHeight: tt(V())
})));
mt(tt(Z({
  blockhash: W(),
  previousBlockhash: W(),
  parentSlot: V(),
  transactions: rt(Z({
    transaction: hs,
    meta: tt(tn),
    version: ot(ar)
  })),
  rewards: ot(rt(qe)),
  blockTime: tt(V()),
  blockHeight: tt(V())
})));
mt(tt(Z({
  blockhash: W(),
  previousBlockhash: W(),
  parentSlot: V(),
  transactions: rt(Z({
    transaction: ps,
    meta: tt(di),
    version: ot(ar)
  })),
  rewards: ot(rt(qe)),
  blockTime: tt(V()),
  blockHeight: tt(V())
})));
mt(tt(Z({
  blockhash: W(),
  previousBlockhash: W(),
  parentSlot: V(),
  transactions: rt(Z({
    transaction: hs,
    meta: tt(di),
    version: ot(ar)
  })),
  rewards: ot(rt(qe)),
  blockTime: tt(V()),
  blockHeight: tt(V())
})));
mt(tt(Z({
  blockhash: W(),
  previousBlockhash: W(),
  parentSlot: V(),
  rewards: ot(rt(qe)),
  blockTime: tt(V()),
  blockHeight: tt(V())
})));
mt(tt(Z({
  blockhash: W(),
  previousBlockhash: W(),
  parentSlot: V(),
  transactions: rt(Z({
    transaction: li,
    meta: tt(tn)
  })),
  rewards: ot(rt(qe)),
  blockTime: tt(V())
})));
mt(tt(Z({
  blockhash: W(),
  previousBlockhash: W(),
  parentSlot: V(),
  signatures: rt(W()),
  blockTime: tt(V())
})));
mt(tt(Z({
  slot: V(),
  meta: tt(tn),
  blockTime: ot(tt(V())),
  transaction: li,
  version: ot(ar)
})));
mt(tt(Z({
  slot: V(),
  transaction: ps,
  meta: tt(di),
  blockTime: ot(tt(V())),
  version: ot(ar)
})));
Ee(Z({
  blockhash: W(),
  lastValidBlockHeight: V()
}));
Ee(Se());
const _d = Z({
  slot: V(),
  numTransactions: V(),
  numSlots: V(),
  samplePeriodSecs: V()
});
mt(rt(_d));
Ee(tt(Z({
  feeCalculator: Z({
    lamportsPerSignature: V()
  })
})));
mt(W());
mt(W());
const pd = Z({
  err: He,
  logs: rt(W()),
  signature: W()
});
Z({
  result: Qr(pd),
  subscription: V()
});
Object.freeze({
  CreateLookupTable: {
    index: 0,
    layout: b.struct([b.u32("instruction"), or("recentSlot"), b.u8("bumpSeed")])
  },
  FreezeLookupTable: {
    index: 1,
    layout: b.struct([b.u32("instruction")])
  },
  ExtendLookupTable: {
    index: 2,
    layout: b.struct([b.u32("instruction"), or(), b.seq(lt(), b.offset(b.u32(), -8), "addresses")])
  },
  DeactivateLookupTable: {
    index: 3,
    layout: b.struct([b.u32("instruction")])
  },
  CloseLookupTable: {
    index: 4,
    layout: b.struct([b.u32("instruction")])
  }
});
new ft("AddressLookupTab1e1111111111111111111111111");
Object.freeze({
  RequestUnits: {
    index: 0,
    layout: b.struct([b.u8("instruction"), b.u32("units"), b.u32("additionalFee")])
  },
  RequestHeapFrame: {
    index: 1,
    layout: b.struct([b.u8("instruction"), b.u32("bytes")])
  },
  SetComputeUnitLimit: {
    index: 2,
    layout: b.struct([b.u8("instruction"), b.u32("units")])
  },
  SetComputeUnitPrice: {
    index: 3,
    layout: b.struct([b.u8("instruction"), or("microLamports")])
  }
});
new ft("ComputeBudget111111111111111111111111111111");
b.struct([b.u8("numSignatures"), b.u8("padding"), b.u16("signatureOffset"), b.u16("signatureInstructionIndex"), b.u16("publicKeyOffset"), b.u16("publicKeyInstructionIndex"), b.u16("messageDataOffset"), b.u16("messageDataSize"), b.u16("messageInstructionIndex")]);
new ft("Ed25519SigVerify111111111111111111111111111");
Tl.utils.isValidPrivateKey;
b.struct([b.u8("numSignatures"), b.u16("signatureOffset"), b.u8("signatureInstructionIndex"), b.u16("ethAddressOffset"), b.u8("ethAddressInstructionIndex"), b.u16("messageDataOffset"), b.u16("messageDataSize"), b.u8("messageInstructionIndex"), b.blob(20, "ethAddress"), b.blob(64, "signature"), b.u8("recoveryId")]);
new ft("KeccakSecp256k11111111111111111111111111111");
var Rs;
new ft("StakeConfig11111111111111111111111111111111");
class Es {
  /**
   * Create a new Lockup object
   */
  constructor(e, r, n) {
    this.unixTimestamp = void 0, this.epoch = void 0, this.custodian = void 0, this.unixTimestamp = e, this.epoch = r, this.custodian = n;
  }
  /**
   * Default, inactive Lockup value
   */
}
Rs = Es;
Es.default = new Rs(0, 0, ft.default);
Object.freeze({
  Initialize: {
    index: 0,
    layout: b.struct([b.u32("instruction"), Fl(), kl()])
  },
  Authorize: {
    index: 1,
    layout: b.struct([b.u32("instruction"), lt("newAuthorized"), b.u32("stakeAuthorizationType")])
  },
  Delegate: {
    index: 2,
    layout: b.struct([b.u32("instruction")])
  },
  Split: {
    index: 3,
    layout: b.struct([b.u32("instruction"), b.ns64("lamports")])
  },
  Withdraw: {
    index: 4,
    layout: b.struct([b.u32("instruction"), b.ns64("lamports")])
  },
  Deactivate: {
    index: 5,
    layout: b.struct([b.u32("instruction")])
  },
  Merge: {
    index: 7,
    layout: b.struct([b.u32("instruction")])
  },
  AuthorizeWithSeed: {
    index: 8,
    layout: b.struct([b.u32("instruction"), lt("newAuthorized"), b.u32("stakeAuthorizationType"), Qe("authoritySeed"), lt("authorityOwner")])
  }
});
new ft("Stake11111111111111111111111111111111111111");
Object.freeze({
  InitializeAccount: {
    index: 0,
    layout: b.struct([b.u32("instruction"), Pl()])
  },
  Authorize: {
    index: 1,
    layout: b.struct([b.u32("instruction"), lt("newAuthorized"), b.u32("voteAuthorizationType")])
  },
  Withdraw: {
    index: 3,
    layout: b.struct([b.u32("instruction"), b.ns64("lamports")])
  },
  UpdateValidatorIdentity: {
    index: 4,
    layout: b.struct([b.u32("instruction")])
  },
  AuthorizeWithSeed: {
    index: 10,
    layout: b.struct([b.u32("instruction"), $l()])
  }
});
new ft("Vote111111111111111111111111111111111111111");
new ft("Va1idator1nfo111111111111111111111111111111");
Z({
  name: W(),
  website: ot(W()),
  details: ot(W()),
  iconUrl: ot(W()),
  keybaseUsername: ot(W())
});
new ft("Vote111111111111111111111111111111111111111");
b.struct([
  lt("nodePubkey"),
  lt("authorizedWithdrawer"),
  b.u8("commission"),
  b.nu64(),
  // votes.length
  b.seq(b.struct([b.nu64("slot"), b.u32("confirmationCount")]), b.offset(b.u32(), -8), "votes"),
  b.u8("rootSlotValid"),
  b.nu64("rootSlot"),
  b.nu64(),
  // authorizedVoters.length
  b.seq(b.struct([b.nu64("epoch"), lt("authorizedVoter")]), b.offset(b.u32(), -8), "authorizedVoters"),
  b.struct([b.seq(b.struct([lt("authorizedPubkey"), b.nu64("epochOfLastAuthorizedSwitch"), b.nu64("targetEpoch")]), 32, "buf"), b.nu64("idx"), b.u8("isEmpty")], "priorVoters"),
  b.nu64(),
  // epochCredits.length
  b.seq(b.struct([b.nu64("epoch"), b.nu64("credits"), b.nu64("prevCredits")]), b.offset(b.u32(), -8), "epochCredits"),
  b.struct([b.nu64("slot"), b.nu64("timestamp")], "lastTimestamp")
]);
const ro = 1232, gd = "ComputeBudget111111111111111111111111111111", Rd = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function Ed(t) {
  let e = 0n;
  for (const n of t) e = e << 8n | BigInt(n);
  let r = "";
  for (; e > 0n; e /= 58n) r = Rd[Number(e % 58n)] + r;
  for (const n of t) {
    if (n !== 0) break;
    r = "1" + r;
  }
  return r;
}
function Vn(t) {
  return [...t].map((e) => e.toString(16).padStart(2, "0")).join("");
}
function no(t) {
  return Uint8Array.from(atob(t), (e) => e.charCodeAt(0));
}
function io(t) {
  let e = 0;
  const r = (O) => {
    if (e + O > t.length) throw new Error("truncated");
    return e += O, t.subarray(e - O, e);
  }, n = () => {
    let O = 0;
    for (let B = 0; ; B += 7) {
      const k = r(1)[0];
      if (O |= (k & 127) << B, !(k & 128)) return O;
      if (B > 14) throw new Error("bad length");
    }
  }, a = Array.from({ length: n() }, () => r(64));
  if (r(1)[0] !== 128) throw new Error("not a v0 transaction");
  const [o, l, d] = r(3), _ = Array.from({ length: n() }, () => Ed(r(32))), N = Vn(r(32)), L = (O) => {
    if (O >= _.length) return `lookup#${O - _.length}`;
    const B = O < o, k = B ? O < o - l : O < _.length - d;
    return `${_[O]}:${B ? "s" : "-"}:${k ? "w" : "-"}`;
  }, x = Array.from({ length: n() }, () => {
    const O = _[r(1)[0]] ?? "unknown", B = [...r(n())].map(L);
    return { program: O, accounts: B, data: Vn(r(n())) };
  }), I = Vn(t.subarray(e));
  if (_.length === 0) throw new Error("no accounts");
  return { signatures: a, feePayer: _[0], blockhash: N, instructions: x, lookups: I };
}
const oo = (t, e) => t.program === e.program && t.data === e.data && t.accounts.join() === e.accounts.join();
function Sd(t, e) {
  let r, n;
  try {
    r = no(e), n = io(no(t));
  } catch (x) {
    return { ok: !1, problem: "unreadable", bytes: 0, detail: String(x.message) };
  }
  const a = r.length, o = (x, I) => ({
    ok: !1,
    problem: x,
    bytes: a,
    detail: I
  });
  if (a > ro)
    return o("too_large", `${a} bytes, limit ${ro}`);
  let l;
  try {
    l = io(r);
  } catch (x) {
    return o("unreadable", String(x.message));
  }
  if (l.signatures.length === 0 || l.signatures[0].every((x) => x === 0))
    return o("not_signed", "first signature is empty");
  if (l.signatures.length !== n.signatures.length) return o("changed", "signer count differs");
  if (l.feePayer !== n.feePayer) return o("changed", "fee payer differs");
  if (l.blockhash !== n.blockhash) return o("changed", "blockhash differs");
  if (l.lookups !== n.lookups) return o("changed", "address lookup tables differ");
  const d = (x) => x.instructions.filter((I) => I.program !== gd), _ = d(n), N = d(l);
  if (N.length !== _.length) {
    const x = N.find((I) => !_.some((O) => oo(O, I)));
    return o("changed", x ? `unexpected instruction for program ${x.program}` : "an instruction was removed");
  }
  for (let x = 0; x < _.length; x++)
    if (!oo(_[x], N[x]))
      return o("changed", `instruction ${x + 1} (${_[x].program}) was altered`);
  const L = (x) => x.instructions.length - d(x).length;
  return { ok: !0, bytes: a, addedComputeBudget: L(l) - L(n) };
}
function Od(t) {
  return zr.deserialize(Uint8Array.from(atob(t), (e) => e.charCodeAt(0)));
}
function vd(t) {
  return btoa(String.fromCharCode(...t.serialize()));
}
export {
  Sd as checkSignedTransaction,
  Od as deserialize,
  vd as serialize
};
