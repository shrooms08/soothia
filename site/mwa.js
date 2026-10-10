var Ni = Object.defineProperty;
var eo = (e) => {
  throw TypeError(e);
};
var Si = (e, t, r) => t in e ? Ni(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var y = (e, t, r) => Si(e, typeof t != "symbol" ? t + "" : t, r), Gn = (e, t, r) => t.has(e) || eo("Cannot " + r);
var d = (e, t, r) => (Gn(e, t, "read from private field"), r ? r.call(e) : t.get(e)), N = (e, t, r) => t.has(e) ? eo("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), V = (e, t, r, n) => (Gn(e, t, "write to private field"), n ? n.call(e, r) : t.set(e, r), r), ne = (e, t, r) => (Gn(e, t, "access private method"), r);
var Hn = (e, t, r, n) => ({
  set _(o) {
    V(e, t, o, r);
  },
  get _() {
    return d(e, t, n);
  }
});
var Ti = 1, wi = 2, Ii = 3, bi = 4, Ci = 5, yi = 6, Li = 7, vi = 8, Di = 9, xi = 10, Mi = 11, Pi = 12, Ui = 13, Bi = 14, Fi = -32700, $i = -32603, ki = -32602, Vi = -32601, Gi = -32600, Hi = -32021, qi = -32020, zi = -32019, Ki = -32018, Wi = -32017, Yi = -32016, ji = -32015, Xi = -32014, Zi = -32013, Ji = -32012, Qi = -32011, es = -32010, ts = -32009, ns = -32008, rs = -32007, os = -32006, as = -32005, is = -32004, ss = -32003, cs = -32002, ls = -32001, ds = 28e5, _s = 2800001, us = 2800002, Rs = 2800003, hs = 2800004, Es = 2800005, fs = 2800006, As = 2800007, Os = 2800008, ps = 2800009, ms = 2800010, gs = 2800011, Ns = 323e4, Ss = 32300001, Ts = 3230002, ws = 3230003, Is = 3230004, bs = 361e4, Cs = 3610001, ys = 3610002, Ls = 3610003, vs = 3610004, Ds = 3610005, xs = 3610006, Ms = 3610007, Ps = 3611e3, Us = 3704e3, Bs = 3704001, Fs = 3704002, $s = 3704003, ks = 3704004, Vs = 3704005, Gs = 3704006, Hs = 3712e3, qs = 4128e3, zs = 4128001, Ks = 4128002, mr = 4615e3, Ws = 4615001, Ys = 4615002, js = 4615003, Xs = 4615004, Zs = 4615005, Js = 4615006, Qs = 4615007, ec = 4615008, tc = 4615009, nc = 4615010, rc = 4615011, oc = 4615012, ac = 4615013, ic = 4615014, sc = 4615015, cc = 4615016, lc = 4615017, dc = 4615018, _c = 4615019, uc = 4615020, Rc = 4615021, hc = 4615022, Ec = 4615023, fc = 4615024, Ac = 4615025, Oc = 4615026, pc = 4615027, mc = 4615028, gc = 4615029, Nc = 4615030, Sc = 4615031, Tc = 4615032, wc = 4615033, Ic = 4615034, bc = 4615035, Cc = 4615036, yc = 4615037, Lc = 4615038, vc = 4615039, Dc = 4615040, xc = 4615041, Mc = 4615042, Pc = 4615043, Uc = 4615044, Bc = 4615045, Fc = 4615046, $c = 4615047, kc = 4615048, Vc = 4615049, Gc = 4615050, Hc = 4615051, qc = 4615052, zc = 4615053, Kc = 4615054, Wc = 5508e3, Yc = 5508001, jc = 5508002, Xc = 5508003, Zc = 5508004, Jc = 5508005, Qc = 5508006, el = 5508007, tl = 5508008, nl = 5508009, rl = 5508010, ol = 5508011, al = 5508012, il = 5607e3, sl = 5607001, cl = 5607002, ll = 5607003, dl = 5607004, _l = 5607005, ul = 5607006, Rl = 5607007, hl = 5607008, El = 5607009, fl = 5607010, Al = 5607011, Ol = 5607012, pl = 5607013, ml = 5607014, gl = 5607015, Nl = 5607016, Sl = 5607017, Tl = 5607018, wl = 5607019, Il = 5663e3, bl = 5663001, Cl = 5663002, yl = 5663003, Ll = 5663004, vl = 5663005, Dl = 5663006, xl = 5663007, Ml = 5663008, Pl = 5663009, Ul = 5663010, Bl = 5663011, Fl = 5663012, $l = 5663013, kl = 5663014, Vl = 5663015, Gl = 5663016, Hl = 5663017, ql = 5663018, zl = 5663019, Kl = 5663020, Wl = 5663021, Yl = 5663022, jl = 5663023, Xl = 5663024, Zl = 5663025, Jl = 5663026, Ql = 5663027, ed = 5663028, td = 5663029, nd = 5663030, rd = 5663031, od = 5663032, ad = 5663033, id = 5663034, sd = 5663035, cd = 5663036, ld = 5663037, dd = 5663038, _d = 5663039, ud = 5663040, Rd = 5664e3, hd = 5664001, Ed = 705e4, fd = 7050001, Ad = 7050002, Od = 7050003, pd = 7050004, md = 7050005, gd = 7050006, Nd = 7050007, Sd = 7050008, Td = 7050009, wd = 7050010, Id = 7050011, bd = 7050012, Cd = 7050013, yd = 7050014, Ld = 7050015, vd = 7050016, Dd = 7050017, xd = 7050018, Md = 7050019, Pd = 7050020, Ud = 7050021, Bd = 7050022, Fd = 7050023, $d = 7050024, kd = 7050025, Vd = 7050026, Gd = 7050027, Hd = 7050028, qd = 7050029, zd = 7050030, Kd = 7050031, Wd = 7050032, Yd = 7050033, jd = 7050034, Xd = 7050035, Zd = 7050036, Jd = 7618e3, Qd = 7618001, e_ = 7618002, t_ = 7618003, n_ = 7618004, r_ = 7618005, o_ = 7618006, a_ = 7618007, i_ = 7618008, s_ = 7618009, c_ = 7618010, l_ = 7618011, d_ = 7618012, __ = 8078e3, u_ = 8078001, R_ = 8078002, h_ = 8078003, E_ = 8078004, f_ = 8078005, A_ = 8078006, O_ = 8078007, p_ = 8078008, m_ = 8078009, g_ = 8078010, N_ = 8078011, on = 8078012, S_ = 8078013, T_ = 8078014, w_ = 8078015, I_ = 8078016, b_ = 8078017, C_ = 8078018, y_ = 8078019, L_ = 8078020, v_ = 8078021, D_ = 8078022, x_ = 8078023, M_ = 8078024, P_ = 8078025, wr = 8078026, _a = 8078027, U_ = 8078028, B_ = 8078029, F_ = 809e4, $_ = 8090001, k_ = 8090002, V_ = 8090003, G_ = 8090004, H_ = 8090005, q_ = 8090006, z_ = 8090007, K_ = 8090008, W_ = 8090009, Y_ = 8090010, j_ = 8090011, X_ = 8090012, Z_ = 81e5, J_ = 8100001, Q_ = 8100002, eu = 8100003, tu = 819e4, nu = 8190001, ru = 8190002, ou = 8190003, au = 8190004, iu = 8195e3, su = 8195001, cu = 85e5, lu = 8500001, du = 8500002, _u = 8500003, uu = 8500004, Ru = 8500005, hu = 8500006, Eu = 8500007, fu = 89e5, Au = 8900001, Ou = 8900002, pu = 8900003, mu = 9e6, gu = 9000001, Nu = 9000002, Su = 99e5, Tu = 9900001, wu = 9900002, Iu = 9900003, bu = 9900004, Cu = 9900005, yu = 9900006;
function ua(e) {
  return Array.isArray(e) ? "%5B" + e.map(ua).join(
    "%2C%20"
    /* ", " */
  ) + /* "]" */
  "%5D" : typeof e == "bigint" ? `${e}n` : encodeURIComponent(
    String(
      e != null && Object.getPrototypeOf(e) === null ? (
        // Plain objects with no prototype don't have a `toString` method.
        // Convert them before stringifying them.
        { ...e }
      ) : e
    )
  );
}
function Lu([e, t]) {
  return `${e}=${ua(t)}`;
}
function vu(e) {
  const t = Object.entries(e).map(Lu).join("&");
  return btoa(t);
}
var Du = {
  [Ns]: "Account not found at address: $address",
  [Is]: "Not all accounts were decoded. Encoded accounts found at addresses: $addresses.",
  [ws]: "Expected decoded account at address: $address",
  [Ts]: "Failed to decode account data at address: $address",
  [Ss]: "Accounts not found at addresses: $addresses",
  [ps]: "Unable to find a viable program address bump seed.",
  [us]: "$putativeAddress is not a base58-encoded address.",
  [ds]: "Expected base58 encoded address to decode to a byte array of length 32. Actual length: $actualLength.",
  [Rs]: "The `CryptoKey` must be an `Ed25519` public key.",
  [gs]: "$putativeOffCurveAddress is not a base58-encoded off-curve address.",
  [Os]: "Invalid seeds; point must fall off the Ed25519 curve.",
  [hs]: "Expected given program derived address to have the following format: [Address, ProgramDerivedAddressBump].",
  [fs]: "A maximum of $maxSeeds seeds, including the bump seed, may be supplied when creating an address. Received: $actual.",
  [As]: "The seed at index $index with length $actual exceeds the maximum length of $maxSeedLength bytes.",
  [Es]: "Expected program derived address bump to be in the range [0, 255], got: $bump.",
  [ms]: "Program address cannot end with PDA marker.",
  [_s]: "Expected base58-encoded address string of length in the range [32, 44]. Actual length: $actualLength.",
  [bi]: "Expected base58-encoded blockhash string of length in the range [32, 44]. Actual length: $actualLength.",
  [Ti]: "The network has progressed past the last block for which this transaction could have been committed.",
  [__]: "Codec [$codecDescription] cannot decode empty byte arrays.",
  [D_]: "Enum codec cannot use lexical values [$stringValues] as discriminators. Either remove all lexical values or set `useValuesAsDiscriminators` to `false`.",
  [L_]: "Sentinel [$hexSentinel] must not be present in encoded bytes [$hexEncodedBytes].",
  [f_]: "Encoder and decoder must have the same fixed size, got [$encoderFixedSize] and [$decoderFixedSize].",
  [A_]: "Encoder and decoder must have the same max size, got [$encoderMaxSize] and [$decoderMaxSize].",
  [E_]: "Encoder and decoder must either both be fixed-size or variable-size.",
  [p_]: "Enum discriminator out of range. Expected a number in [$formattedValidDiscriminators], got $discriminator.",
  [R_]: "Expected a fixed-size codec, got a variable-size one.",
  [S_]: "Codec [$codecDescription] expected a positive byte length, got $bytesLength.",
  [h_]: "Expected a variable-size codec, got a fixed-size one.",
  [y_]: "Codec [$codecDescription] expected zero-value [$hexZeroValue] to have the same size as the provided fixed-size item [$expectedSize bytes].",
  [u_]: "Codec [$codecDescription] expected $expected bytes, got $bytesLength.",
  [C_]: "Expected byte array constant [$hexConstant] to be present in data [$hexData] at offset [$offset].",
  [m_]: "Invalid discriminated union variant. Expected one of [$variants], got $value.",
  [g_]: "Invalid enum variant. Expected one of [$stringValues] or a number in [$formattedNumericalValues], got $variant.",
  [w_]: "Invalid literal union variant. Expected one of [$variants], got $value.",
  [O_]: "Expected [$codecDescription] to have $expected items, got $actual.",
  [on]: "Invalid value $value for base $base with alphabet $alphabet.",
  [wr]: "Invalid UTF-8 byte sequence at offset $offset.",
  [_a]: "Invalid UTF-8 string. Found a lone surrogate at index $index.",
  [I_]: "Literal union discriminator out of range. Expected a number between $minRange and $maxRange, got $discriminator.",
  [N_]: "Codec [$codecDescription] expected number to be in the range [$min, $max], got $value.",
  [T_]: "Codec [$codecDescription] expected offset to be in the range [0, $bytesLength], got $offset.",
  [U_]: "Codec [$codecDescription] expected sentinel [$hexSentinel] to terminate the collection, but reached the end of the byte array without it.",
  [v_]: "Expected sentinel [$hexSentinel] to be present in decoded bytes [$hexDecodedBytes].",
  [B_]: "The sentinel must not be empty.",
  [b_]: "Union variant out of range. Expected an index between $minRange and $maxRange, got $variant.",
  [x_]: "This decoder expected a byte array of exactly $expectedLength bytes, but $numExcessBytes unexpected excess bytes remained after decoding. Are you sure that you have chosen the correct decoder for this data?",
  [M_]: "Invalid pattern match value. The provided value does not match any of the specified patterns.",
  [P_]: "Invalid pattern match bytes. The provided byte array does not match any of the specified patterns.",
  [Ps]: "No random values implementation could be found.",
  [Mi]: "Failed to send transaction$causeMessage",
  [Pi]: "Failed to send transactions$causeMessages",
  [Ui]: "Failed to sign transaction$causeMessage",
  [Bi]: "Failed to sign transactions$causeMessages",
  [z_]: "Fixed-point operation `$operation` of kind `$kind` overflowed. Expected a raw bigint in [$min, $max], got $result.",
  [W_]: "Fixed-point division by zero for value of kind `$kind` ($signedness, $totalBits bits).",
  [V_]: "`fractionalBits` ($fractionalBits) must not exceed `totalBits` ($totalBits).",
  [k_]: "Invalid `decimals`. Expected a non-negative integer, got $decimals.",
  [$_]: "Invalid `fractionalBits`. Expected a non-negative integer, got $fractionalBits.",
  [H_]: "Invalid string `$input` for fixed-point value of kind `$kind`.",
  [F_]: "Invalid `totalBits`. Expected a positive integer, got $totalBits.",
  [q_]: "Invalid ratio $numerator/$denominator for fixed-point value of kind `$kind`. Denominator must be non-zero.",
  [j_]: "Fixed-point value of kind `$kind` has a malformed `raw` field. Expected a bigint, got `$raw`.",
  [K_]: "Fixed-point `$operation` operation expected $expectedKind ($expectedSignedness, $expectedTotalBits bits, $expectedScale $expectedScaleLabel); got $actualKind ($actualSignedness, $actualTotalBits bits, $actualScale $actualScaleLabel).",
  [Y_]: "Fixed-point operation `$operation` of kind `$kind` cannot be performed exactly; pass a rounding mode other than `strict` to allow a rounded result.",
  [X_]: "Fixed-point codec of kind `$kind` requires `totalBits` to be a multiple of 8; got $totalBits.",
  [G_]: "Fixed-point value of kind `$kind` is out of range for $signedness $totalBits-bit storage. Expected a raw bigint in [$min, $max], got $raw.",
  [Hs]: "Filesystem operation `$operation` is not supported in this environment.",
  [tc]: "Instruction requires an uninitialized account",
  [Ec]: "Instruction tries to borrow reference for an account which is already borrowed",
  [fc]: "Instruction left account with an outstanding borrowed reference",
  [Rc]: "Program other than the account's owner changed the size of the account data",
  [Zs]: "Account data too small for instruction",
  [hc]: "Instruction expected an executable account",
  [Fc]: "An account does not have enough lamports to be rent-exempt",
  [kc]: "Program arithmetic overflowed",
  [Bc]: "Failed to serialize or deserialize account data",
  [Kc]: "Builtin programs must consume compute units",
  [Tc]: "Cross-program invocation call depth too deep",
  [Lc]: "Computational budget exceeded",
  [Oc]: "Custom program error: #$code",
  [lc]: "Instruction contains duplicate accounts",
  [Ac]: "Instruction modifications of multiply-passed account differ",
  [Nc]: "Executable accounts must be rent exempt",
  [mc]: "Instruction changed executable accounts data",
  [gc]: "Instruction changed the balance of an executable account",
  [dc]: "Instruction changed executable bit of an account",
  [ic]: "Instruction modified data of an account it does not own",
  [ac]: "Instruction spent from the balance of an account it does not own",
  [Ws]: "Generic instruction error",
  [Gc]: "Provided owner is not allowed",
  [Pc]: "Account is immutable",
  [Uc]: "Incorrect authority provided",
  [Qs]: "Incorrect program id for instruction",
  [Js]: "Insufficient funds for instruction",
  [Xs]: "Invalid account data for instruction",
  [$c]: "Invalid account owner",
  [Ys]: "Invalid program argument",
  [pc]: "Program returned invalid error code",
  [js]: "Invalid instruction data",
  [yc]: "Failed to reallocate account data",
  [Cc]: "Provided seeds do not result in a valid address",
  [Hc]: "Accounts data allocations exceeded the maximum allowed per transaction",
  [qc]: "Max accounts exceeded",
  [zc]: "Max instruction trace length exceeded",
  [bc]: "Length of the seed is too long for address generation",
  [wc]: "An account required by the instruction is missing",
  [ec]: "Missing required signature for instruction",
  [oc]: "Instruction illegally modified the program id of an account",
  [uc]: "Insufficient account keys for instruction",
  [vc]: "Cross-program invocation with unauthorized signer or writable account",
  [Dc]: "Failed to create program execution environment",
  [Mc]: "Program failed to compile",
  [xc]: "Program failed to complete",
  [cc]: "Instruction modified data of a read-only account",
  [sc]: "Instruction changed the balance of a read-only account",
  [Ic]: "Cross-program invocation reentrancy not allowed for this instruction",
  [_c]: "Instruction modified rent epoch of an account",
  [rc]: "Sum of account balances before and after instruction do not match",
  [nc]: "Instruction requires an initialized account",
  [mr]: "The instruction failed with the error: $errorName",
  [Sc]: "Unsupported program id",
  [Vc]: "Unsupported sysvar",
  [Cu]: "Invalid instruction plan kind: $kind.",
  [e_]: "The provided instruction plan is empty.",
  [r_]: "No failed transaction plan result was found in the provided transaction plan result.",
  [n_]: "This transaction plan executor does not support non-divisible sequential plans. To support them, you may create your own executor such that multi-transaction atomicity is preserved — e.g. by targetting RPCs that support transaction bundles.",
  [t_]: "The provided transaction plan failed to execute. See the `transactionPlanResult` attribute for more details. Note that the `cause` property is deprecated, and a future version will not set it.",
  [l_]: "The configured maximum of $maxInstructions instructions per transaction is invalid. It must be a positive integer no greater than the transaction format limit of $transactionInstructionLimit instructions per transaction. Provide a `maxInstructionsPerTransaction` (on the transaction planner) or `maxInstructions` (on the message packer) value between 1 and $transactionInstructionLimit.",
  [c_]: "Planning this transaction message would require $numInstructions instructions, which exceeds the configured maximum of $maxInstructions instructions per transaction. This limit is configurable, and intended to leave headroom for inner instructions which are included in the maximum instruction limit for transactions. Increase `maxInstructionsPerTransaction` on the transaction planner (or `maxInstructions` on the message packer) to allow more instructions per transaction.",
  [Jd]: "The provided message has insufficient capacity to accommodate the next instruction(s) in this plan. Expected at least $numBytesRequired free byte(s), got $numFreeBytes byte(s).",
  [yu]: "Invalid transaction plan kind: $kind.",
  [Qd]: "No more instructions to pack; the message packer has completed the instruction plan.",
  [d_]: "The message packer rejected the provided transaction message: $reason.",
  [o_]: "Unexpected instruction plan. Expected $expectedKind plan, got $actualKind plan.",
  [a_]: "Unexpected transaction plan. Expected $expectedKind plan, got $actualKind plan.",
  [i_]: "Unexpected transaction plan result. Expected $expectedKind plan, got $actualKind plan.",
  [s_]: "Expected a successful transaction plan result. I.e. there is at least one failed or cancelled transaction in the plan.",
  [qs]: "The instruction does not have any accounts.",
  [zs]: "The instruction does not have any data.",
  [Ks]: "Expected instruction to have progress address $expectedProgramAddress, got $actualProgramAddress.",
  [Ci]: "Expected base58 encoded blockhash to decode to a byte array of length 32. Actual length: $actualLength.",
  [wi]: "The nonce `$expectedNonceValue` is no longer valid. It has advanced to `$actualNonceValue`",
  [wu]: "Invariant violation: Found no abortable iterable cache entry for key `$cacheKey`. It should be impossible to hit this error; please file an issue at https://sola.na/web3invariant",
  [bu]: "Invariant violation: This data publisher does not publish to the channel named `$channelName`. Supported channels include $supportedChannelNames.",
  [Tu]: "Invariant violation: WebSocket message iterator state is corrupt; iterated without first resolving existing message promise. It should be impossible to hit this error; please file an issue at https://sola.na/web3invariant",
  [Su]: "Invariant violation: WebSocket message iterator is missing state storage. It should be impossible to hit this error; please file an issue at https://sola.na/web3invariant",
  [Iu]: "Invariant violation: Switch statement non-exhaustive. Received unexpected value `$unexpectedValue`. It should be impossible to hit this error; please file an issue at https://sola.na/web3invariant",
  [$i]: "JSON-RPC error: Internal JSON-RPC error ($__serverMessage)",
  [ki]: "JSON-RPC error: Invalid method parameter(s) ($__serverMessage)",
  [Gi]: "JSON-RPC error: The JSON sent is not a valid `Request` object ($__serverMessage)",
  [Vi]: "JSON-RPC error: The method does not exist / is not available ($__serverMessage)",
  [Fi]: "JSON-RPC error: An error occurred on the server while parsing the JSON text ($__serverMessage)",
  [Ji]: "$__serverMessage",
  [ls]: "$__serverMessage",
  [is]: "$__serverMessage",
  [Xi]: "$__serverMessage",
  [Wi]: "Epoch rewards period still active at slot $slot",
  [qi]: "$__serverMessage",
  [es]: "$__serverMessage",
  [ts]: "$__serverMessage",
  [zi]: "Failed to query long-term storage; please try again",
  [Yi]: "Minimum context slot has not been reached",
  [as]: "Node is unhealthy; behind by $numSlotsBehind slots",
  [Hi]: "No slot history",
  [ns]: "No snapshot",
  [cs]: "Transaction simulation failed",
  [Ki]: "Rewards cannot be found because slot $slot is not the epoch boundary. This may be due to gap in the queried node's local ledger or long-term storage",
  [rs]: "$__serverMessage",
  [Qi]: "Transaction history is not available from this node",
  [os]: "$__serverMessage",
  [Zi]: "Transaction signature length mismatch",
  [ss]: "Transaction signature verification failure",
  [ji]: "$__serverMessage",
  [Vs]: "The grind regex `/$source/` contains the character `$character`, which is not in the base58 alphabet and can never match a Solana address.",
  [Us]: "Key pair bytes must be of length 64, got $byteLength.",
  [Bs]: "Expected private key bytes with length 32. Actual length: $actualLength.",
  [Fs]: "Expected base58-encoded signature to decode to a byte array of length 64. Actual length: $actualLength.",
  [ks]: "The provided private key does not match the provided public key.",
  [$s]: "Expected base58-encoded signature string of length in the range [64, 88]. Actual length: $actualLength.",
  [Gs]: "Writing a key pair to disk is not supported in this environment.",
  [yi]: "Lamports value must be in the range [0, 2e64-1]",
  [Li]: "`$value` cannot be parsed as a `BigInt`",
  [xi]: "$message",
  [vi]: "`$value` cannot be parsed as a `Number`",
  [Ii]: "No nonce account could be found at address `$nonceAccountAddress`",
  [ll]: "Expected base58 encoded application domain to decode to a byte array of length 32. Actual length: $actualLength.",
  [pl]: "Attempted to sign an offchain message with an address that is not a signer for it",
  [cl]: "Expected base58-encoded application domain string of length in the range [32, 44]. Actual length: $actualLength.",
  [Tl]: "The content of the offchain message does not match the content that was expected. Expected content with a byte-length of $expectedBytes; got content with a byte-length of $actualBytes. The signer may have signed different data than was requested; do not trust its signature.",
  [Ol]: "The signer addresses in this offchain message envelope do not match the list of required signers in the message preamble. These unexpected signers were present in the envelope: `[$unexpectedSigners]`. These required signers were missing from the envelope `[$missingSigners]`.",
  [il]: "The message body provided has a byte-length of $actualBytes. The maximum allowable byte-length is $maxBytes",
  [Rl]: "Expected message format $expectedMessageFormat, got $actualMessageFormat",
  [hl]: "The message length specified in the message preamble is $specifiedLength bytes. The actual length of the message is $actualLength bytes.",
  [El]: "Offchain message content must be non-empty",
  [_l]: "Offchain message must specify the address of at least one required signer",
  [fl]: "Offchain message envelope must reserve space for at least one signature",
  [dl]: "The offchain message preamble specifies $numRequiredSignatures required signature(s), got $signaturesLength.",
  [wl]: "The offchain message lists different required signatories than was expected. Expected [$expectedAddresses]. Got [$actualAddresses]. The signer may have signed different data than was requested; do not trust its signature.",
  [gl]: "The signatories of this offchain message must be listed in lexicographical order",
  [Nl]: "An address must be listed no more than once among the signatories of an offchain message",
  [Al]: "Offchain message is missing signatures for addresses: $addresses.",
  [Sl]: "Offchain message signature verification failed. Signature mismatch for required signatories [$signatoriesWithInvalidSignatures]. Missing signatures for signatories [$signatoriesWithMissingSignatures]",
  [sl]: "The message body provided contains characters whose codes fall outside the allowed range. In order to ensure clear-signing compatiblity with hardware wallets, the message may only contain line feeds and characters in the range [\\x20-\\x7e].",
  [ml]: "Expected offchain message version $expectedVersion. Got $actualVersion.",
  [ul]: "This version of Kit does not support decoding offchain messages with version $unsupportedVersion. The current max supported version is 0.",
  [hu]: "The provided account could not be identified as an account from the $programName program.",
  [du]: "The provided instruction could not be identified as an instruction from the $programName program.",
  [cu]: "The provided instruction is missing some accounts. Expected at least $expectedAccountMetas account(s), got $actualAccountMetas.",
  [uu]: "Expected resolved instruction input '$inputName' to be non-null.",
  [Eu]: "Expected resolved instruction input '$inputName' to be a `TransactionSigner` because the instruction requires this account to sign the transaction. If its signature is provided by other means, use `createNoopSigner()` from `@solana/signers` to satisfy this requirement.",
  [_u]: "Expected resolved instruction input '$inputName' to be of type `$expectedType`.",
  [Ru]: "Unrecognized account type '$accountType' for the $programName program.",
  [lu]: "Unrecognized instruction type '$instructionType' for the $programName program.",
  [tu]: "The notification name must end in 'Notifications' and the API must supply a subscription plan creator function for the notification '$notificationName'.",
  [ru]: "WebSocket was closed before payload could be added to the send buffer",
  [ou]: "WebSocket connection closed",
  [au]: "WebSocket failed to connect",
  [nu]: "Failed to obtain a subscription id from the server",
  [eu]: "Could not find an API plan for RPC method: `$method`",
  [Z_]: "The $argumentLabel argument to the `$methodName` RPC method$optionalPathLabel was `$value`. This number is unsafe for use with the Solana JSON-RPC because it exceeds `Number.MAX_SAFE_INTEGER`.",
  [Q_]: "HTTP error ($statusCode): $message",
  [J_]: "HTTP header(s) forbidden: $headers. Learn more at https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name.",
  [Wc]: "Multiple distinct signers were identified for address `$address`. Please ensure that you are using the same signer instance for each address.",
  [Yc]: "The provided value does not implement the `KeyPairSigner` interface",
  [Xc]: "The provided value does not implement the `MessageModifyingSigner` interface",
  [Zc]: "The provided value does not implement the `MessagePartialSigner` interface",
  [jc]: "The provided value does not implement any of the `MessageSigner` interfaces",
  [Qc]: "The provided value does not implement the `TransactionModifyingSigner` interface",
  [el]: "The provided value does not implement the `TransactionPartialSigner` interface",
  [tl]: "The provided value does not implement the `TransactionSendingSigner` interface",
  [Jc]: "The provided value does not implement any of the `TransactionSigner` interfaces",
  [nl]: "More than one `TransactionSendingSigner` was identified.",
  [rl]: "No `TransactionSendingSigner` was identified. Please provide a valid `TransactionWithSingleSendingSigner` transaction.",
  [al]: "The wallet account $address cannot be used to create a transaction signer because it does not implement either the `solana:signTransaction` or `solana:signAndSendTransaction` feature. At least one of these features is required. The account supports the following features: $supportedFeatures.",
  [ol]: "Wallet account signers do not support signing multiple messages/transactions in a single operation",
  [iu]: "This `ReactiveStreamStore` does not support retry. Use `createReactiveStoreFromDataPublisherFactory` to construct a retryable store.",
  [su]: "The stream store closed in an error state but did not report an error.",
  [Ms]: "Cannot export a non-extractable key.",
  [Cs]: "No digest implementation could be found.",
  [bs]: "Cryptographic operations are only allowed in secure browser contexts. Read more here: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts.",
  [ys]: `This runtime does not support the generation of Ed25519 key pairs.

Install @solana/webcrypto-ed25519-polyfill and call its \`install\` function before generating keys in environments that do not support Ed25519.

For a list of runtimes that currently support Ed25519 operations, visit https://github.com/WICG/webcrypto-secure-curves/issues/20.`,
  [Ls]: "No key export implementation could be found.",
  [vs]: "No key generation implementation could be found.",
  [Ds]: "No signing implementation could be found.",
  [xs]: "No signature verification implementation could be found.",
  [Di]: "Timestamp value must be in the range [-(2n ** 63n), (2n ** 63n) - 1]. `$value` given",
  [vd]: "Transaction processing left an account with an outstanding borrowed reference",
  [fd]: "Account in use",
  [Ad]: "Account loaded twice",
  [Od]: "Attempt to debit an account but found no record of a prior credit.",
  [Fd]: "Transaction loads an address table account that doesn't exist",
  [Nd]: "This transaction has already been processed",
  [Sd]: "Blockhash not found",
  [Td]: "Loader call chain is too deep",
  [Ld]: "Transactions are currently disabled due to cluster maintenance",
  [zd]: "Transaction contains a duplicate instruction ($index) that is not allowed",
  [md]: "Insufficient funds for fee",
  [Kd]: "Transaction results in an account ($accountIndex) with insufficient funds for rent",
  [gd]: "This account may not be used to pay transaction fees",
  [Id]: "Transaction contains an invalid account reference",
  [kd]: "Transaction loads an address table account with invalid data",
  [Vd]: "Transaction address table lookup uses an invalid index",
  [$d]: "Transaction loads an address table account with an invalid owner",
  [Yd]: "LoadedAccountsDataSizeLimit set for transaction must be greater than 0.",
  [Cd]: "This program may not be used for executing instructions",
  [Gd]: "Transaction leaves an account with a lower balance than rent-exempt minimum",
  [Md]: "Transaction loads a writable account that cannot be written",
  [Wd]: "Transaction exceeded max loaded accounts data size cap",
  [wd]: "Transaction requires a fee but has no signature present",
  [pd]: "Attempt to load a program that does not exist",
  [Xd]: "Execution of the program referenced by account at index $accountIndex is temporarily restricted.",
  [jd]: "ResanitizationNeeded",
  [yd]: "Transaction failed to sanitize accounts offsets correctly",
  [bd]: "Transaction did not pass signature verification",
  [Bd]: "Transaction locked too many accounts",
  [Zd]: "Sum of account balances before and after transaction do not match",
  [Ed]: "The transaction failed with the error `$errorName`",
  [xd]: "Transaction version is unsupported",
  [Ud]: "Transaction would exceed account data limit within the block",
  [qd]: "Transaction would exceed total account data limit",
  [Pd]: "Transaction would exceed max account limit within the block",
  [Dd]: "Transaction would exceed max Block Cost Limit",
  [Hd]: "Transaction would exceed max Vote Cost Limit",
  [Vl]: "Attempted to sign a transaction with an address that is not a signer for it",
  [Ul]: "Transaction is missing an address at index: $index.",
  [Gl]: "Transaction has no expected signers therefore it cannot be encoded",
  [_d]: "Transaction compute unit limit must be an integer in the range [0, $maxComputeUnitLimit]. `$computeUnitLimit` given",
  [Kl]: "Transaction size $transactionSize exceeds limit of $transactionSizeLimit bytes",
  [Cl]: "Transaction does not have a blockhash lifetime",
  [yl]: "Transaction is not a durable nonce transaction",
  [vl]: "Contents of these address lookup tables unknown: $lookupTableAddresses",
  [Dl]: "Lookup of address at index $highestRequestedIndex failed for lookup table `$lookupTableAddress`. Highest known index is $highestKnownIndex. The lookup table may have been extended since its contents were retrieved",
  [Ml]: "No fee payer set in CompiledTransaction",
  [xl]: "Could not find program address at index $index",
  [ql]: "Failed to estimate the compute unit consumption for this transaction message. This is likely because simulating the transaction failed. Inspect the `cause` property of this error to learn more",
  [cd]: "Failed to estimate the loaded accounts data size for this transaction message. The RPC did not return a `loadedAccountsDataSize` value from simulation. This value is required for version 1 transactions",
  [zl]: "Transaction failed when it was simulated in order to estimate the compute unit consumption. The compute unit estimate provided is for a transaction that failed when simulated and may not be representative of the compute units this transaction would consume if successful. Inspect the `cause` property of this error to learn more",
  [ld]: "Transaction failed when it was simulated in order to estimate its resource limits. The resource limit estimates provided are for a transaction that failed when simulated and may not be representative of the resources this transaction would consume if successful. Inspect the `cause` property of this error to learn more",
  [Bl]: "Transaction is missing a fee payer.",
  [Fl]: "Could not determine this transaction's signature. Make sure that the transaction has been signed by its fee payer.",
  [kl]: "Transaction first instruction is not advance nonce account instruction.",
  [$l]: "Transaction with no instructions cannot be durable nonce transaction.",
  [Il]: "This transaction includes an address (`$programAddress`) which is both invoked and set as the fee payer. Program addresses may not pay fees",
  [bl]: "This transaction includes an address (`$programAddress`) which is both invoked and marked writable. Program addresses may not be writable",
  [Hl]: "The transaction message expected the transaction to have $numRequiredSignatures signatures, got $signaturesLength.",
  [Pl]: "Transaction is missing signatures for addresses: $addresses.",
  [Ll]: "Transaction version must be in the range [0, 127]. `$actualVersion` given",
  [Wl]: "This version of Kit does not support decoding transactions with version $unsupportedVersion. The current max supported version is 1.",
  [Yl]: "The transaction has a durable nonce lifetime (with nonce `$nonce`), but the nonce account address is in a lookup table. The lifetime constraint cannot be constructed without fetching the lookup tables for the transaction.",
  [ed]: "Invalid transaction config mask: $mask. Bits 0 and 1 must match (both set or both unset)",
  [jl]: "Transaction message bytes are malformed: $messageBytes",
  [Xl]: "Transaction message bytes are empty, so the transaction cannot be encoded",
  [Zl]: "Transaction bytes are empty, so no transaction can be decoded",
  [Jl]: "Transaction version 0 must be encoded with signatures first. This transaction was encoded with first byte $firstByte, which is expected to be a signature count for v0 transactions.",
  [Ql]: "The provided transaction bytes expect that there should be $numExpectedSignatures signatures, but the bytes are not long enough to contain a transaction message with this many signatures. The provided bytes are $transactionBytesLength bytes long.",
  [ud]: "Transaction heap size must be an integer multiple of $multipleOf bytes in the range [$minHeapSize, $maxHeapSize]. `$heapSize` given",
  [td]: "The transaction has a durable nonce lifetime, but the nonce account index is invalid. Expected a nonce account index less than $numberOfStaticAccounts, got $nonceAccountIndex.",
  [nd]: "The transaction config value for $configName has the incorrect kind. Expected $expectedKind, got $actualKind.",
  [rd]: "The transaction does not have the same number of instruction headers and instruction payloads. Got $numInstructionHeaders instruction headers, and $numInstructionPayloads instruction payloads.",
  [od]: "Transaction has $actualCount unique signer addresses but the maximum allowed is $maxAllowed",
  [ad]: "Transaction has $actualCount unique account addresses but the maximum allowed is $maxAllowed",
  [id]: "Transaction has $actualCount instructions but the maximum allowed is $maxAllowed",
  [sd]: "The instruction at index $instructionIndex has $actualCount account references but the maximum allowed is $maxAllowed",
  [dd]: "Could not find an account address at index $index while decompiling an instruction",
  [Rd]: "`getTransaction` responses fetched with `encoding: 'jsonParsed'` cannot be decoded. Re-fetch the transaction with `encoding: 'base64'`, `'base58'`, or `'json'`",
  [hd]: "Could not recognize the shape of this `getTransaction` response. Expected a response fetched with `encoding: 'base64'`, `'base58'`, or `'json'`",
  [gu]: "`$hookName` requires the following capabilities to be installed on the client: [$capabilities]. $providerHint",
  [mu]: "`$hookName` was called outside of a `ClientProvider`. Mount a `<ClientProvider client={client}>` in the ancestor tree.",
  [Nu]: "The subscription closed in an error state but did not report an error.",
  [fu]: "Cannot $operation: no wallet connected",
  [Au]: "No signing wallet connected (status: $status)",
  [Ou]: "Connected wallet does not support signing",
  [pu]: 'Account $address is not available in wallet "$walletName"'
}, xu = 1e3, Ne = "i", Oe = "t";
function Mu(e, t = {}) {
  const r = Du[e];
  if (r.length === 0)
    return "";
  let n;
  function o(s) {
    if (n[Oe] === 2) {
      const c = r.slice(n[Ne] + 1, s);
      a.push(
        c in t ? (
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `${t[c]}`
        ) : `$${c}`
      );
    } else n[Oe] === 1 && a.push(r.slice(n[Ne], s));
  }
  const a = [];
  r.split("").forEach((s, c) => {
    if (c === 0) {
      n = {
        [Ne]: 0,
        [Oe]: r[0] === "\\" ? 0 : r[0] === "$" ? 2 : 1
        /* Text */
      };
      return;
    }
    let l;
    switch (n[Oe]) {
      case 0:
        l = {
          [Ne]: c,
          [Oe]: 1
          /* Text */
        };
        break;
      case 1:
        s === "\\" ? l = {
          [Ne]: c,
          [Oe]: 0
          /* EscapeSequence */
        } : s === "$" && (l = {
          [Ne]: c,
          [Oe]: 2
          /* Variable */
        });
        break;
      case 2:
        s === "\\" ? l = {
          [Ne]: c,
          [Oe]: 0
          /* EscapeSequence */
        } : s === "$" ? l = {
          [Ne]: c,
          [Oe]: 2
          /* Variable */
        } : s.match(/\w/) || (l = {
          [Ne]: c,
          [Oe]: 1
          /* Text */
        });
        break;
    }
    l && (n !== l && o(c), n = l);
  }), o();
  let i = a.join("");
  return e >= mr && e < mr + xu && "index" in t && (i += ` (instruction #${t.index + 1})`), i;
}
function Pu(e, t = {}) {
  if (process.env.NODE_ENV !== "production")
    return Mu(e, t);
  {
    let r = `Solana error #${e}; Decode this error by running \`npx @solana/errors decode -- ${e}`;
    return Object.keys(t).length && (r += ` '${vu(t)}'`), `${r}\``;
  }
}
var Ot = class extends Error {
  constructor(...[t, r]) {
    let n, o;
    r && Object.entries(Object.getOwnPropertyDescriptors(r)).forEach(([i, s]) => {
      i === "cause" ? o = { cause: s.value } : (n === void 0 && (n = {
        __code: t
      }), Object.defineProperty(n, i, s));
    });
    const a = Pu(t, n);
    super(a, o);
    /**
     * Indicates the root cause of this {@link SolanaError}, if any.
     *
     * For example, a transaction error might have an instruction error as its root cause. In this
     * case, you will be able to access the instruction error on the transaction error as `cause`.
     */
    y(this, "cause", this.cause);
    /**
     * Contains context that can assist in understanding or recovering from a {@link SolanaError}.
     */
    y(this, "context");
    this.context = Object.freeze(
      n === void 0 ? {
        __code: t
      } : n
    ), this.name = "SolanaError";
  }
};
function Uu(e, t) {
  return "fixedSize" in t ? t.fixedSize : t.getSizeFromValue(e);
}
function Ir(e) {
  return Object.freeze({
    ...e,
    encode: (t) => {
      const r = new Uint8Array(Uu(t, e));
      return e.write(t, r, 0), r;
    }
  });
}
function br(e) {
  return Object.freeze({
    ...e,
    decode: (t, r = 0) => e.read(t, r)[0]
  });
}
function Bu(e, t, r = t) {
  if (!t.match(new RegExp(`^[${e}]*$`)))
    throw new Ot(on, {
      alphabet: e,
      base: e.length,
      value: r
    });
}
function Fu(e) {
  const t = e.isWellFormed;
  if (!(typeof t == "function" && t.call(e)))
    for (let r = 0; r < e.length; r++) {
      const n = e.charCodeAt(r);
      if (n < 55296 || n > 57343) continue;
      const o = e.charCodeAt(r + 1);
      if (n <= 56319 && o >= 56320 && o <= 57343) {
        r++;
        continue;
      }
      throw new Ot(_a, { index: r, value: e });
    }
}
function Ra(e, t = 0) {
  const r = e.length;
  let n = t;
  for (; n < r; ) {
    const o = e[n];
    let a, i = 128, s = 191;
    if (o < 128) {
      n++;
      continue;
    } else if (o >= 194 && o <= 223)
      a = 1;
    else if (o >= 224 && o <= 239)
      a = 2, o === 224 && (i = 160), o === 237 && (s = 159);
    else if (o >= 240 && o <= 244)
      a = 3, o === 240 && (i = 144), o === 244 && (s = 143);
    else
      return n;
    const c = n;
    n++;
    for (let l = 0; l < a; l++, n++) {
      if (n >= r)
        return c;
      const _ = e[n];
      if (!(l === 0 ? _ >= i && _ <= s : _ >= 128 && _ <= 191))
        return c;
    }
  }
  return -1;
}
function $u(e, t = 0) {
  const r = Ra(e, t);
  if (r !== -1)
    throw new Ot(wr, { bytes: e, offset: r });
}
var ku = (e) => Ir({
  getSizeFromValue: (t) => {
    const [r, n] = to(t, e[0]);
    if (!n) return t.length;
    const o = no(n, e);
    return r.length + Math.ceil(o.toString(16).length / 2);
  },
  write(t, r, n) {
    if (Bu(e, t), t === "") return n;
    const [o, a] = to(t, e[0]);
    if (!a)
      return r.set(new Uint8Array(o.length).fill(0), n), n + o.length;
    let i = no(a, e);
    const s = [];
    for (; i > 0n; )
      s.unshift(Number(i % 256n)), i /= 256n;
    const c = [...Array(o.length).fill(0), ...s];
    return r.set(c, n), n + c.length;
  }
}), Vu = (e) => br({
  read(t, r) {
    const n = r === 0 || r <= -t.byteLength ? t : t.slice(r);
    if (n.length === 0) return ["", t.length];
    let o = n.findIndex((c) => c !== 0);
    o = o === -1 ? n.length : o;
    const a = e[0].repeat(o);
    if (o === n.length) return [a, t.length];
    const i = n.slice(o).reduce((c, l) => c * 256n + BigInt(l), 0n), s = Gu(i, e);
    return [a + s, t.length];
  }
});
function to(e, t) {
  const [r, n] = e.split(new RegExp(`((?!${t}).*)`));
  return [r, n];
}
function no(e, t) {
  const r = BigInt(t.length);
  let n = 0n;
  for (const o of e)
    n *= r, n += BigInt(t.indexOf(o));
  return n;
}
function Gu(e, t) {
  const r = BigInt(t.length), n = [];
  for (; e > 0n; )
    n.unshift(t[Number(e % r)]), e /= r;
  return n.join("");
}
var ha = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", Hu = () => ku(ha), qu = () => Vu(ha), ro = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", oo = 32768;
function zu(e) {
  let t = "";
  for (let r = 0; r < e.length; r += oo)
    t += String.fromCharCode(...e.subarray(r, r + oo));
  return t;
}
var Ku = () => Ir({
  getSizeFromValue: (e) => {
    try {
      return atob(e).length;
    } catch {
      throw new Ot(on, {
        alphabet: ro,
        base: 64,
        value: e
      });
    }
  },
  write(e, t, r) {
    try {
      const n = atob(e).split("").map((o) => o.charCodeAt(0));
      return t.set(n, r), n.length + r;
    } catch {
      throw new Ot(on, {
        alphabet: ro,
        base: 64,
        value: e
      });
    }
  }
}), Ea = () => br({
  read(e, t = 0) {
    return [btoa(zu(e.subarray(t))), e.length];
  }
}), Wu = (e) => (
  // eslint-disable-next-line no-control-regex
  e.replace(/\u0000/g, "")
), Yu = globalThis.TextDecoder, ao = globalThis.TextEncoder, fa = (e = {}) => {
  let t;
  return Ir({
    getSizeFromValue: (r) => (t || (t = new ao())).encode(r).length,
    write: (r, n, o) => {
      e.fatal && Fu(r);
      const a = (t || (t = new ao())).encode(r);
      return n.set(a, o), o + a.length;
    }
  });
}, ju = (e = {}) => {
  let t;
  return br({
    read(r, n) {
      t || (t = new Yu("utf-8", {
        fatal: e.fatal ?? !1,
        ignoreBOM: e.ignoreBOM ?? !1
      }));
      let o = e.fatal ? Xu(t, r, n) : t.decode(r.slice(n));
      return !e.ignoreBOM && t.ignoreBOM === void 0 && o.charCodeAt(0) === 65279 && (o = o.slice(1)), e.removeNullCharacters !== !1 && (o = Wu(o)), [o, r.length];
    }
  });
};
function Xu(e, t, r) {
  const n = t.slice(r);
  if (!e.fatal)
    return $u(t, r), e.decode(n);
  try {
    return e.decode(n);
  } catch {
    throw new Ot(wr, {
      bytes: t,
      offset: Ra(t, r)
    });
  }
}
function Zu(e) {
  return Ea().decode(fa().encode(e));
}
function Ce(e, t) {
  const r = Ea().decode(e);
  return t ? r.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : r;
}
function pt(e) {
  return Ku().encode(e);
}
function Aa(e) {
  return qu().decode(e);
}
function Ju(e) {
  return Hu().encode(e);
}
function Qu(e) {
  return Aa(pt(e));
}
function Cr(e) {
  return Ce(new Uint8Array(e));
}
function an(e) {
  return Aa(e);
}
function eR(e) {
  return Ju(e);
}
function Be(e) {
  return Ce(e);
}
function ce(e) {
  return pt(e);
}
function tR(e) {
  return ju().decode(e);
}
function nR(e) {
  return fa().encode(e);
}
const io = "solana:mainnet";
var rR = function(e, t, r, n) {
  if (r === "a" && !n) throw new TypeError("Private accessor was defined without a getter");
  if (typeof t == "function" ? e !== t || !n : !t.has(e)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return r === "m" ? n : r === "a" ? n.call(e) : n ? n.value : t.get(e);
}, oR = function(e, t, r, n, o) {
  if (n === "m") throw new TypeError("Private method is not writable");
  if (n === "a" && !o) throw new TypeError("Private accessor was defined without a setter");
  if (typeof t == "function" ? e !== t || !o : !t.has(e)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return n === "a" ? o.call(e, r) : o ? o.value = r : t.set(e, r), r;
}, tn;
function qn(e) {
  const t = ({ register: r }) => r(e);
  try {
    window.dispatchEvent(new aR(t));
  } catch (r) {
    console.error(`wallet-standard:register-wallet event could not be dispatched
`, r);
  }
  try {
    window.addEventListener("wallet-standard:app-ready", ({ detail: r }) => t(r));
  } catch (r) {
    console.error(`wallet-standard:app-ready event listener could not be added
`, r);
  }
}
class aR extends Event {
  get detail() {
    return rR(this, tn, "f");
  }
  get type() {
    return "wallet-standard:register-wallet";
  }
  constructor(t) {
    super("wallet-standard:register-wallet", {
      bubbles: !1,
      cancelable: !1,
      composed: !1
    }), tn.set(this, void 0), oR(this, tn, t, "f");
  }
  /** @deprecated */
  preventDefault() {
    throw new Error("preventDefault cannot be called");
  }
  /** @deprecated */
  stopImmediatePropagation() {
    throw new Error("stopImmediatePropagation cannot be called");
  }
  /** @deprecated */
  stopPropagation() {
    throw new Error("stopPropagation cannot be called");
  }
}
tn = /* @__PURE__ */ new WeakMap();
const iR = (e) => e / 2 ** 32 | 0, sR = (e) => e >>> 0;
function cR(e, t, r, n) {
  const o = iR(r), a = sR(r);
  e.setUint32(t, n ? a : o, n), e.setUint32(t + 4, n ? o : a, n);
}
function gr(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
const Nr = (e) => e ? `"${e}" ` : "";
function Un(e, t = "") {
  if (typeof e != "number")
    throw new TypeError(Nr(t) + "expected number, got " + typeof e);
  if (!Number.isSafeInteger(e) || e < 0)
    throw new RangeError(Nr(t) + "expected integer >= 0, got " + e);
  return e;
}
function St(e, t, r = "") {
  if (gr(e) && (t === void 0 || e.length === t))
    return e;
  t !== void 0 && Un(t, "length");
  const n = gr(e), o = t !== void 0 ? ` of length ${t}` : "", a = n ? `length=${e.length}` : `type=${typeof e}`, i = Nr(r) + "expected Uint8Array" + o + ", got " + a;
  throw n ? new RangeError(i) : new TypeError(i);
}
const lR = (e, t) => {
  if (e === null || typeof e != "object" || Array.isArray(e))
    throw new TypeError((t === "object" ? "" : `"${t}" `) + "expected object, got type=" + typeof e);
}, so = (e, t) => {
  lR(e, t);
  const r = Object.getPrototypeOf(e);
  if (r !== Object.prototype && r !== null)
    throw new TypeError(`"${t}" expected plain object`);
  if (Object.hasOwn(e, "__proto__"))
    throw new TypeError(`"${t}.__proto__" is not allowed`);
};
function co(e, t = !0) {
  if (e.destroyed)
    throw new Error("hash was destroyed");
  if (t && e.finished)
    throw new Error("digest() was already called");
}
function dR(e, t) {
  St(e, void 0, "output");
  const r = t.outputLen;
  if (!(e.length >= r))
    throw new RangeError('"output" expected length >= ' + r);
}
function lo(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function zn(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function pe(e, t) {
  return e << 32 - t | e >>> t;
}
const Oa = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", _R = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function ke(e) {
  if (St(e), Oa)
    return e.toHex();
  let t = "";
  for (let r = 0; r < e.length; r++)
    t += _R[e[r]];
  return t;
}
function _o(e) {
  return e >= 48 && e <= 57 ? e - 48 : e >= 65 && e <= 70 ? e - 55 : e >= 97 && e <= 102 ? e - 87 : void 0;
}
function it(e) {
  if (typeof e != "string")
    throw new TypeError("hex string expected, got " + typeof e);
  if (Oa)
    try {
      return Uint8Array.fromHex(e);
    } catch (o) {
      throw o instanceof SyntaxError ? new RangeError(o.message) : o;
    }
  const t = e.length, r = t / 2;
  if (t % 2)
    throw new RangeError("hex string expected, got unpadded hex of length " + t);
  const n = new Uint8Array(r);
  for (let o = 0, a = 0; o < r; o++, a += 2) {
    const i = _o(e.charCodeAt(a)), s = _o(e.charCodeAt(a + 1));
    if (i === void 0 || s === void 0) {
      const c = e[a] + e[a + 1];
      throw new RangeError('hex string expected, got non-hex character "' + c + '" at index ' + a);
    }
    n[o] = i * 16 + s;
  }
  return n;
}
function uR(...e) {
  let t = 0;
  for (let n = 0; n < e.length; n++) {
    const o = e[n];
    St(o), t += o.length;
  }
  const r = new Uint8Array(t);
  for (let n = 0, o = 0; n < e.length; n++) {
    const a = e[n];
    r.set(a, o), o += a.length;
  }
  return r;
}
function RR(e, t, r = "opts") {
  return so(e, "defaults"), t !== void 0 && so(t, r), Object.assign(/* @__PURE__ */ Object.create(null), e, t);
}
function hR(e, t = {}) {
  if (typeof e != "function")
    throw new TypeError('"hashCons" expected function, got type=' + typeof e);
  t = RR({}, t, "info");
  const r = (o, a) => e(a).update(o).digest(), n = e(void 0);
  return r.outputLen = n.outputLen, r.blockLen = n.blockLen, r.canXOF = n.canXOF, r.create = (o) => e(o), Object.assign(r, t), Object.freeze(r);
}
function yr(e = 32) {
  Un(e, "bytesLength");
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  if (e > 65536)
    throw new RangeError(`"bytesLength" expected <= 65536, got ${e}`);
  return t.getRandomValues(new Uint8Array(e));
}
const ER = (e) => ({
  // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
  // Larger suffix values would need base-128 OID encoding and a different length byte.
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function fR(e, t, r) {
  return e & t ^ ~e & r;
}
function AR(e, t, r) {
  return e & t ^ e & r ^ t & r;
}
class OR {
  constructor(t, r, n, o) {
    y(this, "blockLen");
    y(this, "outputLen");
    y(this, "canXOF", !1);
    y(this, "padOffset");
    y(this, "isLE");
    // For partial updates less than block size
    y(this, "buffer");
    y(this, "view");
    y(this, "finished", !1);
    y(this, "length", 0);
    y(this, "pos", 0);
    y(this, "destroyed", !1);
    this.blockLen = t, this.outputLen = r, this.padOffset = n, this.isLE = o, this.buffer = new Uint8Array(t), this.view = zn(this.buffer);
  }
  update(t) {
    co(this), St(t);
    const { view: r, buffer: n, blockLen: o } = this, a = t.length;
    let i = !1;
    for (let s = 0; s < a; ) {
      const c = Math.min(o - this.pos, a - s);
      if (c === o) {
        const l = zn(t);
        for (; o <= a - s; s += o)
          this.process(l, s);
        i = !0;
        continue;
      }
      n.set(s === 0 && c === a ? t : t.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === o && (this.process(r, 0), this.pos = 0, i = !0);
    }
    return this.length += t.length, i && this.roundClean(), this;
  }
  digestInto(t) {
    co(this), dR(t, this), this.finished = !0;
    const { buffer: r, view: n, blockLen: o, isLE: a } = this;
    let { pos: i } = this;
    r[i++] = 128, r.fill(0, i), this.padOffset > o - i && (this.process(n, 0), r.fill(0)), cR(n, o - 8, this.length * 8, a), this.process(n, 0), this.roundClean();
    const s = t === r ? n : zn(t), c = this.outputLen, l = c / 4, _ = this.get();
    if (c % 4 || l > _.length)
      throw new Error("invalid outputLen");
    for (let E = 0; E < l; E++)
      s.setUint32(4 * E, _[E], a);
  }
  digest() {
    const { buffer: t, outputLen: r } = this;
    this.digestInto(t);
    const n = t.slice(0, r);
    return this.destroy(), n;
  }
  _cloneIntoMeta(t) {
    const { buffer: r, length: n, finished: o, destroyed: a, pos: i } = this;
    return t.destroyed = a, t.finished = o, t.length = n, t.pos = i, i && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
}
const pR = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), mR = /* @__PURE__ */ Uint32Array.from([
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
]), ye = /* @__PURE__ */ new Uint32Array(64);
class gR extends OR {
  constructor(r, n) {
    super(64, r, 8, !1);
    // We cannot use array here since array allows indexing by variable
    // which means optimizer/compiler cannot use registers.
    // Numeric initializers matter: starting the fields as `undefined` changes
    // V8's field representation and makes sha256 3x slower (measured).
    y(this, "A", 0);
    y(this, "B", 0);
    y(this, "C", 0);
    y(this, "D", 0);
    y(this, "E", 0);
    y(this, "F", 0);
    y(this, "G", 0);
    y(this, "H", 0);
    this.A = n[0] | 0, this.B = n[1] | 0, this.C = n[2] | 0, this.D = n[3] | 0, this.E = n[4] | 0, this.F = n[5] | 0, this.G = n[6] | 0, this.H = n[7] | 0;
  }
  get() {
    const { A: r, B: n, C: o, D: a, E: i, F: s, G: c, H: l } = this;
    return [r, n, o, a, i, s, c, l];
  }
  // prettier-ignore
  set(r, n, o, a, i, s, c, l) {
    this.A = r | 0, this.B = n | 0, this.C = o | 0, this.D = a | 0, this.E = i | 0, this.F = s | 0, this.G = c | 0, this.H = l | 0;
  }
  _cloneInto(r) {
    return (r || (r = new this.constructor())).set(...this.get()), this._cloneIntoMeta(r);
  }
  process(r, n) {
    for (let h = 0; h < 16; h++, n += 4)
      ye[h] = r.getUint32(n, !1);
    for (let h = 16; h < 64; h++) {
      const u = ye[h - 15], A = ye[h - 2], g = pe(u, 7) ^ pe(u, 18) ^ u >>> 3, v = pe(A, 17) ^ pe(A, 19) ^ A >>> 10;
      ye[h] = v + ye[h - 7] + g + ye[h - 16] | 0;
    }
    let { A: o, B: a, C: i, D: s, E: c, F: l, G: _, H: E } = this;
    for (let h = 0; h < 64; h++) {
      const u = pe(c, 6) ^ pe(c, 11) ^ pe(c, 25), A = E + u + fR(c, l, _) + mR[h] + ye[h] | 0, v = (pe(o, 2) ^ pe(o, 13) ^ pe(o, 22)) + AR(o, a, i) | 0;
      E = _, _ = l, l = c, c = s + A | 0, s = i, i = a, a = o, o = A + v | 0;
    }
    o = o + this.A | 0, a = a + this.B | 0, i = i + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, l = l + this.F | 0, _ = _ + this.G | 0, E = E + this.H | 0, this.set(o, a, i, s, c, l, _, E);
  }
  roundClean() {
    lo(ye);
  }
  destroy() {
    this.destroyed = !0, this.set(0, 0, 0, 0, 0, 0, 0, 0), lo(this.buffer);
  }
}
class NR extends gR {
  constructor() {
    super(32, pR);
  }
}
const sn = /* @__PURE__ */ hR(
  () => new NR(),
  /* @__PURE__ */ ER(1)
);
function pa(e, t, r = () => {
}) {
  if (!Array.isArray(e))
    throw new TypeError(`"${t}" expected array, got type=${typeof e}`);
  for (let n = 0; n < e.length; n++)
    r(e[n], `${t}[${n}]`);
  return e;
}
const he = (e, t, r) => St(e, t, r), ma = Un;
function st(e, t = "object") {
  if (e === null || typeof e != "object" || Array.isArray(e))
    throw new TypeError(t === "object" ? "expected valid options object" : `"${t}" expected object, got type=${typeof e}`);
  return e;
}
function bt(e, t) {
  if (typeof e != "function")
    throw new TypeError(`"${t}" is invalid: expected function, got ${typeof e}`);
  return e;
}
const SR = ke, cn = (...e) => uR(...e), TR = (e) => it(e), ga = gr, wR = (e) => yr(e), ln = /* @__PURE__ */ BigInt(0), uo = /* @__PURE__ */ BigInt(1), IR = (e) => e ? `"${e}" ` : "";
function Lt(e, t = "") {
  if (typeof e != "boolean")
    throw new TypeError(IR(t) + "expected boolean, got type=" + typeof e);
  return e;
}
function bR(e) {
  if (typeof e == "bigint") {
    if (!Qe(e))
      throw new RangeError("positive bigint expected, got " + e);
  } else
    ma(e);
  return e;
}
function Sr(e, t = "") {
  if (typeof e != "number") {
    const r = t && `"${t}" `;
    throw new TypeError(r + "expected number, got type=" + typeof e);
  }
  if (!Number.isSafeInteger(e)) {
    const r = t && `"${t}" `;
    throw new RangeError(r + "expected safe integer, got " + e);
  }
}
function Na(e) {
  if (typeof e != "string")
    throw new TypeError("hex string expected, got " + typeof e);
  return e === "" ? ln : BigInt("0x" + e);
}
function Bn(e) {
  return Na(ke(e));
}
function Sa(e) {
  return Na(ke(wa(St(e)).reverse()));
}
function Lr(e, t) {
  if (Un(t), t === 0)
    throw new Error("zero output length is invalid");
  e = bR(e);
  const r = t * 2, n = e.toString(16);
  if (n.length > r)
    throw new RangeError("number is too large");
  return it(n.padStart(r, "0"));
}
function Ta(e, t) {
  return Lr(e, t).reverse();
}
function wa(e) {
  return Uint8Array.from(he(e));
}
function CR(e) {
  if (typeof e != "string")
    throw new TypeError("ascii string expected, got " + typeof e);
  return Uint8Array.from(e, (t, r) => {
    const n = t.charCodeAt(0);
    if (t.length !== 1 || n > 127)
      throw new RangeError(`string contains non-ASCII character "${e[r]}" with code ${n} at position ${r}`);
    return n;
  });
}
function Qe(e) {
  return typeof e == "bigint" && ln <= e;
}
function Ia(e, t, r) {
  return Qe(e) && Qe(t) && Qe(r) && t <= e && e < r;
}
function yR(e, t, r, n) {
  if (!Ia(t, r, n))
    throw new RangeError("expected valid " + e + ": " + r + " <= n < " + n + ", got " + t);
}
function vr(e) {
  if (e < ln)
    throw new Error("expected non-negative bigint, got " + e);
  return e === ln ? 0 : e.toString(2).length;
}
const ba = (e) => (Sr(e, "n"), (uo << BigInt(e)) - uo);
function Ca(e, t = {}, r = {}, n = "object") {
  st(e, n), st(t, "fields"), st(r, "optFields");
  function o(i, s, c) {
    const l = n === "object" ? `param "${String(i)}"` : `"${n}.${String(i)}"`, _ = e[i];
    if (!Object.hasOwn(e, i) && (c ? _ !== void 0 : s !== "function"))
      throw new TypeError(`${l} is invalid: expected own property`);
    if (c && _ === void 0)
      return;
    const E = typeof _;
    if (E !== s || _ === null)
      throw new TypeError(`${l} is invalid: expected ${s}, got ${E}`);
  }
  const a = (i, s) => Object.entries(i).forEach(([c, l]) => o(c, l, s));
  a(t, !1), a(r, !0);
}
const re = /* @__PURE__ */ BigInt(0), Z = /* @__PURE__ */ BigInt(1), He = /* @__PURE__ */ BigInt(2), ya = /* @__PURE__ */ BigInt(3), Dr = /* @__PURE__ */ BigInt(4), La = /* @__PURE__ */ BigInt(5), LR = /* @__PURE__ */ BigInt(7), va = /* @__PURE__ */ BigInt(8), vR = /* @__PURE__ */ BigInt(9), DR = /* @__PURE__ */ BigInt(15), Da = /* @__PURE__ */ BigInt(16), xR = /* @__PURE__ */ BigInt("0x10000000000000000");
function fe(e, t) {
  if (t <= re)
    throw new Error("mod: expected positive modulus, got " + t);
  const r = e % t;
  return r >= re ? r : t + r;
}
function MR(e, t, r) {
  if (r <= Z)
    throw new Error("pow: expected modulus > 1, got " + r);
  if (typeof t != "bigint")
    throw new TypeError("invalid exponent: expected bigint, got " + typeof t);
  if (t < re)
    throw new Error("invalid exponent, negatives unsupported");
  if (t === re)
    return Z;
  if (t === Z)
    return e;
  let n = e % r;
  if (n < re && (n += r), t < xR) {
    let s = Z;
    for (; t > re; )
      t & Z && (s = s * n % r), n = n * n % r, t >>= Z;
    return s;
  }
  const o = [];
  for (; t > re; )
    o.push(Number(t & DR)), t >>= Dr;
  const a = new Array(16);
  a[0] = Z, a[1] = n;
  for (let s = 2; s < 16; s++)
    a[s] = a[s - 1] * n % r;
  let i = a[o[o.length - 1]];
  for (let s = o.length - 2; s >= 0; s--) {
    i = i * i % r, i = i * i % r, i = i * i % r, i = i * i % r;
    const c = o[s];
    c !== 0 && (i = i * a[c] % r);
  }
  return i;
}
function ue(e, t, r) {
  if (r <= Z)
    throw new Error("pow2: expected modulus > 1, got " + r);
  if (t < re)
    throw new Error("pow2: expected non-negative exponent, got " + t);
  let n = e;
  for (; t-- > re; )
    n *= n, n %= r;
  return n;
}
function Ro(e, t) {
  if (e === re)
    throw new Error("invert: expected non-zero number");
  if (t <= Z)
    throw new Error("invert: expected modulus > 1, got " + t);
  let r = fe(e, t), n = t, o = re, a = Z;
  for (; r !== re; ) {
    const s = n / r, c = n - r * s, l = o - a * s;
    n = r, r = c, o = a, a = l;
  }
  if (n !== Z)
    throw new Error("invert: does not exist");
  return fe(o, t);
}
function xr(e, t, r) {
  const n = e;
  if (!n.eql(n.sqr(t), r))
    throw new Error("Cannot find square root");
}
function Mr(e, t) {
  if ((e & Z) === re)
    throw new Error(t + ": expected odd modulus, got " + e);
}
function xa(e, t) {
  const r = e, n = (r.ORDER + Z) / Dr, o = r.pow(t, n);
  return xr(r, o, t), o;
}
function PR(e, t) {
  const r = e, n = (r.ORDER - La) / va, o = r.mul(t, He), a = r.pow(o, n), i = r.mul(t, a), s = r.mul(r.mul(i, He), a), c = r.mul(i, r.sub(s, r.ONE));
  return xr(r, c, t), c;
}
function UR(e) {
  const t = Fn(e), r = Ma(e), n = r(t, t.neg(t.ONE)), o = r(t, n), a = r(t, t.neg(n)), i = (e + LR) / Da;
  return ((s, c) => {
    const l = s;
    let _ = l.pow(c, i), E = l.mul(_, n);
    const h = l.mul(_, o), u = l.mul(_, a), A = l.eql(l.sqr(E), c), g = l.eql(l.sqr(h), c);
    _ = l.cmov(_, E, A), E = l.cmov(u, h, g);
    const v = l.eql(l.sqr(E), c), S = l.cmov(_, E, v);
    return xr(l, S, c), S;
  });
}
function Ma(e) {
  if (e < ya)
    throw new Error("sqrt is not defined for small field");
  Mr(e, "tonelliShanks");
  let t = e - Z, r = 0;
  for (; t % He === re; )
    t /= He, r++;
  let n = He;
  const o = Fn(e);
  for (; ho(o, n) === 1; )
    if (n++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (r === 1)
    return xa;
  let a = o.pow(n, t);
  const i = (t + Z) / He;
  return function(c, l) {
    const _ = c;
    if (_.is0(l))
      return l;
    if (ho(_, l) !== 1)
      throw new Error("Cannot find square root");
    let E = r, h = _.mul(_.ONE, a), u = _.pow(l, t), A = _.pow(l, i);
    for (; !_.eql(u, _.ONE); ) {
      if (_.is0(u))
        throw new Error("Cannot find square root: probably non-prime P");
      let g = 1, v = _.sqr(u);
      for (; !_.eql(v, _.ONE); )
        if (g++, v = _.sqr(v), g === E)
          throw new Error("Cannot find square root");
      const S = Z << BigInt(E - g - 1), D = _.pow(h, S);
      E = g, h = _.sqr(D), u = _.mul(u, h), A = _.mul(A, D);
    }
    return A;
  };
}
function BR(e) {
  return Mr(e, "Fp.sqrt"), e % Dr === ya ? xa : e % va === La ? PR : e % Da === vR ? UR(e) : Ma(e);
}
const FR = [
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
function vt(e) {
  if (st(e, "field"), typeof e.ORDER != "bigint")
    throw new TypeError('param "ORDER" is invalid: expected bigint, got ' + typeof e.ORDER);
  Sr(e.BYTES, "BYTES"), Sr(e.BITS, "BITS");
  for (const t of FR)
    bt(e[t], "field." + t);
  if (e.BYTES < 1 || e.BITS < 1)
    throw new Error("invalid field: expected BYTES/BITS > 0");
  if (e.ORDER <= Z)
    throw new Error("invalid field: expected ORDER > 1, got " + e.ORDER);
  return e;
}
function Pa(e, t, r = !1) {
  vt(e), pa(t, "nums"), Lt(r, "passZero");
  const n = e, o = new Array(t.length).fill(r ? n.ZERO : void 0), a = t.reduce((s, c, l) => n.is0(c) ? s : (o[l] = s, n.mul(s, c)), n.ONE), i = n.inv(a);
  return t.reduceRight((s, c, l) => n.is0(c) ? s : (o[l] = n.mul(s, o[l]), n.mul(s, c)), i), o;
}
function ho(e, t) {
  vt(e);
  const r = e;
  Mr(r.ORDER, "FpLegendre");
  const n = (r.ORDER - Z) / He, o = r.pow(t, n), a = r.eql(o, r.ONE), i = r.eql(o, r.ZERO), s = r.eql(o, r.neg(r.ONE));
  if (!a && !i && !s)
    throw new Error("invalid Legendre symbol result");
  return a ? 1 : i ? 0 : -1;
}
function $R(e, t) {
  if (t !== void 0 && ma(t), e <= re)
    throw new Error("invalid n length: expected positive n, got " + e);
  if (t !== void 0 && t < 1)
    throw new Error("invalid n length: expected positive bit length, got " + t);
  const r = vr(e);
  if (t !== void 0 && t < r)
    throw new Error(`invalid n length: expected nBitLength (${t}) >= bitLen(n) (${r})`);
  const n = t !== void 0 ? t : r, o = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: o };
}
const Eo = /* @__PURE__ */ new WeakMap();
class fo {
  constructor(t, r = {}) {
    y(this, "ORDER");
    y(this, "BITS");
    y(this, "BYTES");
    y(this, "isLE");
    y(this, "ZERO", re);
    y(this, "ONE", Z);
    y(this, "_lengths");
    y(this, "_mod");
    if (t <= Z)
      throw new Error("invalid field: expected ORDER > 1, got " + t);
    let n;
    this.isLE = !1, r != null && typeof r == "object" && (typeof r.BITS == "number" && (n = r.BITS), typeof r.sqrt == "function" && Object.defineProperty(this, "sqrt", { value: r.sqrt, enumerable: !0 }), typeof r.isLE == "boolean" && (this.isLE = r.isLE), r.allowedLengths && (this._lengths = Object.freeze(r.allowedLengths.slice())), typeof r.modFromBytes == "boolean" && (this._mod = r.modFromBytes));
    const { nBitLength: o, nByteLength: a } = $R(t, n);
    if (a > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = o, this.BYTES = a, Object.freeze(this);
  }
  create(t) {
    return fe(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new TypeError("invalid field element: expected bigint, got " + typeof t);
    return re <= t && t < this.ORDER;
  }
  is0(t) {
    return t === re;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & Z) === Z;
  }
  neg(t) {
    return fe(-t, this.ORDER);
  }
  eql(t, r) {
    return t === r;
  }
  sqr(t) {
    return fe(t * t, this.ORDER);
  }
  add(t, r) {
    return fe(t + r, this.ORDER);
  }
  sub(t, r) {
    return fe(t - r, this.ORDER);
  }
  mul(t, r) {
    return fe(t * r, this.ORDER);
  }
  pow(t, r) {
    return MR(t, r, this.ORDER);
  }
  div(t, r) {
    return fe(t * Ro(r, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(t) {
    return t * t;
  }
  addN(t, r) {
    return t + r;
  }
  subN(t, r) {
    return t - r;
  }
  mulN(t, r) {
    return t * r;
  }
  inv(t) {
    return Ro(t, this.ORDER);
  }
  sqrt(t) {
    let r = Eo.get(this);
    return r || Eo.set(this, r = BR(this.ORDER)), r(this, t);
  }
  toBytes(t) {
    return this.isLE ? Ta(t, this.BYTES) : Lr(t, this.BYTES);
  }
  fromBytes(t, r = !1) {
    he(t);
    const { _lengths: n, BYTES: o, isLE: a, ORDER: i, _mod: s } = this;
    if (n) {
      if (t.length < 1 || !n.includes(t.length) || t.length > o)
        throw new Error("Field.fromBytes: expected " + n + " bytes, got " + t.length);
      const l = new Uint8Array(o);
      l.set(t, a ? 0 : l.length - t.length), t = l;
    }
    if (t.length !== o)
      throw new Error("Field.fromBytes: expected " + o + " bytes, got " + t.length);
    let c = a ? Sa(t) : Bn(t);
    if (s && (c = fe(c, i)), !r && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Pa(this, t, !0);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, r, n) {
    return Lt(n, "condition"), n ? r : t;
  }
}
function Fn(e, t = {}) {
  return Object.freeze(fo.prototype), new fo(e, t);
}
function Ua(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  if (e <= Z)
    throw new Error("field order must be greater than 1");
  const t = vr(e - Z);
  return Math.ceil(t / 8);
}
function kR(e) {
  const t = Ua(e);
  return t + Math.ceil(t / 2);
}
function VR(e, t, r = !1) {
  he(e);
  const n = e.length, o = Ua(t), a = Math.max(kR(t), 16);
  if (n < a || n > 1024)
    throw new Error("expected " + a + "-1024 bytes of input, got " + n);
  const i = r ? Sa(e) : Bn(e), s = fe(i, t - Z) + Z;
  return r ? Ta(s, o) : Lr(s, o);
}
const Pr = /* @__PURE__ */ BigInt(0), Dt = /* @__PURE__ */ BigInt(1), GR = /* @__PURE__ */ BigInt(4), Kn = 16, Ao = 128, HR = 5, Oo = 2 ** 31;
function Ur(e) {
  const t = e;
  if (typeof t != "function")
    throw new TypeError('"Point" expected constructor, got type=' + typeof e);
  bt(t.fromAffine, "Point.fromAffine"), bt(t.fromBytes, "Point.fromBytes"), bt(t.fromHex, "Point.fromHex"), st(t.BASE, "Point.BASE"), st(t.ZERO, "Point.ZERO"), vt(t.Fp), vt(t.Fn);
}
function qR(e, t) {
  Ur(e), Ba(t, e);
  const r = Pa(e.Fp, t.map((n) => n.Z));
  return t.map((n, o) => e.fromAffine(n.toAffine(r[o])));
}
function zR(e, t, r = 1) {
  if (!Number.isSafeInteger(e) || e < r || e > t)
    throw new Error("invalid window size, expected [" + r + ".." + t + "], got W=" + e);
}
function KR(e, t) {
  const r = e * (4 * t + 128);
  if (r > Oo)
    throw new Error("invalid window size: table would need ~" + Math.ceil(r / 2 ** 20) + " MiB, max " + Oo / 2 ** 20 + " MiB");
}
function WR(e, t) {
  if (e !== void 0) {
    bt(e, "randomBytes");
    try {
      const r = e(t);
      if (!ga(r) || r.length !== t)
        return;
    } catch {
      return;
    }
    return e;
  }
}
function Ba(e, t) {
  pa(e, "points"), e.forEach((r, n) => {
    if (!(r instanceof t))
      throw new Error("invalid point at index " + n);
  });
}
function YR(e, t, r) {
  if (!Array.isArray(e))
    throw new Error("array of scalars expected");
  e.forEach((n, o) => {
    if (!(r === void 0 ? t.isValid(n) : Qe(n) && n < r))
      throw new Error("invalid scalar at index " + o);
  });
}
const Fa = /* @__PURE__ */ new WeakMap();
function Wn(e) {
  return Fa.get(e) || 1;
}
function jR(e, t) {
  const r = e.double(), n = [e];
  for (let o = 1; o < t; o++)
    n.push(n[o - 1].add(r));
  return n;
}
function XR(e, t) {
  const r = 2 ** t, n = r / 2, o = BigInt(r - 1), a = [];
  for (; e > Pr; ) {
    let i = 0;
    e & Dt && (i = Number(e & o), i >= n && (i -= r), e -= BigInt(i)), a.push(i), e >>= Dt;
  }
  return a;
}
function ZR(e, t, r) {
  const n = 2 ** t, o = n / 2, a = BigInt(n - 1), i = BigInt(t), s = [];
  for (let c = 0; c < r; c++) {
    let l = Number(e & a);
    e >>= i, l > o && (l -= n, e += Dt), s.push(l);
  }
  if (e !== Pr)
    throw new Error("invalid wnaf");
  return s;
}
function JR(e, t, r) {
  let n = 0;
  for (const a of r)
    n = Math.max(n, a.length);
  let o = e;
  for (let a = n - 1; a >= 0; a--) {
    a !== n - 1 && (o = o.double());
    for (let i = 0; i < r.length; i++) {
      const s = r[i][a];
      if (s) {
        const c = t[i][Math.abs(s) - 1 >> 1];
        o = o.add(s < 0 ? c.negate() : c);
      }
    }
  }
  return o;
}
class QR {
  // Parametrized with a given Point class (not individual point)
  constructor(t, r) {
    y(this, "Point");
    y(this, "BASE");
    y(this, "ZERO");
    y(this, "randomBytes");
    y(this, "wnafPrecomputes", /* @__PURE__ */ new WeakMap());
    y(this, "baseCanBeBlinded");
    y(this, "bits");
    Ur(t), this.randomBytes = WR(r, Kn), this.Point = t, this.BASE = t.BASE, this.ZERO = t.ZERO, this.bits = t.Fn.BITS;
  }
  /**
   * Creates a signed fixed-window wNAF precomputation table: for every window w, the
   * multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
   * so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
   * window absorbs the final carry of signed-digit recoding.
   * For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
   * @param point - Point instance
   * @param W - window size
   * @param bits - scalar bitlength the table must cover
   */
  buildWnafTable(t, r, n) {
    const o = Math.ceil(n / r) + 1, a = 2 ** (r - 1), i = [];
    let s = t;
    for (let c = 0; c < o; c++) {
      let l = s;
      for (let _ = 0; _ < a; _++)
        i.push(l), l = l.add(s);
      s = i[i.length - 1].double();
    }
    return { W: r, bits: n, windows: o, comp: i };
  }
  /**
   * Implements ec multiplication using precomputed signed fixed-window wNAF tables.
   * Constant-time: fixed window count with one table addition per window — zero digits feed
   * the fake accumulator — and no doublings; the lookup scans the whole window slice.
   * Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
   * {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
   * signedWindowDigits throws if `n` exceeds the table.
   * @returns real and fake (for const-time) points
   */
  wnafCachedCT(t, r) {
    const { W: n, windows: o, comp: a } = t, i = 2 ** (n - 1), s = ZR(r, n, o);
    let c = this.ZERO, l = this.BASE;
    for (let _ = 0; _ < o; _++) {
      const E = s[_], h = _ * i, u = Math.abs(E) - 1;
      let A = a[h];
      for (let v = 1; v < i; v++)
        A = v === u ? a[h + v] : A;
      const g = A.negate();
      E === 0 ? l = l.add(a[h]) : c = c.add(E < 0 ? g : A);
    }
    return { p: c, f: l };
  }
  // Cache key is point identity plus (W, bits); at most two entries exist per point (public-width
  // `Fn.BITS` and blinded `Fn.BITS + BLIND_BITS`). Callers must not reuse the same point with
  // incompatible `transform(...)` layouts and expect a separate cache entry.
  getWnafPrecomputes(t, r, n, o) {
    let a = this.wnafPrecomputes.get(r), i = a?.find((s) => s.W === t && s.bits === n);
    return i || (i = this.buildWnafTable(r, t, n), typeof o == "function" && (i = { ...i, comp: o(i.comp) }), a || (a = [], this.wnafPrecomputes.set(r, a)), a.push(i)), i;
  }
  assertPoint(t) {
    if (!(t instanceof this.Point))
      throw new TypeError('"point" expected Point instance, got type=' + typeof t);
  }
  // Shared prologue of the constant-time entry points. Rejects scalar 0: in key/signature-style
  // callers a zero scalar means broken upstream plumbing, and concrete Points already reject it.
  // Uses inRange instead of Fn.isValidNot0: validateField() only certifies the arithmetic subset.
  validateMulInput(t, r) {
    if (this.assertPoint(t), !Ia(r, Dt, this.Point.Fn.ORDER))
      throw new Error("invalid scalar");
  }
  // Constant-time dispatch shared by mulCT / mulCTBlinded. Un-precomputed points (W===1, e.g.
  // ECDH peer keys) skip building a throwaway cached table in favor of a small fixed-window
  // multiply. `n` must be < 2^bits.
  runCT(t, r, n, o) {
    const a = Wn(t);
    return a === 1 ? this.fixedWindowCT(t, r, n) : this.wnafCachedCT(this.getWnafPrecomputes(a, t, n, o), r);
  }
  mulCT(t, r, n) {
    return this.validateMulInput(t, r), this.runCT(t, r, this.bits, n);
  }
  mulCTBlinded(t, r, n) {
    if (this.validateMulInput(t, r), this.randomBytes === void 0)
      throw new Error("randomBytes is required for scalar blinding");
    const o = this.Point.Fn.BITS + Ao, a = this.randomBytes(Kn);
    if (!ga(a) || a.length !== Kn)
      throw new Error("randomBytes returned invalid byte array");
    a[0] = a[0] & 63 | 128;
    const i = r + Bn(a) * this.Point.Fn.ORDER;
    return this.runCT(t, i, o, n);
  }
  /**
   * Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
   * A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
   * far cheaper to build for a single use. The point-operation sequence is independent of `n`:
   * build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
   * every table entry, and one addition (adds the identity when the window digit is 0 — never
   * skipped).
   *
   * `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
   * add), which holds for the Weierstrass/Edwards point types used here. The table is left in
   * projective form (no normalizeZ): normalizing this small a table costs more than the
   * mixed-add savings it would buy for a single multiply.
   * @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
   * (this path needs no fake accumulator — its op-count is already scalar-independent).
   */
  fixedWindowCT(t, r, n) {
    const o = HR, a = 1 << o, i = ba(o), s = new Array(a);
    s[0] = this.ZERO;
    for (let _ = 1; _ < a; _++)
      s[_] = s[_ - 1].add(t);
    const c = Math.ceil(n / o);
    let l = this.ZERO;
    for (let _ = c - 1; _ >= 0; _--) {
      if (_ !== c - 1)
        for (let u = 0; u < o; u++)
          l = l.double();
      const E = Number(r >> BigInt(_ * o) & i);
      let h = s[0];
      for (let u = 1; u < a; u++)
        h = u === E ? s[u] : h;
      l = l.add(h);
    }
    return { p: l, f: l };
  }
  shouldBlind(t, r) {
    return this.randomBytes === void 0 ? !1 : r === Dt ? !0 : t !== this.BASE ? !1 : (this.baseCanBeBlinded === void 0 && (this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0()), this.baseCanBeBlinded);
  }
  mulSecret(t, r, n, o) {
    return this.shouldBlind(t, n) ? this.mulCTBlinded(t, r, o) : this.mulCT(t, r, o);
  }
  mulUnsafe(t, r, n) {
    if (this.assertPoint(t), !Qe(r))
      throw new Error("invalid scalar");
    const o = Wn(t);
    if (o === 1 || r >= this.Point.Fn.ORDER)
      return Tr(this.Point, [t], [r], !0);
    const a = this.getWnafPrecomputes(o, t, this.bits, n);
    return this.wnafCachedCT(a, r).p;
  }
  // Remembers the window size used for precomputed wNAF multiplication of the given point
  // and drops any previously built tables. Usually only the base point is precomputed.
  // W=1 resets the point to the un-precomputed (table-less) paths.
  // W is additionally capped so tables stay under ~2 GiB ({@link TABLE_BYTES_MAX}).
  setWindowSize(t, r) {
    this.assertPoint(t), zR(r, this.bits);
    const n = Math.ceil((this.bits + Ao) / r) + 1;
    KR(n * 2 ** (r - 1), this.Point.Fp.BYTES), Fa.set(t, r), this.wnafPrecomputes.delete(t);
  }
  // True when a window size is set: tables themselves are built lazily on first multiply.
  hasWindowSize(t) {
    return Wn(t) !== 1;
  }
}
function Tr(e, t, r, n = !1) {
  if (Ur(e), Ba(t, e), Lt(n, "allowOversized"), YR(r, e.Fn, n ? e.Fn.ORDER ** GR : void 0), t.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const o = t.map((i) => jR(i, 4)), a = r.map((i) => XR(i, 4));
  return JR(e.ZERO, o, a);
}
function po(e, t, r) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return vt(t), t;
  } else
    return Fn(e, { isLE: r });
}
function e0(e, t, r = {}, n) {
  if (n === void 0 && (n = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  Ca(r);
  for (const c of ["p", "n", "h"]) {
    const l = t[c];
    if (!(Qe(l) && l !== Pr))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const o = po(t.p, r.Fp, n), a = po(t.n, r.Fn, n), s = ["Gx", "Gy", "a", "b"];
  for (const c of s)
    if (!o.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: a };
}
function t0(e, t) {
  return function(n) {
    const o = e(n);
    return { secretKey: o, publicKey: t(o) };
  };
}
const mo = (e, t) => (e + (e >= 0 ? t : -t) / r0) / t;
function n0(e, t, r) {
  yR("scalar", e, at, r);
  const [[n, o], [a, i]] = t, s = mo(i * e, r), c = mo(-o * e, r);
  let l = e - s * n - c * a, _ = -s * o - c * i;
  const E = l < at, h = _ < at;
  E && (l = -l), h && (_ = -_);
  const u = ba(Math.ceil(vr(r) / 2)) + It;
  if (l < at || l >= u || _ < at || _ >= u)
    throw new Error("splitScalar (endomorphism): failed for k");
  return { k1neg: E, k1: l, k2neg: h, k2: _ };
}
const at = /* @__PURE__ */ BigInt(0), It = /* @__PURE__ */ BigInt(1), r0 = /* @__PURE__ */ BigInt(2), Yn = /* @__PURE__ */ BigInt(3), o0 = /* @__PURE__ */ BigInt(4);
function a0(e, t = {}) {
  const r = e0("weierstrass", e, t), n = r.Fp, o = r.Fn;
  let a = r.CURVE;
  const { h: i, n: s } = a;
  Ca(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object",
    randomBytes: "function"
  });
  const { endo: c, allowInfinityPoint: l, clearCofactor: _, isTorsionFree: E, fromBytes: h, toBytes: u } = t, A = t.randomBytes === void 0 ? wR : t.randomBytes;
  if (c && (!n.is0(a.a) || typeof c.beta != "bigint" || !Array.isArray(c.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const g = c ? {
    beta: c.beta,
    basises: c.basises.map((k) => [...k])
  } : void 0, v = s0(n, o);
  function S() {
    if (!n.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function D(k, m, I) {
    if (m.is0()) {
      if (!l)
        throw new Error("bad point: ZERO");
      return Uint8Array.of(0);
    }
    const { x: M, y: B } = m.toAffine(), z = n.toBytes(M);
    if (Lt(I, "isCompressed"), I) {
      S();
      const P = !n.isOdd(B);
      return cn(i0(P), z);
    } else
      return cn(Uint8Array.of(4), z, n.toBytes(B));
  }
  function L(k) {
    he(k, void 0, "Point");
    const { publicKey: m, publicKeyUncompressed: I } = v, M = k.length, B = k[0], z = k.subarray(1);
    if (l && M === 1 && B === 0)
      return { x: n.ZERO, y: n.ZERO };
    if (M === m && (B === 2 || B === 3)) {
      const P = n.fromBytes(z);
      if (!n.isValid(P))
        throw new Error("bad point: is not on curve, wrong x");
      const K = O(P);
      let H;
      try {
        H = n.sqrt(K);
      } catch (te) {
        const le = te instanceof Error ? ": " + te.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + le);
      }
      S();
      const j = n.isOdd(H);
      return (B & 1) === 1 !== j && (H = n.neg(H)), { x: P, y: H };
    } else if (M === I && B === 4) {
      const P = n.BYTES, K = n.fromBytes(z.subarray(0, P)), H = n.fromBytes(z.subarray(P, P * 2));
      if (!p(K, H))
        throw new Error("bad point: is not on curve");
      return { x: K, y: H };
    } else
      throw new Error(`bad point: got length ${M}, expected compressed=${m} or uncompressed=${I}`);
  }
  const T = u === void 0 ? D : u, F = h === void 0 ? L : h, R = n.mul(a.b, Yn), f = n.is0(a.a) ? (k) => n.ZERO : (k) => n.mul(a.a, k);
  function O(k) {
    const m = n.sqr(k), I = n.mul(m, k);
    return n.add(n.add(I, n.mul(k, a.a)), a.b);
  }
  function p(k, m) {
    const I = n.sqr(m), M = O(k);
    return n.eql(I, M);
  }
  if (!p(a.Gx, a.Gy))
    throw new Error("bad curve params: generator point");
  const C = n.mul(n.pow(a.a, Yn), o0), x = n.mul(n.sqr(a.b), BigInt(27));
  if (n.is0(n.add(C, x)))
    throw new Error("bad curve params: a or b");
  function w(k, m, I = !1) {
    if (!n.isValid(m) || I && n.is0(m))
      throw new Error(`bad point coordinate ${k}`);
    return typeof m == "object" && m !== null ? n.create(m) : m;
  }
  function b(k) {
    if (!(k instanceof X))
      throw new Error("Weierstrass Point expected");
  }
  function U(k) {
    if (!g || !g.basises)
      throw new Error("no endo");
    return n0(k, g.basises, o.ORDER);
  }
  function Q(k, m, I, M) {
    if (!o.isValid(M))
      throw new RangeError("invalid scalar: out of range");
    if (g) {
      const { k1neg: B, k1: z, k2neg: P, k2: K } = U(M), H = new X(n.mul(I.X, g.beta), I.Y, I.Z);
      k.push(B ? I.negate() : I, P ? H.negate() : H), m.push(z, K);
    } else
      k.push(I), m.push(M);
  }
  const Y = /* @__PURE__ */ new WeakSet(), $ = class $ {
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(m, I, M) {
      y(this, "X");
      y(this, "Y");
      y(this, "Z");
      this.X = w("x", m), this.Y = w("y", I, !0), this.Z = w("z", M), Object.freeze(this);
    }
    static CURVE() {
      return a;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(m) {
      const { x: I, y: M } = m || {};
      if (!m || !n.isValid(I) || !n.isValid(M))
        throw new Error("invalid affine point");
      if (m instanceof $)
        throw new Error("projective point not allowed");
      return n.is0(I) && n.is0(M) ? $.ZERO : new $(I, M, n.ONE);
    }
    static fromBytes(m) {
      const I = $.fromAffine(F(he(m, void 0, "point")));
      return I.assertValidity(), I;
    }
    static fromHex(m) {
      return $.fromBytes(TR(m));
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     * @param isLazy - true will defer table computation until the first multiplication
     */
    precompute(m = 6, I = !0) {
      return J.setWindowSize(this, m), I || this.multiply(Yn), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      const m = this;
      if (m.is0()) {
        if (l && n.is0(m.X) && n.eql(m.Y, n.ONE) && n.is0(m.Z))
          return;
        throw new Error("bad point: ZERO");
      }
      if (Y.has(m))
        return;
      const { x: I, y: M } = m.toAffine();
      if (!n.isValid(I) || !n.isValid(M))
        throw new Error("bad point: x or y not field elements");
      if (!p(I, M))
        throw new Error("bad point: equation left != right");
      if (!m.isTorsionFree())
        throw new Error("bad point: not in prime-order subgroup");
      Y.add(m);
    }
    hasEvenY() {
      const { y: m } = this.toAffine();
      if (!n.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !n.isOdd(m);
    }
    /** Compare one point to another. */
    equals(m) {
      b(m);
      const { X: I, Y: M, Z: B } = this, { X: z, Y: P, Z: K } = m, H = n.eql(n.mul(I, K), n.mul(z, B)), j = n.eql(n.mul(M, K), n.mul(P, B));
      return H && j;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new $(this.X, n.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { X: m, Y: I, Z: M } = this;
      let B = n.ZERO, z = n.ZERO, P = n.ZERO, K = n.mul(m, m), H = n.mul(I, I), j = n.mul(M, M), W = n.mul(m, I);
      return W = n.add(W, W), P = n.mul(m, M), P = n.add(P, P), B = f(P), z = n.mul(R, j), z = n.add(B, z), B = n.sub(H, z), z = n.add(H, z), z = n.mul(B, z), B = n.mul(W, B), P = n.mul(R, P), j = f(j), W = n.sub(K, j), W = f(W), W = n.add(W, P), P = n.add(K, K), K = n.add(P, K), K = n.add(K, j), K = n.mul(K, W), z = n.add(z, K), j = n.mul(I, M), j = n.add(j, j), K = n.mul(j, W), B = n.sub(B, K), P = n.mul(j, H), P = n.add(P, P), P = n.add(P, P), new $(B, z, P);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(m) {
      b(m);
      const { X: I, Y: M, Z: B } = this, { X: z, Y: P, Z: K } = m;
      let H = n.ZERO, j = n.ZERO, W = n.ZERO, te = n.mul(I, z), le = n.mul(M, P), Ee = n.mul(B, K), nt = n.add(I, M), de = n.add(z, P);
      nt = n.mul(nt, de), de = n.add(te, le), nt = n.sub(nt, de), de = n.add(I, B);
      let Ae = n.add(z, K);
      return de = n.mul(de, Ae), Ae = n.add(te, Ee), de = n.sub(de, Ae), Ae = n.add(M, B), H = n.add(P, K), Ae = n.mul(Ae, H), H = n.add(le, Ee), Ae = n.sub(Ae, H), W = f(de), H = n.mul(R, Ee), W = n.add(H, W), H = n.sub(le, W), W = n.add(le, W), j = n.mul(H, W), le = n.add(te, te), le = n.add(le, te), Ee = f(Ee), de = n.mul(R, de), le = n.add(le, Ee), Ee = n.sub(te, Ee), Ee = f(Ee), de = n.add(de, Ee), te = n.mul(le, de), j = n.add(j, te), te = n.mul(Ae, de), H = n.mul(nt, H), H = n.sub(H, te), te = n.mul(nt, le), W = n.mul(Ae, W), W = n.add(W, te), new $(H, j, W);
    }
    subtract(m) {
      return b(m), this.add(m.negate());
    }
    is0() {
      return this.equals($.ZERO);
    }
    /**
     * Constant time multiplication.
     * Uses precomputed tables (signed fixed-window wNAF) when available.
     * Uses scalar blinding and avoids endomorphism splitting in the secret-scalar path.
     * @param scalar - by which the point would be multiplied
     * @returns New point
     */
    multiply(m) {
      if (!o.isValidNot0(m))
        throw new RangeError("invalid scalar: out of range");
      const { p: I, f: M } = J.mulSecret(this, m, i, oe);
      return oe([I, M])[0];
    }
    /**
     * Non-constant-time multiplication. Uses width-4 wNAF with GLV endomorphism splitting
     * when available (two half-width scalars sharing one halved doubling chain).
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(m) {
      const I = this, M = m;
      if (!o.isValid(M))
        throw new RangeError("invalid scalar: out of range");
      if (M === at || I.is0())
        return $.ZERO;
      if (M === It)
        return I;
      if (J.hasWindowSize(this))
        return J.mulUnsafe(I, M, oe);
      const B = [], z = [];
      return Q(B, z, I, M), Tr($, B, z);
    }
    /**
     * Non-constant-time double-scalar multiplication `a⋅this + b⋅other` (Strauss–Shamir).
     * Both walks share one doubling chain via {@link mulAddUnsafe}, and GLV endomorphism
     * (when available) halves the chain again by splitting each scalar into two half-width
     * parts. Used by ECDSA verification and public-key recovery for `R = u1⋅G + u2⋅P`.
     * Only for public scalars.
     */
    mulAddUnsafe(m, I, M) {
      b(I);
      const B = [], z = [];
      return Q(B, z, this, m), Q(B, z, I, M), Tr($, B, z);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * (X, Y, Z) ∋ (x=X/Z, y=Y/Z).
     * @param invertedZ - Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(m) {
      const I = this;
      let M = m;
      if (M != null && !n.isValid(M))
        throw new RangeError('"invertedZ" expected valid field element');
      const { X: B, Y: z, Z: P } = I;
      if (n.eql(P, n.ONE))
        return { x: B, y: z };
      const K = I.is0();
      M == null && (M = K ? n.ONE : n.inv(P));
      const H = n.mul(B, M), j = n.mul(z, M), W = n.mul(P, M);
      if (K)
        return { x: n.ZERO, y: n.ZERO };
      if (!n.eql(W, n.ONE))
        throw new Error("invZ was invalid");
      return { x: H, y: j };
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      return i === It ? !0 : E ? E($, this) : J.mulUnsafe(this, s).is0();
    }
    clearCofactor() {
      return i === It ? this : _ ? _($, this) : this.multiplyUnsafe(i);
    }
    isSmallOrder() {
      return i === It ? this.is0() : this.clearCofactor().is0();
    }
    toBytes(m = !0) {
      return Lt(m, "isCompressed"), this.assertValidity(), T($, this, m);
    }
    toHex(m = !0) {
      return SR(this.toBytes(m));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  };
  y($, "BASE", new $(a.Gx, a.Gy, n.ONE)), y($, "ZERO", new $(n.ZERO, n.ONE, n.ZERO)), y($, "Fp", n), y($, "Fn", o);
  let X = $;
  const oe = (k) => qR(X, k), J = new QR(X, A);
  return J.bits >= 6 && X.BASE.precompute(6), Object.freeze(X.prototype), Object.freeze(X), X;
}
function i0(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function s0(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    // Raw compact `(r || s)` signature width; DER and recovered signatures use
    // different lengths outside this helper.
    signature: 2 * t.BYTES
  };
}
const $n = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, c0 = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, l0 = /* @__PURE__ */ BigInt(0), go = /* @__PURE__ */ BigInt(2);
function d0(e) {
  const t = $n.p, r = BigInt(3), n = BigInt(6), o = BigInt(11), a = BigInt(22), i = BigInt(23), s = BigInt(44), c = BigInt(88), l = e * e * e % t, _ = l * l * e % t, E = ue(_, r, t) * _ % t, h = ue(E, r, t) * _ % t, u = ue(h, go, t) * l % t, A = ue(u, o, t) * u % t, g = ue(A, a, t) * A % t, v = ue(g, s, t) * g % t, S = ue(v, c, t) * v % t, D = ue(S, s, t) * g % t, L = ue(D, r, t) * _ % t, T = ue(L, i, t) * A % t, F = ue(T, n, t) * l % t, R = ue(F, go, t);
  if (!mt.eql(mt.sqr(R), e))
    throw new Error("Cannot find square root");
  return R;
}
const mt = /* @__PURE__ */ Fn($n.p, { sqrt: d0 }), Tt = /* @__PURE__ */ a0($n, {
  Fp: mt,
  endo: c0
}), No = /* @__PURE__ */ Object.create(null);
function dn(e, ...t) {
  let r = No[e];
  if (r === void 0) {
    const n = sn(CR(e));
    r = cn(n, n), No[e] = r;
  }
  return sn(cn(r, ...t));
}
const $a = (e) => e.toBytes(!0).slice(1), ka = ({ x: e }) => mt.toBytes(e), kn = (e) => !mt.isOdd(e);
function Va(e) {
  const { Fn: t, BASE: r } = Tt, n = t.fromBytes(he(e, 32, "secretKey")), a = r.multiply(n).toAffine();
  return { scalar: kn(a.y) ? n : t.neg(n), bytes: ka(a) };
}
function Ga(e) {
  const t = mt;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const r = t.sqr(e), n = t.add(t.mulN(r, e), BigInt(7));
  let o = t.sqrt(n);
  kn(o) || (o = t.neg(o));
  const a = Tt.fromAffine({ x: e, y: o });
  return a.assertValidity(), a;
}
const ct = Bn;
function Ha(...e) {
  return Tt.Fn.create(ct(dn("BIP0340/challenge", ...e)));
}
function So(e) {
  return Va(e).bytes;
}
function _0(e, t, r = yr(32)) {
  const { Fn: n, BASE: o } = Tt, a = wa(he(e, void 0, "message")), { bytes: i, scalar: s } = Va(t), c = he(r, 32, "auxRand"), l = n.toBytes(s ^ ct(dn("BIP0340/aux", c))), _ = dn("BIP0340/nonce", l, i, a), E = n.create(ct(_));
  if (E === l0)
    throw new Error("sign failed: k is zero");
  const u = o.multiply(E).toAffine(), A = kn(u.y) ? E : n.neg(E), g = ka(u), v = Ha(g, i, a), S = new Uint8Array(64);
  if (S.set(g, 0), S.set(n.toBytes(n.create(A + v * s)), 32), !qa(S, a, i))
    throw new Error("sign: Invalid signature produced");
  return S;
}
function qa(e, t, r) {
  const { Fp: n, Fn: o, BASE: a } = Tt, i = he(e, 64, "signature"), s = he(t, void 0, "message"), c = he(r, 32, "publicKey");
  try {
    const l = Ga(ct(c)), _ = i.subarray(0, 32), E = ct(_);
    if (!n.isValidNot0(E))
      return !1;
    const h = ct(i.subarray(32, 64));
    if (!o.isValidNot0(h))
      return !1;
    const u = Ha(_, $a(l), s), A = a.mulAddUnsafe(h, l, o.neg(u)), { x: g, y: v } = A.toAffine();
    return !(A.is0() || !kn(v) || !n.eql(g, E));
  } catch {
    return !1;
  }
}
const xt = /* @__PURE__ */ (() => {
  const r = (n) => (n = n === void 0 ? yr(48) : n, VR(he(n, 48, "seed"), $n.n));
  return Object.freeze({
    keygen: t0(r, So),
    getPublicKey: So,
    sign: _0,
    verify: qa,
    Point: Tt,
    utils: Object.freeze({
      randomSecretKey: r,
      taggedHash: dn,
      lift_x: Ga,
      pointToBytes: $a
    }),
    lengths: Object.freeze({
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    })
  });
})();
function u0(e) {
  let t = `${e.domain} wants you to sign in with your Solana account:
`;
  t += `${e.address}`, e.statement && (t += `

${e.statement}`);
  const r = [];
  if (e.uri && r.push(`URI: ${e.uri}`), e.version && r.push(`Version: ${e.version}`), e.chainId && r.push(`Chain ID: ${e.chainId}`), e.nonce && r.push(`Nonce: ${e.nonce}`), e.issuedAt && r.push(`Issued At: ${e.issuedAt}`), e.expirationTime && r.push(`Expiration Time: ${e.expirationTime}`), e.notBefore && r.push(`Not Before: ${e.notBefore}`), e.requestId && r.push(`Request ID: ${e.requestId}`), e.resources) {
    r.push("Resources:");
    for (const n of e.resources)
      r.push(`- ${n}`);
  }
  return r.length && (t += `

${r.join(`
`)}`), t;
}
const q = {
  ERROR_ASSOCIATION_PORT_OUT_OF_RANGE: "ERROR_ASSOCIATION_PORT_OUT_OF_RANGE",
  ERROR_REFLECTOR_ID_OUT_OF_RANGE: "ERROR_REFLECTOR_ID_OUT_OF_RANGE",
  ERROR_FORBIDDEN_WALLET_BASE_URL: "ERROR_FORBIDDEN_WALLET_BASE_URL",
  ERROR_SECURE_CONTEXT_REQUIRED: "ERROR_SECURE_CONTEXT_REQUIRED",
  ERROR_SESSION_CLOSED: "ERROR_SESSION_CLOSED",
  ERROR_SESSION_TIMEOUT: "ERROR_SESSION_TIMEOUT",
  ERROR_WALLET_NOT_FOUND: "ERROR_WALLET_NOT_FOUND",
  ERROR_INVALID_PROTOCOL_VERSION: "ERROR_INVALID_PROTOCOL_VERSION",
  ERROR_BROWSER_NOT_SUPPORTED: "ERROR_BROWSER_NOT_SUPPORTED",
  ERROR_LOOPBACK_ACCESS_BLOCKED: "ERROR_LOOPBACK_ACCESS_BLOCKED",
  ERROR_ASSOCIATION_CANCELLED: "ERROR_ASSOCIATION_CANCELLED",
  ERROR_ILLEGAL_TRANSPORT_STATE: "ERROR_ILLEGAL_TRANSPORT_STATE"
};
var G = class extends Error {
  constructor(...t) {
    const [r, n, o] = t;
    super(n);
    y(this, "data");
    y(this, "code");
    this.code = r, this.data = o, this.name = "SolanaMobileWalletAdapterError";
  }
}, Vn = class extends Error {
  constructor(...t) {
    const [r, n, o, a] = t;
    super(o);
    y(this, "data");
    y(this, "code");
    y(this, "jsonRpcMessageId");
    this.code = n, this.data = a, this.jsonRpcMessageId = r, this.name = "SolanaMobileWalletAdapterProtocolError";
  }
};
const jn = 20012;
function R0() {
  const e = xt.utils.randomSecretKey();
  return {
    privateKey: e,
    publicKey: ke(xt.getPublicKey(e))
  };
}
async function h0(e) {
  const t = await crypto.subtle.exportKey("raw", e), r = sn(new Uint8Array(t));
  return ke(r);
}
function E0(e, t, r, n, o) {
  return JSON.stringify([
    0,
    e,
    t,
    r,
    n,
    o
  ]);
}
function za(e, t, r, n, o) {
  const a = E0(e, t, r, n, o);
  return ke(sn(new TextEncoder().encode(a)));
}
function To(e, t, r, n) {
  const o = ke(xt.getPublicKey(n)), a = Math.floor(Date.now() / 1e3), i = za(o, a, e, r, t);
  return {
    id: i,
    pubkey: o,
    created_at: a,
    kind: e,
    tags: r,
    content: t,
    sig: ke(xt.sign(it(i), n))
  };
}
function f0(e) {
  if (za(e.pubkey, e.created_at, e.kind, e.tags, e.content) !== e.id) return !1;
  try {
    return xt.verify(it(e.sig), it(e.id), it(e.pubkey));
  } catch {
    return !1;
  }
}
async function Ct(e, t) {
  const r = await crypto.subtle.exportKey("raw", e), n = await crypto.subtle.sign({
    hash: "SHA-256",
    name: "ECDSA"
  }, t, r), o = new Uint8Array(r.byteLength + n.byteLength);
  return o.set(new Uint8Array(r), 0), o.set(new Uint8Array(n), r.byteLength), o;
}
function A0(e) {
  return u0(e);
}
function O0(e) {
  return Zu(A0(e)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const p0 = "solana:signTransactions", wo = "solana:cloneAuthorization";
function Br(e, t) {
  return new Proxy({}, {
    get(r, n) {
      return n === "then" ? null : (r[n] == null && (r[n] = async function(o) {
        const { method: a, params: i } = m0(n, o, e), s = await t(a, i);
        return a === "authorize" && i.sign_in_payload && !s.sign_in_result && (s.sign_in_result = await N0(i.sign_in_payload, s, t)), g0(n, s, e);
      }), r[n]);
    },
    defineProperty() {
      return !1;
    },
    deleteProperty() {
      return !1;
    }
  });
}
function m0(e, t, r) {
  let n = t, o = e.toString().replace(/[A-Z]/g, (a) => `_${a.toLowerCase()}`).toLowerCase();
  switch (e) {
    case "authorize": {
      const a = n;
      let { chain: i } = a;
      if (r === "legacy") {
        switch (i) {
          case "solana:testnet":
            i = "testnet";
            break;
          case "solana:devnet":
            i = "devnet";
            break;
          case "solana:mainnet":
            i = "mainnet-beta";
            break;
          default:
            i = a.cluster;
        }
        a.cluster = i, n = a;
      } else {
        switch (i) {
          case "testnet":
          case "devnet":
            i = `solana:${i}`;
            break;
          case "mainnet-beta":
            i = "solana:mainnet";
        }
        a.chain = i, n = a;
      }
    }
    case "reauthorize": {
      const { auth_token: a, identity: i } = n;
      a && (r === "legacy" ? (o = "reauthorize", n = {
        auth_token: a,
        identity: i
      }) : o = "authorize");
      break;
    }
  }
  return {
    method: o,
    params: n
  };
}
function g0(e, t, r) {
  switch (e) {
    case "getCapabilities": {
      const n = t;
      switch (r) {
        case "legacy": {
          const o = [p0];
          return n.supports_clone_authorization === !0 && o.push(wo), {
            ...n,
            features: o
          };
        }
        case "v1":
          return {
            ...n,
            supports_sign_and_send_transactions: !0,
            supports_clone_authorization: n.features.includes(wo)
          };
      }
    }
  }
  return t;
}
async function N0(e, t, r) {
  const n = e.domain ?? window.location.host, o = t.accounts[0].address, a = O0({
    ...e,
    domain: n,
    address: Qu(o)
  }), i = await r("sign_messages", {
    addresses: [o],
    payloads: [a]
  }), s = pt(i.signed_payloads[0]), c = Ce(s.slice(0, s.length - 64)), l = Ce(s.slice(s.length - 64));
  return {
    address: o,
    signed_message: c.length == 0 ? a : c,
    signature: l
  };
}
function S0(e) {
  if (e >= 4294967296) throw new Error("Outbound sequence number overflow. The maximum sequence number is 32-bytes.");
  const t = /* @__PURE__ */ new ArrayBuffer(4);
  return new DataView(t).setUint32(0, e, !1), new Uint8Array(t);
}
const T0 = 12;
async function w0(e, t, r) {
  const n = S0(t), o = new Uint8Array(T0);
  crypto.getRandomValues(o);
  const a = await crypto.subtle.encrypt(Wa(n, o), r, nR(e)), i = new Uint8Array(n.byteLength + o.byteLength + a.byteLength);
  return i.set(new Uint8Array(n), 0), i.set(new Uint8Array(o), n.byteLength), i.set(new Uint8Array(a), n.byteLength + o.byteLength), i;
}
async function Ka(e, t) {
  const r = e.slice(0, 4), n = e.slice(4, 16), o = e.slice(16), a = await crypto.subtle.decrypt(Wa(r, n), t, o);
  return tR(new Uint8Array(a));
}
function Wa(e, t) {
  return {
    additionalData: e,
    iv: t,
    name: "AES-GCM",
    tagLength: 128
  };
}
async function Fr() {
  return await crypto.subtle.generateKey({
    name: "ECDSA",
    namedCurve: "P-256"
  }, !1, ["sign"]);
}
async function yt() {
  return await crypto.subtle.generateKey({
    name: "ECDH",
    namedCurve: "P-256"
  }, !1, ["deriveKey", "deriveBits"]);
}
function I0() {
  return Ya(49152 + Math.floor(Math.random() * 16384));
}
function Ya(e) {
  if (e < 49152 || e > 65535) throw new G(q.ERROR_ASSOCIATION_PORT_OUT_OF_RANGE, `Association port number must be between 49152 and 65535. ${e} given.`, { port: e });
  return e;
}
function $r(e) {
  return e.replace(/[/+=]/g, (t) => ({
    "/": "_",
    "+": "-",
    "=": "."
  })[t]);
}
const b0 = "solana-wallet";
function Io(e) {
  return e.replace(/(^\/+|\/+$)/g, "").split("/");
}
function kr(e, t) {
  let r = null;
  if (t) {
    try {
      r = new URL(t);
    } catch {
    }
    if (r?.protocol !== "https:") throw new G(q.ERROR_FORBIDDEN_WALLET_BASE_URL, "Base URLs supplied by wallets must be valid `https` URLs");
  }
  r || (r = new URL(`${b0}:/`));
  const n = e.startsWith("/") ? e : [...Io(r.pathname), ...Io(e)].join("/");
  return new URL(n, r);
}
async function C0(e, t, r, n = ["v1"]) {
  const o = Ya(t), a = await crypto.subtle.exportKey("raw", e), i = Cr(a), s = kr("v1/associate/local", r);
  return s.searchParams.set("association", $r(i)), s.searchParams.set("port", `${o}`), n.forEach((c) => {
    s.searchParams.set("v", c);
  }), s;
}
async function y0(e, t, r, n, o = ["v1"]) {
  const a = await crypto.subtle.exportKey("raw", e), i = Cr(a), s = kr("v1/associate/remote", n);
  return s.searchParams.set("association", $r(i)), s.searchParams.set("reflector", `${t}`), s.searchParams.set("id", `${Ce(r, !0)}`), o.forEach((c) => {
    s.searchParams.set("v", c);
  }), s;
}
async function L0(e, t, r, n, o, a = ["v1"]) {
  const i = await crypto.subtle.exportKey("raw", e), s = Cr(i), c = kr(`v1/associate/${t}/nostr`, o);
  return c.searchParams.set("association", $r(s)), c.searchParams.set("relay", r), c.searchParams.set("pubkey", n), a.forEach((l) => {
    c.searchParams.set("v", l);
  }), c;
}
async function Vr(e, t) {
  const r = JSON.stringify(e), n = e.id;
  return w0(r, n, t);
}
async function Gr(e, t) {
  const r = await Ka(e, t), n = JSON.parse(r);
  if (Object.hasOwnProperty.call(n, "error")) throw new Vn(n.id, n.error.code, n.error.message);
  return n;
}
async function Hr(e, t, r) {
  const [n, o] = await Promise.all([crypto.subtle.exportKey("raw", t), crypto.subtle.importKey("raw", e.slice(0, 65), {
    name: "ECDH",
    namedCurve: "P-256"
  }, !1, [])]), a = await crypto.subtle.deriveBits({
    name: "ECDH",
    public: o
  }, r, 256), i = await crypto.subtle.importKey("raw", a, "HKDF", !1, ["deriveKey"]);
  return await crypto.subtle.deriveKey({
    name: "HKDF",
    hash: "SHA-256",
    salt: new Uint8Array(n),
    info: /* @__PURE__ */ new Uint8Array()
  }, i, {
    name: "AES-GCM",
    length: 128
  }, !1, ["encrypt", "decrypt"]);
}
async function qr(e, t) {
  const r = await Ka(e, t), n = JSON.parse(r);
  let o = "legacy";
  if (Object.hasOwnProperty.call(n, "v")) switch (n.v) {
    case 1:
    case "1":
    case "v1":
      o = "v1";
      break;
    case "legacy":
      o = "legacy";
      break;
    default:
      throw new G(q.ERROR_INVALID_PROTOCOL_VERSION, `Unknown/unsupported protocol version: ${n.v}`);
  }
  return { protocol_version: o };
}
const _n = {
  Firefox: 0,
  Other: 1
};
function v0() {
  return navigator.userAgent.indexOf("Firefox/") !== -1 ? _n.Firefox : _n.Other;
}
function D0() {
  return new Promise((e, t) => {
    function r() {
      clearTimeout(o), window.removeEventListener("blur", n);
    }
    function n() {
      r(), e();
    }
    window.addEventListener("blur", n);
    const o = setTimeout(() => {
      r(), t();
    }, 3e3);
  });
}
let rt = null;
function x0(e) {
  (rt == null || !rt.isConnected) && (rt = document.createElement("iframe"), rt.style.display = "none", document.body.appendChild(rt)), rt.contentWindow.location.href = e.toString();
}
async function ja(e) {
  if (e.protocol === "https:") window.location.assign(e);
  else try {
    switch (v0()) {
      case _n.Firefox:
        x0(e);
        break;
      case _n.Other: {
        const t = D0();
        window.location.assign(e), await t;
        break;
      }
    }
  } catch {
    throw new G(q.ERROR_WALLET_NOT_FOUND, "Found no installed wallet that supports the mobile wallet protocol.");
  }
}
async function M0(e, t) {
  const r = I0();
  return await ja(await C0(e, r, t)), r;
}
async function P0(e, t, r, n, o) {
  const a = await L0(e, t, r, n, o);
  return t == "local" && await ja(a), a;
}
const gt = {
  /**
  * 300 milliseconds is a generally accepted threshold for what someone
  * would consider an acceptable response time for a user interface
  * after having performed a low-attention tapping task. We set the initial
  * interval at which we wait for the wallet to set up the websocket at
  * half this, as per the Nyquist frequency, with a progressive backoff
  * sequence from there. The total wait time is 30s, which allows for the
  * user to be presented with a disambiguation dialog, select a wallet, and
  * for the wallet app to subsequently start.
  */
  retryDelayScheduleMs: [
    150,
    150,
    200,
    500,
    500,
    750,
    750,
    1e3
  ],
  timeoutMs: 3e4
}, U0 = 3e4, Xa = "com.solana.mobilewalletadapter.v1", bo = "com.solana.mobilewalletadapter.v1.base64";
function zr() {
  if (typeof window > "u" || window.isSecureContext !== !0) throw new G(q.ERROR_SECURE_CONTEXT_REQUIRED, "The mobile wallet adapter protocol must be used in a secure context (`https`).");
}
function Kr(e) {
  let t;
  try {
    t = new URL(e);
  } catch {
    throw new G(q.ERROR_FORBIDDEN_WALLET_BASE_URL, "Invalid base URL supplied by wallet");
  }
  if (t.protocol !== "https:") throw new G(q.ERROR_FORBIDDEN_WALLET_BASE_URL, "Base URLs supplied by wallets must be valid `https` URLs");
}
function Nt(e) {
  return new DataView(e).getUint32(0, !1);
}
function B0(e) {
  const t = new Uint8Array(e), r = e.byteLength, n = 10;
  let o = 0, a = 0, i;
  do {
    if (a >= r || a > n) throw new RangeError("Failed to decode varint");
    i = t[a++], o |= (i & 127) << 7 * a;
  } while (i >= 128);
  return {
    value: o,
    offset: a
  };
}
function F0(e) {
  const { value: t, offset: r } = B0(e);
  return new Uint8Array(e.slice(r, r + t));
}
async function $0(e) {
  zr();
  const t = await Fr(), r = `ws://localhost:${await M0(t.publicKey, e?.baseUri)}/solana-wallet`;
  let n;
  const o = (() => {
    const E = [...gt.retryDelayScheduleMs];
    return () => E.length > 1 ? E.shift() : E[0];
  })();
  let a = 1, i = 0, s = { __type: "disconnected" }, c, l = !1, _;
  return {
    close: () => {
      c.close(), _();
    },
    wallet: new Promise((E, h) => {
      const u = {}, A = (R) => {
        for (const f of Object.keys(u)) {
          const O = Number(f), p = u[O];
          delete u[O], p.reject(R);
        }
      }, g = async () => {
        if (s.__type !== "connecting") {
          console.warn(`Expected adapter state to be \`connecting\` at the moment the websocket opens. Got \`${s.__type}\`.`);
          return;
        }
        c.removeEventListener("open", g);
        const { associationKeypair: R } = s, f = await yt();
        c.send(await Ct(f.publicKey, R.privateKey)), s = {
          __type: "hello_req_sent",
          associationPublicKey: R.publicKey,
          ecdhPrivateKey: f.privateKey
        };
      }, v = (R) => {
        R.wasClean ? s = { __type: "disconnected" } : h(new G(q.ERROR_SESSION_CLOSED, `The wallet session dropped unexpectedly (${R.code}: ${R.reason}).`, { closeEvent: R })), A(new G(q.ERROR_SESSION_CLOSED, `The wallet session closed before a response was received (${R.code}: ${R.reason}).`, { closeEvent: R })), L();
      }, S = async (R) => {
        A(new G(q.ERROR_SESSION_CLOSED, "The wallet session encountered a transport error before a response was received.", { closeEvent: new CloseEvent("transport error") })), L(), Date.now() - n >= gt.timeoutMs ? h(new G(q.ERROR_SESSION_TIMEOUT, `Failed to connect to the wallet websocket at ${r}.`)) : (await new Promise((f) => {
          const O = o();
          T = window.setTimeout(f, O);
        }), F());
      }, D = async (R) => {
        const f = await R.data.arrayBuffer();
        switch (s.__type) {
          case "connecting": {
            if (f.byteLength !== 0) {
              h(new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Encountered unexpected message while connecting"));
              return;
            }
            const O = await yt();
            c.send(await Ct(O.publicKey, t.privateKey)), s = {
              __type: "hello_req_sent",
              associationPublicKey: t.publicKey,
              ecdhPrivateKey: O.privateKey
            };
            break;
          }
          case "connected":
            if (f.byteLength === 0) break;
            try {
              const O = Nt(f.slice(0, 4));
              if (O !== i + 1) throw new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Encrypted message has invalid sequence number");
              i = O;
              const p = await Gr(f, s.sharedSecret), C = u[p.id];
              if (!C) break;
              delete u[p.id], C.resolve(p.result);
            } catch (O) {
              if (O instanceof Vn) {
                const p = u[O.jsonRpcMessageId];
                if (!p) break;
                delete u[O.jsonRpcMessageId], p.reject(O);
              } else
                A(O), c.close();
            }
            break;
          case "hello_req_sent": {
            if (f.byteLength === 0) {
              const w = await yt();
              c.send(await Ct(w.publicKey, t.privateKey)), s = {
                __type: "hello_req_sent",
                associationPublicKey: t.publicKey,
                ecdhPrivateKey: w.privateKey
              };
              break;
            }
            const O = await Hr(f, s.associationPublicKey, s.ecdhPrivateKey), p = f.slice(65), C = p.byteLength !== 0 ? await (async () => {
              const w = Nt(p.slice(0, 4));
              return w !== i + 1 ? (h(new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Encrypted message has invalid sequence number")), c.close(), { protocol_version: "v1" }) : (i = w, qr(p, O));
            })() : { protocol_version: "legacy" };
            s = {
              __type: "connected",
              sharedSecret: O,
              sessionProperties: C
            };
            const x = Br(C.protocol_version, async (w, b) => {
              const U = a++;
              return c.send(await Vr({
                id: U,
                jsonrpc: "2.0",
                method: w,
                params: b ?? {}
              }, O)), new Promise((Q, Y) => {
                u[U] = {
                  resolve(X) {
                    switch (w) {
                      case "authorize":
                      case "reauthorize": {
                        const { wallet_uri_base: oe } = X;
                        if (oe != null) try {
                          Kr(oe);
                        } catch (J) {
                          Y(J);
                          return;
                        }
                        break;
                      }
                    }
                    Q(X);
                  },
                  reject: Y
                };
              });
            });
            l = !0;
            try {
              E(x);
            } catch (w) {
              h(w);
            }
            break;
          }
        }
      };
      _ = () => {
        c.removeEventListener("message", D), L(), l || h(new G(q.ERROR_SESSION_CLOSED, "The wallet session was closed before connection.", { closeEvent: new CloseEvent("socket was closed before connection") }));
      };
      let L, T;
      const F = () => {
        L && L(), s = {
          __type: "connecting",
          associationKeypair: t
        }, n === void 0 && (n = Date.now()), c = new WebSocket(r, [Xa]), c.addEventListener("open", g), c.addEventListener("close", v), c.addEventListener("error", S), c.addEventListener("message", D), L = () => {
          window.clearTimeout(T), c.removeEventListener("open", g), c.removeEventListener("close", v), c.removeEventListener("error", S), c.removeEventListener("message", D);
        };
      };
      F();
    })
  };
}
async function k0(e) {
  zr();
  const t = await Fr(), r = `wss://${e?.remoteHostAuthority}/reflect`;
  let n;
  const o = (() => {
    const g = [...gt.retryDelayScheduleMs];
    return () => g.length > 1 ? g.shift() : g[0];
  })();
  let a = 1, i = 0, s, c = { __type: "disconnected" }, l, _;
  const E = async (g) => {
    if (s == "base64") {
      const v = await g.data;
      return pt(v).buffer;
    } else return await g.data.arrayBuffer();
  }, h = await new Promise((g, v) => {
    const S = async () => {
      if (c.__type !== "connecting") {
        console.warn(`Expected adapter state to be \`connecting\` at the moment the websocket opens. Got \`${c.__type}\`.`);
        return;
      }
      l.protocol.includes(bo) ? s = "base64" : s = "binary", l.removeEventListener("open", S);
    }, D = (f) => {
      f.wasClean ? c = { __type: "disconnected" } : v(new G(q.ERROR_SESSION_CLOSED, `The wallet session dropped unexpectedly (${f.code}: ${f.reason}).`, { closeEvent: f })), _();
    }, L = async (f) => {
      _(), Date.now() - n >= gt.timeoutMs ? v(new G(q.ERROR_SESSION_TIMEOUT, `Failed to connect to the wallet websocket at ${r}.`)) : (await new Promise((O) => {
        const p = o();
        F = window.setTimeout(O, p);
      }), R());
    }, T = async (f) => {
      const O = await E(f);
      if (c.__type === "connecting") {
        if (O.byteLength == 0) {
          v(new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Encountered unexpected message while connecting")), l.close();
          return;
        }
        const p = F0(O);
        c = {
          __type: "reflector_id_received",
          reflectorId: p
        };
        const C = await y0(t.publicKey, e.remoteHostAuthority, p, e?.baseUri);
        l.removeEventListener("message", T), g(C);
      }
    };
    let F;
    const R = () => {
      _ && _(), c = {
        __type: "connecting",
        associationKeypair: t
      }, n === void 0 && (n = Date.now()), l = new WebSocket(r, [Xa, bo]), l.addEventListener("open", S), l.addEventListener("close", D), l.addEventListener("error", L), l.addEventListener("message", T), _ = () => {
        window.clearTimeout(F), l.removeEventListener("open", S), l.removeEventListener("close", D), l.removeEventListener("error", L), l.removeEventListener("message", T);
      };
    };
    R();
  });
  let u = !1, A;
  return {
    associationUrl: h,
    close: () => {
      l.close(), A();
    },
    wallet: new Promise((g, v) => {
      const S = {}, D = (T) => {
        for (const F of Object.keys(S)) {
          const R = Number(F), f = S[R];
          delete S[R], f.reject(T);
        }
      }, L = async (T) => {
        const F = await E(T);
        switch (c.__type) {
          case "reflector_id_received": {
            if (F.byteLength !== 0) {
              v(new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Encountered unexpected message while awaiting reflection")), l.close();
              return;
            }
            const R = await yt(), f = await Ct(R.publicKey, t.privateKey);
            s == "base64" ? l.send(Ce(f)) : l.send(f), c = {
              __type: "hello_req_sent",
              associationPublicKey: t.publicKey,
              ecdhPrivateKey: R.privateKey
            };
            break;
          }
          case "connected":
            if (F.byteLength === 0) break;
            try {
              const R = Nt(F.slice(0, 4));
              if (R !== i + 1) throw new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Encrypted message has invalid sequence number");
              i = R;
              const f = await Gr(F, c.sharedSecret), O = S[f.id];
              if (!O) break;
              delete S[f.id], O.resolve(f.result);
            } catch (R) {
              if (R instanceof Vn) {
                const f = S[R.jsonRpcMessageId];
                if (!f) break;
                delete S[R.jsonRpcMessageId], f.reject(R);
              } else
                D(R), l.close();
            }
            break;
          case "hello_req_sent": {
            const R = await Hr(F, c.associationPublicKey, c.ecdhPrivateKey), f = F.slice(65), O = f.byteLength !== 0 ? await (async () => {
              const C = Nt(f.slice(0, 4));
              return C !== i + 1 ? (v(new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Encrypted message has invalid sequence number")), l.close(), { protocol_version: "v1" }) : (i = C, qr(f, R));
            })() : { protocol_version: "legacy" };
            c = {
              __type: "connected",
              sharedSecret: R,
              sessionProperties: O
            };
            const p = Br(O.protocol_version, async (C, x) => {
              const w = a++, b = await Vr({
                id: w,
                jsonrpc: "2.0",
                method: C,
                params: x ?? {}
              }, R);
              return s == "base64" ? l.send(Ce(b)) : l.send(b), new Promise((U, Q) => {
                S[w] = {
                  resolve(Y) {
                    switch (C) {
                      case "authorize":
                      case "reauthorize": {
                        const { wallet_uri_base: X } = Y;
                        if (X != null) try {
                          Kr(X);
                        } catch (oe) {
                          Q(oe);
                          return;
                        }
                        break;
                      }
                    }
                    U(Y);
                  },
                  reject: Q
                };
              });
            });
            u = !0;
            try {
              g(p);
            } catch (C) {
              v(C);
            }
            break;
          }
        }
      };
      l.addEventListener("message", L), l.addEventListener("close", () => D(new G(q.ERROR_SESSION_CLOSED, "The wallet session closed before a response was received.", { closeEvent: new CloseEvent("session closed") }))), l.addEventListener("error", () => D(new G(q.ERROR_SESSION_CLOSED, "The wallet session encountered a transport error before a response was received.", { closeEvent: new CloseEvent("transport error") }))), A = () => {
        l.removeEventListener("message", L), _(), u || v(new G(q.ERROR_SESSION_CLOSED, "The wallet session was closed before connection.", { closeEvent: new CloseEvent("socket was closed before connection") }));
      };
    })
  };
}
async function Za(e) {
  zr();
  const t = await Fr(), { privateKey: r, publicKey: n } = R0(), o = await P0(t.publicKey, e.connectionType, e.relayDomain, n, e.baseUri), a = await h0(t.publicKey), i = crypto.randomUUID(), s = JSON.stringify([
    "REQ",
    i,
    {
      kinds: [jn],
      "#d": [a]
    }
  ]), c = `wss://${e.relayDomain}`, l = Date.now(), _ = (() => {
    const T = [...gt.retryDelayScheduleMs];
    return () => T.length > 1 ? T.shift() : T[0];
  })();
  let E = 1, h = 0, u = { __type: "disconnected" }, A, g = !1, v;
  const S = (T, F) => {
    const R = To(jn, T, [["d", a], ["p", F]], r);
    A.send(JSON.stringify(["EVENT", R]));
  }, D = () => {
    if (u.__type == "connected" || u.__type == "hello_req_sent") {
      const T = To(jn, "", [
        ["d", a],
        ["p", u.walletNostrPubkey],
        ["msg", "SESSION_END"]
      ], r);
      A.send(JSON.stringify(["EVENT", T]));
    }
    A.close();
  }, L = {
    close: () => {
      D(), v();
    },
    wallet: new Promise((T, F) => {
      const R = {};
      let f;
      const O = (Y) => {
        for (const X of Object.keys(R)) {
          const oe = Number(X), J = R[oe];
          delete R[oe], J.reject(Y);
        }
      }, p = async () => {
        if (u.__type !== "connecting") {
          console.warn(`Expected adapter state to be \`connecting\` at the moment the websocket opens. Got \`${u.__type}\`.`);
          return;
        }
        A.removeEventListener("open", p), A.send(s), f = window.setInterval(() => {
          Object.keys(R).length > 0 && A.send(s);
        }, U0), u = {
          __type: "subscribed",
          dappNostrPrivateKey: r,
          dappNostrPubkey: n,
          sessionIdentifier: a
        };
      }, C = (Y) => {
        Y.wasClean ? u = { __type: "disconnected" } : F(new G(q.ERROR_SESSION_CLOSED, `The Nostr subscription dropped unexpectedly (${Y.code}: ${Y.reason}).`, { closeEvent: Y })), O(new G(q.ERROR_SESSION_CLOSED, `The wallet session closed before a response was received (${Y.code}: ${Y.reason}).`, { closeEvent: Y })), b();
      }, x = async () => {
        O(new G(q.ERROR_SESSION_CLOSED, "The wallet session encountered a transport error before a response was received.", { closeEvent: new CloseEvent("transport error") })), b(), Date.now() - l >= gt.timeoutMs ? F(new G(q.ERROR_SESSION_TIMEOUT, `Failed to connect to the Nostr relay at ${e.relayDomain}.`)) : (await new Promise((Y) => {
          const X = _();
          U = window.setTimeout(Y, X);
        }), Q());
      }, w = async (Y) => {
        let X;
        try {
          if (X = JSON.parse(Y.data), !Array.isArray(X)) throw new Error();
        } catch {
          F(new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Invalid Nostr message received: " + Y.data)), D();
          return;
        }
        const oe = X[0];
        if (oe === "CLOSED")
          O(new G(q.ERROR_SESSION_CLOSED, "The Nostr relay closed the session subscription before a response was received.", { closeEvent: new CloseEvent("session closed") })), b();
        else if (oe === "EVENT") {
          const J = X[2];
          if (!J || !f0(J)) return;
          if (J.pubkey === u.walletNostrPubkey && J.tags.some(([$, k]) => $ === "msg" && k === "SESSION_END")) {
            const $ = new G(q.ERROR_SESSION_CLOSED, "The wallet ended the session.", { closeEvent: new CloseEvent("session ended by wallet") });
            F($), O($), A.close();
            return;
          }
          switch (u.__type) {
            case "subscribed": {
              if (J.content.length !== 0) {
                F(new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Encountered unexpected message while awaiting reflection")), D();
                return;
              }
              const $ = J.pubkey, k = await yt(), m = await Ct(k.publicKey, t.privateKey), I = Ce(m);
              S(I, $), u = {
                __type: "hello_req_sent",
                associationPublicKey: t.publicKey,
                ecdhPrivateKey: k.privateKey,
                walletNostrPubkey: $
              };
              break;
            }
            case "hello_req_sent": {
              if (J.pubkey !== u.walletNostrPubkey || J.content === "") return;
              const $ = pt(J.content).buffer, k = await Hr($, u.associationPublicKey, u.ecdhPrivateKey), m = $.slice(65), I = m.byteLength !== 0 ? await (async () => {
                const B = Nt(m.slice(0, 4));
                return B !== h + 1 ? (F(new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Encrypted message has invalid sequence number")), D(), { protocol_version: "v1" }) : (h = B, qr(m, k));
              })() : { protocol_version: "legacy" };
              u = {
                __type: "connected",
                sharedSecret: k,
                sessionProperties: I,
                walletNostrPubkey: u.walletNostrPubkey
              };
              const M = Br(I.protocol_version, async (B, z) => {
                const P = E++, K = await Vr({
                  id: P,
                  jsonrpc: "2.0",
                  method: B,
                  params: z ?? {}
                }, k);
                return S(Ce(K), u.walletNostrPubkey), new Promise((H, j) => {
                  R[P] = {
                    resolve(W) {
                      switch (B) {
                        case "authorize":
                        case "reauthorize": {
                          const { wallet_uri_base: te } = W;
                          if (te != null) try {
                            Kr(te);
                          } catch (le) {
                            j(le);
                            return;
                          }
                          break;
                        }
                      }
                      H(W);
                    },
                    reject: j
                  };
                });
              });
              g = !0;
              try {
                T(M);
              } catch (B) {
                F(B);
              }
              break;
            }
            case "connected":
              if (J.pubkey !== u.walletNostrPubkey || J.content === "") return;
              try {
                const $ = pt(J.content).buffer, k = Nt($.slice(0, 4));
                if (k !== h + 1) throw new G(q.ERROR_ILLEGAL_TRANSPORT_STATE, "Encrypted message has invalid sequence number");
                h = k;
                const m = await Gr($, u.sharedSecret), I = R[m.id];
                if (!I) break;
                delete R[m.id], I.resolve(m.result);
              } catch ($) {
                if ($ instanceof Vn) {
                  const k = R[$.jsonRpcMessageId];
                  if (!k) break;
                  delete R[$.jsonRpcMessageId], k.reject($);
                } else
                  O($), D();
              }
          }
        }
      };
      v = () => {
        A.removeEventListener("message", w), b(), O(new G(q.ERROR_SESSION_CLOSED, "The wallet session was closed before a response was received.", { closeEvent: new CloseEvent("session closed") })), g || F(new G(q.ERROR_SESSION_CLOSED, "The wallet session was closed before connection.", { closeEvent: new CloseEvent("socket was closed before connection") }));
      };
      let b, U;
      const Q = () => {
        b && b(), u = {
          __type: "connecting",
          associationKeypair: t
        }, A = new WebSocket(c), A.addEventListener("open", p), A.addEventListener("close", C), A.addEventListener("error", x), A.addEventListener("message", w), b = () => {
          window.clearInterval(f), window.clearTimeout(U), A.removeEventListener("open", p), A.removeEventListener("close", C), A.removeEventListener("error", x), A.removeEventListener("message", w);
        };
      };
      Q();
    })
  };
  return e.connectionType == "local" ? L : {
    ...L,
    associationUrl: o
  };
}
const Ie = "solana:signAndSendTransaction", Wr = "solana:signIn", Yr = "solana:signMessage", be = "solana:signTransaction", Ja = "standard:connect", Qa = "standard:disconnect", ei = "standard:events";
function V0(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var ot = {}, Xn, Co;
function G0() {
  return Co || (Co = 1, Xn = function() {
    return typeof Promise == "function" && Promise.prototype && Promise.prototype.then;
  }), Xn;
}
var Zn = {}, Le = {}, yo;
function et() {
  if (yo) return Le;
  yo = 1;
  let e;
  const t = [
    0,
    // Not used
    26,
    44,
    70,
    100,
    134,
    172,
    196,
    242,
    292,
    346,
    404,
    466,
    532,
    581,
    655,
    733,
    815,
    901,
    991,
    1085,
    1156,
    1258,
    1364,
    1474,
    1588,
    1706,
    1828,
    1921,
    2051,
    2185,
    2323,
    2465,
    2611,
    2761,
    2876,
    3034,
    3196,
    3362,
    3532,
    3706
  ];
  return Le.getSymbolSize = function(n) {
    if (!n) throw new Error('"version" cannot be null or undefined');
    if (n < 1 || n > 40) throw new Error('"version" should be in range from 1 to 40');
    return n * 4 + 17;
  }, Le.getSymbolTotalCodewords = function(n) {
    return t[n];
  }, Le.getBCHDigit = function(r) {
    let n = 0;
    for (; r !== 0; )
      n++, r >>>= 1;
    return n;
  }, Le.setToSJISFunction = function(n) {
    if (typeof n != "function")
      throw new Error('"toSJISFunc" is not a valid function.');
    e = n;
  }, Le.isKanjiModeEnabled = function() {
    return typeof e < "u";
  }, Le.toSJIS = function(n) {
    return e(n);
  }, Le;
}
var Jn = {}, Lo;
function jr() {
  return Lo || (Lo = 1, (function(e) {
    e.L = { bit: 1 }, e.M = { bit: 0 }, e.Q = { bit: 3 }, e.H = { bit: 2 };
    function t(r) {
      if (typeof r != "string")
        throw new Error("Param is not a string");
      switch (r.toLowerCase()) {
        case "l":
        case "low":
          return e.L;
        case "m":
        case "medium":
          return e.M;
        case "q":
        case "quartile":
          return e.Q;
        case "h":
        case "high":
          return e.H;
        default:
          throw new Error("Unknown EC Level: " + r);
      }
    }
    e.isValid = function(n) {
      return n && typeof n.bit < "u" && n.bit >= 0 && n.bit < 4;
    }, e.from = function(n, o) {
      if (e.isValid(n))
        return n;
      try {
        return t(n);
      } catch {
        return o;
      }
    };
  })(Jn)), Jn;
}
var Qn, vo;
function H0() {
  if (vo) return Qn;
  vo = 1;
  function e() {
    this.buffer = [], this.length = 0;
  }
  return e.prototype = {
    get: function(t) {
      const r = Math.floor(t / 8);
      return (this.buffer[r] >>> 7 - t % 8 & 1) === 1;
    },
    put: function(t, r) {
      for (let n = 0; n < r; n++)
        this.putBit((t >>> r - n - 1 & 1) === 1);
    },
    getLengthInBits: function() {
      return this.length;
    },
    putBit: function(t) {
      const r = Math.floor(this.length / 8);
      this.buffer.length <= r && this.buffer.push(0), t && (this.buffer[r] |= 128 >>> this.length % 8), this.length++;
    }
  }, Qn = e, Qn;
}
var er, Do;
function q0() {
  if (Do) return er;
  Do = 1;
  function e(t) {
    if (!t || t < 1)
      throw new Error("BitMatrix size must be defined and greater than 0");
    this.size = t, this.data = new Uint8Array(t * t), this.reservedBit = new Uint8Array(t * t);
  }
  return e.prototype.set = function(t, r, n, o) {
    const a = t * this.size + r;
    this.data[a] = n, o && (this.reservedBit[a] = !0);
  }, e.prototype.get = function(t, r) {
    return this.data[t * this.size + r];
  }, e.prototype.xor = function(t, r, n) {
    this.data[t * this.size + r] ^= n;
  }, e.prototype.isReserved = function(t, r) {
    return this.reservedBit[t * this.size + r];
  }, er = e, er;
}
var tr = {}, xo;
function z0() {
  return xo || (xo = 1, (function(e) {
    const t = et().getSymbolSize;
    e.getRowColCoords = function(n) {
      if (n === 1) return [];
      const o = Math.floor(n / 7) + 2, a = t(n), i = a === 145 ? 26 : Math.ceil((a - 13) / (2 * o - 2)) * 2, s = [a - 7];
      for (let c = 1; c < o - 1; c++)
        s[c] = s[c - 1] - i;
      return s.push(6), s.reverse();
    }, e.getPositions = function(n) {
      const o = [], a = e.getRowColCoords(n), i = a.length;
      for (let s = 0; s < i; s++)
        for (let c = 0; c < i; c++)
          s === 0 && c === 0 || // top-left
          s === 0 && c === i - 1 || // bottom-left
          s === i - 1 && c === 0 || o.push([a[s], a[c]]);
      return o;
    };
  })(tr)), tr;
}
var nr = {}, Mo;
function K0() {
  if (Mo) return nr;
  Mo = 1;
  const e = et().getSymbolSize, t = 7;
  return nr.getPositions = function(n) {
    const o = e(n);
    return [
      // top-left
      [0, 0],
      // top-right
      [o - t, 0],
      // bottom-left
      [0, o - t]
    ];
  }, nr;
}
var rr = {}, Po;
function W0() {
  return Po || (Po = 1, (function(e) {
    e.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    const t = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    e.isValid = function(o) {
      return o != null && o !== "" && !isNaN(o) && o >= 0 && o <= 7;
    }, e.from = function(o) {
      return e.isValid(o) ? parseInt(o, 10) : void 0;
    }, e.getPenaltyN1 = function(o) {
      const a = o.size;
      let i = 0, s = 0, c = 0, l = null, _ = null;
      for (let E = 0; E < a; E++) {
        s = c = 0, l = _ = null;
        for (let h = 0; h < a; h++) {
          let u = o.get(E, h);
          u === l ? s++ : (s >= 5 && (i += t.N1 + (s - 5)), l = u, s = 1), u = o.get(h, E), u === _ ? c++ : (c >= 5 && (i += t.N1 + (c - 5)), _ = u, c = 1);
        }
        s >= 5 && (i += t.N1 + (s - 5)), c >= 5 && (i += t.N1 + (c - 5));
      }
      return i;
    }, e.getPenaltyN2 = function(o) {
      const a = o.size;
      let i = 0;
      for (let s = 0; s < a - 1; s++)
        for (let c = 0; c < a - 1; c++) {
          const l = o.get(s, c) + o.get(s, c + 1) + o.get(s + 1, c) + o.get(s + 1, c + 1);
          (l === 4 || l === 0) && i++;
        }
      return i * t.N2;
    }, e.getPenaltyN3 = function(o) {
      const a = o.size;
      let i = 0, s = 0, c = 0;
      for (let l = 0; l < a; l++) {
        s = c = 0;
        for (let _ = 0; _ < a; _++)
          s = s << 1 & 2047 | o.get(l, _), _ >= 10 && (s === 1488 || s === 93) && i++, c = c << 1 & 2047 | o.get(_, l), _ >= 10 && (c === 1488 || c === 93) && i++;
      }
      return i * t.N3;
    }, e.getPenaltyN4 = function(o) {
      let a = 0;
      const i = o.data.length;
      for (let c = 0; c < i; c++) a += o.data[c];
      return Math.abs(Math.ceil(a * 100 / i / 5) - 10) * t.N4;
    };
    function r(n, o, a) {
      switch (n) {
        case e.Patterns.PATTERN000:
          return (o + a) % 2 === 0;
        case e.Patterns.PATTERN001:
          return o % 2 === 0;
        case e.Patterns.PATTERN010:
          return a % 3 === 0;
        case e.Patterns.PATTERN011:
          return (o + a) % 3 === 0;
        case e.Patterns.PATTERN100:
          return (Math.floor(o / 2) + Math.floor(a / 3)) % 2 === 0;
        case e.Patterns.PATTERN101:
          return o * a % 2 + o * a % 3 === 0;
        case e.Patterns.PATTERN110:
          return (o * a % 2 + o * a % 3) % 2 === 0;
        case e.Patterns.PATTERN111:
          return (o * a % 3 + (o + a) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + n);
      }
    }
    e.applyMask = function(o, a) {
      const i = a.size;
      for (let s = 0; s < i; s++)
        for (let c = 0; c < i; c++)
          a.isReserved(c, s) || a.xor(c, s, r(o, c, s));
    }, e.getBestMask = function(o, a) {
      const i = Object.keys(e.Patterns).length;
      let s = 0, c = 1 / 0;
      for (let l = 0; l < i; l++) {
        a(l), e.applyMask(l, o);
        const _ = e.getPenaltyN1(o) + e.getPenaltyN2(o) + e.getPenaltyN3(o) + e.getPenaltyN4(o);
        e.applyMask(l, o), _ < c && (c = _, s = l);
      }
      return s;
    };
  })(rr)), rr;
}
var en = {}, Uo;
function ti() {
  if (Uo) return en;
  Uo = 1;
  const e = jr(), t = [
    // L  M  Q  H
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    2,
    1,
    2,
    2,
    4,
    1,
    2,
    4,
    4,
    2,
    4,
    4,
    4,
    2,
    4,
    6,
    5,
    2,
    4,
    6,
    6,
    2,
    5,
    8,
    8,
    4,
    5,
    8,
    8,
    4,
    5,
    8,
    11,
    4,
    8,
    10,
    11,
    4,
    9,
    12,
    16,
    4,
    9,
    16,
    16,
    6,
    10,
    12,
    18,
    6,
    10,
    17,
    16,
    6,
    11,
    16,
    19,
    6,
    13,
    18,
    21,
    7,
    14,
    21,
    25,
    8,
    16,
    20,
    25,
    8,
    17,
    23,
    25,
    9,
    17,
    23,
    34,
    9,
    18,
    25,
    30,
    10,
    20,
    27,
    32,
    12,
    21,
    29,
    35,
    12,
    23,
    34,
    37,
    12,
    25,
    34,
    40,
    13,
    26,
    35,
    42,
    14,
    28,
    38,
    45,
    15,
    29,
    40,
    48,
    16,
    31,
    43,
    51,
    17,
    33,
    45,
    54,
    18,
    35,
    48,
    57,
    19,
    37,
    51,
    60,
    19,
    38,
    53,
    63,
    20,
    40,
    56,
    66,
    21,
    43,
    59,
    70,
    22,
    45,
    62,
    74,
    24,
    47,
    65,
    77,
    25,
    49,
    68,
    81
  ], r = [
    // L  M  Q  H
    7,
    10,
    13,
    17,
    10,
    16,
    22,
    28,
    15,
    26,
    36,
    44,
    20,
    36,
    52,
    64,
    26,
    48,
    72,
    88,
    36,
    64,
    96,
    112,
    40,
    72,
    108,
    130,
    48,
    88,
    132,
    156,
    60,
    110,
    160,
    192,
    72,
    130,
    192,
    224,
    80,
    150,
    224,
    264,
    96,
    176,
    260,
    308,
    104,
    198,
    288,
    352,
    120,
    216,
    320,
    384,
    132,
    240,
    360,
    432,
    144,
    280,
    408,
    480,
    168,
    308,
    448,
    532,
    180,
    338,
    504,
    588,
    196,
    364,
    546,
    650,
    224,
    416,
    600,
    700,
    224,
    442,
    644,
    750,
    252,
    476,
    690,
    816,
    270,
    504,
    750,
    900,
    300,
    560,
    810,
    960,
    312,
    588,
    870,
    1050,
    336,
    644,
    952,
    1110,
    360,
    700,
    1020,
    1200,
    390,
    728,
    1050,
    1260,
    420,
    784,
    1140,
    1350,
    450,
    812,
    1200,
    1440,
    480,
    868,
    1290,
    1530,
    510,
    924,
    1350,
    1620,
    540,
    980,
    1440,
    1710,
    570,
    1036,
    1530,
    1800,
    570,
    1064,
    1590,
    1890,
    600,
    1120,
    1680,
    1980,
    630,
    1204,
    1770,
    2100,
    660,
    1260,
    1860,
    2220,
    720,
    1316,
    1950,
    2310,
    750,
    1372,
    2040,
    2430
  ];
  return en.getBlocksCount = function(o, a) {
    switch (a) {
      case e.L:
        return t[(o - 1) * 4 + 0];
      case e.M:
        return t[(o - 1) * 4 + 1];
      case e.Q:
        return t[(o - 1) * 4 + 2];
      case e.H:
        return t[(o - 1) * 4 + 3];
      default:
        return;
    }
  }, en.getTotalCodewordsCount = function(o, a) {
    switch (a) {
      case e.L:
        return r[(o - 1) * 4 + 0];
      case e.M:
        return r[(o - 1) * 4 + 1];
      case e.Q:
        return r[(o - 1) * 4 + 2];
      case e.H:
        return r[(o - 1) * 4 + 3];
      default:
        return;
    }
  }, en;
}
var or = {}, wt = {}, Bo;
function Y0() {
  if (Bo) return wt;
  Bo = 1;
  const e = new Uint8Array(512), t = new Uint8Array(256);
  return (function() {
    let n = 1;
    for (let o = 0; o < 255; o++)
      e[o] = n, t[n] = o, n <<= 1, n & 256 && (n ^= 285);
    for (let o = 255; o < 512; o++)
      e[o] = e[o - 255];
  })(), wt.log = function(n) {
    if (n < 1) throw new Error("log(" + n + ")");
    return t[n];
  }, wt.exp = function(n) {
    return e[n];
  }, wt.mul = function(n, o) {
    return n === 0 || o === 0 ? 0 : e[t[n] + t[o]];
  }, wt;
}
var Fo;
function j0() {
  return Fo || (Fo = 1, (function(e) {
    const t = Y0();
    e.mul = function(n, o) {
      const a = new Uint8Array(n.length + o.length - 1);
      for (let i = 0; i < n.length; i++)
        for (let s = 0; s < o.length; s++)
          a[i + s] ^= t.mul(n[i], o[s]);
      return a;
    }, e.mod = function(n, o) {
      let a = new Uint8Array(n);
      for (; a.length - o.length >= 0; ) {
        const i = a[0];
        for (let c = 0; c < o.length; c++)
          a[c] ^= t.mul(o[c], i);
        let s = 0;
        for (; s < a.length && a[s] === 0; ) s++;
        a = a.slice(s);
      }
      return a;
    }, e.generateECPolynomial = function(n) {
      let o = new Uint8Array([1]);
      for (let a = 0; a < n; a++)
        o = e.mul(o, new Uint8Array([1, t.exp(a)]));
      return o;
    };
  })(or)), or;
}
var ar, $o;
function X0() {
  if ($o) return ar;
  $o = 1;
  const e = j0();
  function t(r) {
    this.genPoly = void 0, this.degree = r, this.degree && this.initialize(this.degree);
  }
  return t.prototype.initialize = function(n) {
    this.degree = n, this.genPoly = e.generateECPolynomial(this.degree);
  }, t.prototype.encode = function(n) {
    if (!this.genPoly)
      throw new Error("Encoder not initialized");
    const o = new Uint8Array(n.length + this.degree);
    o.set(n);
    const a = e.mod(o, this.genPoly), i = this.degree - a.length;
    if (i > 0) {
      const s = new Uint8Array(this.degree);
      return s.set(a, i), s;
    }
    return a;
  }, ar = t, ar;
}
var ir = {}, sr = {}, cr = {}, ko;
function ni() {
  return ko || (ko = 1, cr.isValid = function(t) {
    return !isNaN(t) && t >= 1 && t <= 40;
  }), cr;
}
var me = {}, Vo;
function ri() {
  if (Vo) return me;
  Vo = 1;
  const e = "[0-9]+", t = "[A-Z $%*+\\-./:]+";
  let r = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
  r = r.replace(/u/g, "\\u");
  const n = "(?:(?![A-Z0-9 $%*+\\-./:]|" + r + `)(?:.|[\r
]))+`;
  me.KANJI = new RegExp(r, "g"), me.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g"), me.BYTE = new RegExp(n, "g"), me.NUMERIC = new RegExp(e, "g"), me.ALPHANUMERIC = new RegExp(t, "g");
  const o = new RegExp("^" + r + "$"), a = new RegExp("^" + e + "$"), i = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
  return me.testKanji = function(c) {
    return o.test(c);
  }, me.testNumeric = function(c) {
    return a.test(c);
  }, me.testAlphanumeric = function(c) {
    return i.test(c);
  }, me;
}
var Go;
function tt() {
  return Go || (Go = 1, (function(e) {
    const t = ni(), r = ri();
    e.NUMERIC = {
      id: "Numeric",
      bit: 1,
      ccBits: [10, 12, 14]
    }, e.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 2,
      ccBits: [9, 11, 13]
    }, e.BYTE = {
      id: "Byte",
      bit: 4,
      ccBits: [8, 16, 16]
    }, e.KANJI = {
      id: "Kanji",
      bit: 8,
      ccBits: [8, 10, 12]
    }, e.MIXED = {
      bit: -1
    }, e.getCharCountIndicator = function(a, i) {
      if (!a.ccBits) throw new Error("Invalid mode: " + a);
      if (!t.isValid(i))
        throw new Error("Invalid version: " + i);
      return i >= 1 && i < 10 ? a.ccBits[0] : i < 27 ? a.ccBits[1] : a.ccBits[2];
    }, e.getBestModeForData = function(a) {
      return r.testNumeric(a) ? e.NUMERIC : r.testAlphanumeric(a) ? e.ALPHANUMERIC : r.testKanji(a) ? e.KANJI : e.BYTE;
    }, e.toString = function(a) {
      if (a && a.id) return a.id;
      throw new Error("Invalid mode");
    }, e.isValid = function(a) {
      return a && a.bit && a.ccBits;
    };
    function n(o) {
      if (typeof o != "string")
        throw new Error("Param is not a string");
      switch (o.toLowerCase()) {
        case "numeric":
          return e.NUMERIC;
        case "alphanumeric":
          return e.ALPHANUMERIC;
        case "kanji":
          return e.KANJI;
        case "byte":
          return e.BYTE;
        default:
          throw new Error("Unknown mode: " + o);
      }
    }
    e.from = function(a, i) {
      if (e.isValid(a))
        return a;
      try {
        return n(a);
      } catch {
        return i;
      }
    };
  })(sr)), sr;
}
var Ho;
function Z0() {
  return Ho || (Ho = 1, (function(e) {
    const t = et(), r = ti(), n = jr(), o = tt(), a = ni(), i = 7973, s = t.getBCHDigit(i);
    function c(h, u, A) {
      for (let g = 1; g <= 40; g++)
        if (u <= e.getCapacity(g, A, h))
          return g;
    }
    function l(h, u) {
      return o.getCharCountIndicator(h, u) + 4;
    }
    function _(h, u) {
      let A = 0;
      return h.forEach(function(g) {
        const v = l(g.mode, u);
        A += v + g.getBitsLength();
      }), A;
    }
    function E(h, u) {
      for (let A = 1; A <= 40; A++)
        if (_(h, A) <= e.getCapacity(A, u, o.MIXED))
          return A;
    }
    e.from = function(u, A) {
      return a.isValid(u) ? parseInt(u, 10) : A;
    }, e.getCapacity = function(u, A, g) {
      if (!a.isValid(u))
        throw new Error("Invalid QR Code version");
      typeof g > "u" && (g = o.BYTE);
      const v = t.getSymbolTotalCodewords(u), S = r.getTotalCodewordsCount(u, A), D = (v - S) * 8;
      if (g === o.MIXED) return D;
      const L = D - l(g, u);
      switch (g) {
        case o.NUMERIC:
          return Math.floor(L / 10 * 3);
        case o.ALPHANUMERIC:
          return Math.floor(L / 11 * 2);
        case o.KANJI:
          return Math.floor(L / 13);
        case o.BYTE:
        default:
          return Math.floor(L / 8);
      }
    }, e.getBestVersionForData = function(u, A) {
      let g;
      const v = n.from(A, n.M);
      if (Array.isArray(u)) {
        if (u.length > 1)
          return E(u, v);
        if (u.length === 0)
          return 1;
        g = u[0];
      } else
        g = u;
      return c(g.mode, g.getLength(), v);
    }, e.getEncodedBits = function(u) {
      if (!a.isValid(u) || u < 7)
        throw new Error("Invalid QR Code version");
      let A = u << 12;
      for (; t.getBCHDigit(A) - s >= 0; )
        A ^= i << t.getBCHDigit(A) - s;
      return u << 12 | A;
    };
  })(ir)), ir;
}
var lr = {}, qo;
function J0() {
  if (qo) return lr;
  qo = 1;
  const e = et(), t = 1335, r = 21522, n = e.getBCHDigit(t);
  return lr.getEncodedBits = function(a, i) {
    const s = a.bit << 3 | i;
    let c = s << 10;
    for (; e.getBCHDigit(c) - n >= 0; )
      c ^= t << e.getBCHDigit(c) - n;
    return (s << 10 | c) ^ r;
  }, lr;
}
var dr = {}, _r, zo;
function Q0() {
  if (zo) return _r;
  zo = 1;
  const e = tt();
  function t(r) {
    this.mode = e.NUMERIC, this.data = r.toString();
  }
  return t.getBitsLength = function(n) {
    return 10 * Math.floor(n / 3) + (n % 3 ? n % 3 * 3 + 1 : 0);
  }, t.prototype.getLength = function() {
    return this.data.length;
  }, t.prototype.getBitsLength = function() {
    return t.getBitsLength(this.data.length);
  }, t.prototype.write = function(n) {
    let o, a, i;
    for (o = 0; o + 3 <= this.data.length; o += 3)
      a = this.data.substr(o, 3), i = parseInt(a, 10), n.put(i, 10);
    const s = this.data.length - o;
    s > 0 && (a = this.data.substr(o), i = parseInt(a, 10), n.put(i, s * 3 + 1));
  }, _r = t, _r;
}
var ur, Ko;
function eh() {
  if (Ko) return ur;
  Ko = 1;
  const e = tt(), t = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    " ",
    "$",
    "%",
    "*",
    "+",
    "-",
    ".",
    "/",
    ":"
  ];
  function r(n) {
    this.mode = e.ALPHANUMERIC, this.data = n;
  }
  return r.getBitsLength = function(o) {
    return 11 * Math.floor(o / 2) + 6 * (o % 2);
  }, r.prototype.getLength = function() {
    return this.data.length;
  }, r.prototype.getBitsLength = function() {
    return r.getBitsLength(this.data.length);
  }, r.prototype.write = function(o) {
    let a;
    for (a = 0; a + 2 <= this.data.length; a += 2) {
      let i = t.indexOf(this.data[a]) * 45;
      i += t.indexOf(this.data[a + 1]), o.put(i, 11);
    }
    this.data.length % 2 && o.put(t.indexOf(this.data[a]), 6);
  }, ur = r, ur;
}
var Rr, Wo;
function th() {
  if (Wo) return Rr;
  Wo = 1;
  const e = tt();
  function t(r) {
    this.mode = e.BYTE, typeof r == "string" ? this.data = new TextEncoder().encode(r) : this.data = new Uint8Array(r);
  }
  return t.getBitsLength = function(n) {
    return n * 8;
  }, t.prototype.getLength = function() {
    return this.data.length;
  }, t.prototype.getBitsLength = function() {
    return t.getBitsLength(this.data.length);
  }, t.prototype.write = function(r) {
    for (let n = 0, o = this.data.length; n < o; n++)
      r.put(this.data[n], 8);
  }, Rr = t, Rr;
}
var hr, Yo;
function nh() {
  if (Yo) return hr;
  Yo = 1;
  const e = tt(), t = et();
  function r(n) {
    this.mode = e.KANJI, this.data = n;
  }
  return r.getBitsLength = function(o) {
    return o * 13;
  }, r.prototype.getLength = function() {
    return this.data.length;
  }, r.prototype.getBitsLength = function() {
    return r.getBitsLength(this.data.length);
  }, r.prototype.write = function(n) {
    let o;
    for (o = 0; o < this.data.length; o++) {
      let a = t.toSJIS(this.data[o]);
      if (a >= 33088 && a <= 40956)
        a -= 33088;
      else if (a >= 57408 && a <= 60351)
        a -= 49472;
      else
        throw new Error(
          "Invalid SJIS character: " + this.data[o] + `
Make sure your charset is UTF-8`
        );
      a = (a >>> 8 & 255) * 192 + (a & 255), n.put(a, 13);
    }
  }, hr = r, hr;
}
var Er = { exports: {} }, jo;
function rh() {
  return jo || (jo = 1, (function(e) {
    var t = {
      single_source_shortest_paths: function(r, n, o) {
        var a = {}, i = {};
        i[n] = 0;
        var s = t.PriorityQueue.make();
        s.push(n, 0);
        for (var c, l, _, E, h, u, A, g, v; !s.empty(); ) {
          c = s.pop(), l = c.value, E = c.cost, h = r[l] || {};
          for (_ in h)
            h.hasOwnProperty(_) && (u = h[_], A = E + u, g = i[_], v = typeof i[_] > "u", (v || g > A) && (i[_] = A, s.push(_, A), a[_] = l));
        }
        if (typeof o < "u" && typeof i[o] > "u") {
          var S = ["Could not find a path from ", n, " to ", o, "."].join("");
          throw new Error(S);
        }
        return a;
      },
      extract_shortest_path_from_predecessor_list: function(r, n) {
        for (var o = [], a = n; a; )
          o.push(a), r[a], a = r[a];
        return o.reverse(), o;
      },
      find_path: function(r, n, o) {
        var a = t.single_source_shortest_paths(r, n, o);
        return t.extract_shortest_path_from_predecessor_list(
          a,
          o
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(r) {
          var n = t.PriorityQueue, o = {}, a;
          r = r || {};
          for (a in n)
            n.hasOwnProperty(a) && (o[a] = n[a]);
          return o.queue = [], o.sorter = r.sorter || n.default_sorter, o;
        },
        default_sorter: function(r, n) {
          return r.cost - n.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(r, n) {
          var o = { value: r, cost: n };
          this.queue.push(o), this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    e.exports = t;
  })(Er)), Er.exports;
}
var Xo;
function oh() {
  return Xo || (Xo = 1, (function(e) {
    const t = tt(), r = Q0(), n = eh(), o = th(), a = nh(), i = ri(), s = et(), c = rh();
    function l(S) {
      return unescape(encodeURIComponent(S)).length;
    }
    function _(S, D, L) {
      const T = [];
      let F;
      for (; (F = S.exec(L)) !== null; )
        T.push({
          data: F[0],
          index: F.index,
          mode: D,
          length: F[0].length
        });
      return T;
    }
    function E(S) {
      const D = _(i.NUMERIC, t.NUMERIC, S), L = _(i.ALPHANUMERIC, t.ALPHANUMERIC, S);
      let T, F;
      return s.isKanjiModeEnabled() ? (T = _(i.BYTE, t.BYTE, S), F = _(i.KANJI, t.KANJI, S)) : (T = _(i.BYTE_KANJI, t.BYTE, S), F = []), D.concat(L, T, F).sort(function(f, O) {
        return f.index - O.index;
      }).map(function(f) {
        return {
          data: f.data,
          mode: f.mode,
          length: f.length
        };
      });
    }
    function h(S, D) {
      switch (D) {
        case t.NUMERIC:
          return r.getBitsLength(S);
        case t.ALPHANUMERIC:
          return n.getBitsLength(S);
        case t.KANJI:
          return a.getBitsLength(S);
        case t.BYTE:
          return o.getBitsLength(S);
      }
    }
    function u(S) {
      return S.reduce(function(D, L) {
        const T = D.length - 1 >= 0 ? D[D.length - 1] : null;
        return T && T.mode === L.mode ? (D[D.length - 1].data += L.data, D) : (D.push(L), D);
      }, []);
    }
    function A(S) {
      const D = [];
      for (let L = 0; L < S.length; L++) {
        const T = S[L];
        switch (T.mode) {
          case t.NUMERIC:
            D.push([
              T,
              { data: T.data, mode: t.ALPHANUMERIC, length: T.length },
              { data: T.data, mode: t.BYTE, length: T.length }
            ]);
            break;
          case t.ALPHANUMERIC:
            D.push([
              T,
              { data: T.data, mode: t.BYTE, length: T.length }
            ]);
            break;
          case t.KANJI:
            D.push([
              T,
              { data: T.data, mode: t.BYTE, length: l(T.data) }
            ]);
            break;
          case t.BYTE:
            D.push([
              { data: T.data, mode: t.BYTE, length: l(T.data) }
            ]);
        }
      }
      return D;
    }
    function g(S, D) {
      const L = {}, T = { start: {} };
      let F = ["start"];
      for (let R = 0; R < S.length; R++) {
        const f = S[R], O = [];
        for (let p = 0; p < f.length; p++) {
          const C = f[p], x = "" + R + p;
          O.push(x), L[x] = { node: C, lastCount: 0 }, T[x] = {};
          for (let w = 0; w < F.length; w++) {
            const b = F[w];
            L[b] && L[b].node.mode === C.mode ? (T[b][x] = h(L[b].lastCount + C.length, C.mode) - h(L[b].lastCount, C.mode), L[b].lastCount += C.length) : (L[b] && (L[b].lastCount = C.length), T[b][x] = h(C.length, C.mode) + 4 + t.getCharCountIndicator(C.mode, D));
          }
        }
        F = O;
      }
      for (let R = 0; R < F.length; R++)
        T[F[R]].end = 0;
      return { map: T, table: L };
    }
    function v(S, D) {
      let L;
      const T = t.getBestModeForData(S);
      if (L = t.from(D, T), L !== t.BYTE && L.bit < T.bit)
        throw new Error('"' + S + '" cannot be encoded with mode ' + t.toString(L) + `.
 Suggested mode is: ` + t.toString(T));
      switch (L === t.KANJI && !s.isKanjiModeEnabled() && (L = t.BYTE), L) {
        case t.NUMERIC:
          return new r(S);
        case t.ALPHANUMERIC:
          return new n(S);
        case t.KANJI:
          return new a(S);
        case t.BYTE:
          return new o(S);
      }
    }
    e.fromArray = function(D) {
      return D.reduce(function(L, T) {
        return typeof T == "string" ? L.push(v(T, null)) : T.data && L.push(v(T.data, T.mode)), L;
      }, []);
    }, e.fromString = function(D, L) {
      const T = E(D, s.isKanjiModeEnabled()), F = A(T), R = g(F, L), f = c.find_path(R.map, "start", "end"), O = [];
      for (let p = 1; p < f.length - 1; p++)
        O.push(R.table[f[p]].node);
      return e.fromArray(u(O));
    }, e.rawSplit = function(D) {
      return e.fromArray(
        E(D, s.isKanjiModeEnabled())
      );
    };
  })(dr)), dr;
}
var Zo;
function ah() {
  if (Zo) return Zn;
  Zo = 1;
  const e = et(), t = jr(), r = H0(), n = q0(), o = z0(), a = K0(), i = W0(), s = ti(), c = X0(), l = Z0(), _ = J0(), E = tt(), h = oh();
  function u(R, f) {
    const O = R.size, p = a.getPositions(f);
    for (let C = 0; C < p.length; C++) {
      const x = p[C][0], w = p[C][1];
      for (let b = -1; b <= 7; b++)
        if (!(x + b <= -1 || O <= x + b))
          for (let U = -1; U <= 7; U++)
            w + U <= -1 || O <= w + U || (b >= 0 && b <= 6 && (U === 0 || U === 6) || U >= 0 && U <= 6 && (b === 0 || b === 6) || b >= 2 && b <= 4 && U >= 2 && U <= 4 ? R.set(x + b, w + U, !0, !0) : R.set(x + b, w + U, !1, !0));
    }
  }
  function A(R) {
    const f = R.size;
    for (let O = 8; O < f - 8; O++) {
      const p = O % 2 === 0;
      R.set(O, 6, p, !0), R.set(6, O, p, !0);
    }
  }
  function g(R, f) {
    const O = o.getPositions(f);
    for (let p = 0; p < O.length; p++) {
      const C = O[p][0], x = O[p][1];
      for (let w = -2; w <= 2; w++)
        for (let b = -2; b <= 2; b++)
          w === -2 || w === 2 || b === -2 || b === 2 || w === 0 && b === 0 ? R.set(C + w, x + b, !0, !0) : R.set(C + w, x + b, !1, !0);
    }
  }
  function v(R, f) {
    const O = R.size, p = l.getEncodedBits(f);
    let C, x, w;
    for (let b = 0; b < 18; b++)
      C = Math.floor(b / 3), x = b % 3 + O - 8 - 3, w = (p >> b & 1) === 1, R.set(C, x, w, !0), R.set(x, C, w, !0);
  }
  function S(R, f, O) {
    const p = R.size, C = _.getEncodedBits(f, O);
    let x, w;
    for (x = 0; x < 15; x++)
      w = (C >> x & 1) === 1, x < 6 ? R.set(x, 8, w, !0) : x < 8 ? R.set(x + 1, 8, w, !0) : R.set(p - 15 + x, 8, w, !0), x < 8 ? R.set(8, p - x - 1, w, !0) : x < 9 ? R.set(8, 15 - x - 1 + 1, w, !0) : R.set(8, 15 - x - 1, w, !0);
    R.set(p - 8, 8, 1, !0);
  }
  function D(R, f) {
    const O = R.size;
    let p = -1, C = O - 1, x = 7, w = 0;
    for (let b = O - 1; b > 0; b -= 2)
      for (b === 6 && b--; ; ) {
        for (let U = 0; U < 2; U++)
          if (!R.isReserved(C, b - U)) {
            let Q = !1;
            w < f.length && (Q = (f[w] >>> x & 1) === 1), R.set(C, b - U, Q), x--, x === -1 && (w++, x = 7);
          }
        if (C += p, C < 0 || O <= C) {
          C -= p, p = -p;
          break;
        }
      }
  }
  function L(R, f, O) {
    const p = new r();
    O.forEach(function(U) {
      p.put(U.mode.bit, 4), p.put(U.getLength(), E.getCharCountIndicator(U.mode, R)), U.write(p);
    });
    const C = e.getSymbolTotalCodewords(R), x = s.getTotalCodewordsCount(R, f), w = (C - x) * 8;
    for (p.getLengthInBits() + 4 <= w && p.put(0, 4); p.getLengthInBits() % 8 !== 0; )
      p.putBit(0);
    const b = (w - p.getLengthInBits()) / 8;
    for (let U = 0; U < b; U++)
      p.put(U % 2 ? 17 : 236, 8);
    return T(p, R, f);
  }
  function T(R, f, O) {
    const p = e.getSymbolTotalCodewords(f), C = s.getTotalCodewordsCount(f, O), x = p - C, w = s.getBlocksCount(f, O), b = p % w, U = w - b, Q = Math.floor(p / w), Y = Math.floor(x / w), X = Y + 1, oe = Q - Y, J = new c(oe);
    let $ = 0;
    const k = new Array(w), m = new Array(w);
    let I = 0;
    const M = new Uint8Array(R.buffer);
    for (let H = 0; H < w; H++) {
      const j = H < U ? Y : X;
      k[H] = M.slice($, $ + j), m[H] = J.encode(k[H]), $ += j, I = Math.max(I, j);
    }
    const B = new Uint8Array(p);
    let z = 0, P, K;
    for (P = 0; P < I; P++)
      for (K = 0; K < w; K++)
        P < k[K].length && (B[z++] = k[K][P]);
    for (P = 0; P < oe; P++)
      for (K = 0; K < w; K++)
        B[z++] = m[K][P];
    return B;
  }
  function F(R, f, O, p) {
    let C;
    if (Array.isArray(R))
      C = h.fromArray(R);
    else if (typeof R == "string") {
      let Q = f;
      if (!Q) {
        const Y = h.rawSplit(R);
        Q = l.getBestVersionForData(Y, O);
      }
      C = h.fromString(R, Q || 40);
    } else
      throw new Error("Invalid data");
    const x = l.getBestVersionForData(C, O);
    if (!x)
      throw new Error("The amount of data is too big to be stored in a QR Code");
    if (!f)
      f = x;
    else if (f < x)
      throw new Error(
        `
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: ` + x + `.
`
      );
    const w = L(f, O, C), b = e.getSymbolSize(f), U = new n(b);
    return u(U, f), A(U), g(U, f), S(U, O, 0), f >= 7 && v(U, f), D(U, w), isNaN(p) && (p = i.getBestMask(
      U,
      S.bind(null, U, O)
    )), i.applyMask(p, U), S(U, O, p), {
      modules: U,
      version: f,
      errorCorrectionLevel: O,
      maskPattern: p,
      segments: C
    };
  }
  return Zn.create = function(f, O) {
    if (typeof f > "u" || f === "")
      throw new Error("No input text");
    let p = t.M, C, x;
    return typeof O < "u" && (p = t.from(O.errorCorrectionLevel, t.M), C = l.from(O.version), x = i.from(O.maskPattern), O.toSJISFunc && e.setToSJISFunction(O.toSJISFunc)), F(f, C, p, x);
  }, Zn;
}
var fr = {}, Ar = {}, Jo;
function oi() {
  return Jo || (Jo = 1, (function(e) {
    function t(r) {
      if (typeof r == "number" && (r = r.toString()), typeof r != "string")
        throw new Error("Color should be defined as hex string");
      let n = r.slice().replace("#", "").split("");
      if (n.length < 3 || n.length === 5 || n.length > 8)
        throw new Error("Invalid hex color: " + r);
      (n.length === 3 || n.length === 4) && (n = Array.prototype.concat.apply([], n.map(function(a) {
        return [a, a];
      }))), n.length === 6 && n.push("F", "F");
      const o = parseInt(n.join(""), 16);
      return {
        r: o >> 24 & 255,
        g: o >> 16 & 255,
        b: o >> 8 & 255,
        a: o & 255,
        hex: "#" + n.slice(0, 6).join("")
      };
    }
    e.getOptions = function(n) {
      n || (n = {}), n.color || (n.color = {});
      const o = typeof n.margin > "u" || n.margin === null || n.margin < 0 ? 4 : n.margin, a = n.width && n.width >= 21 ? n.width : void 0, i = n.scale || 4;
      return {
        width: a,
        scale: a ? 4 : i,
        margin: o,
        color: {
          dark: t(n.color.dark || "#000000ff"),
          light: t(n.color.light || "#ffffffff")
        },
        type: n.type,
        rendererOpts: n.rendererOpts || {}
      };
    }, e.getScale = function(n, o) {
      return o.width && o.width >= n + o.margin * 2 ? o.width / (n + o.margin * 2) : o.scale;
    }, e.getImageWidth = function(n, o) {
      const a = e.getScale(n, o);
      return Math.floor((n + o.margin * 2) * a);
    }, e.qrToImageData = function(n, o, a) {
      const i = o.modules.size, s = o.modules.data, c = e.getScale(i, a), l = Math.floor((i + a.margin * 2) * c), _ = a.margin * c, E = [a.color.light, a.color.dark];
      for (let h = 0; h < l; h++)
        for (let u = 0; u < l; u++) {
          let A = (h * l + u) * 4, g = a.color.light;
          if (h >= _ && u >= _ && h < l - _ && u < l - _) {
            const v = Math.floor((h - _) / c), S = Math.floor((u - _) / c);
            g = E[s[v * i + S] ? 1 : 0];
          }
          n[A++] = g.r, n[A++] = g.g, n[A++] = g.b, n[A] = g.a;
        }
    };
  })(Ar)), Ar;
}
var Qo;
function ih() {
  return Qo || (Qo = 1, (function(e) {
    const t = oi();
    function r(o, a, i) {
      o.clearRect(0, 0, a.width, a.height), a.style || (a.style = {}), a.height = i, a.width = i, a.style.height = i + "px", a.style.width = i + "px";
    }
    function n() {
      try {
        return document.createElement("canvas");
      } catch {
        throw new Error("You need to specify a canvas element");
      }
    }
    e.render = function(a, i, s) {
      let c = s, l = i;
      typeof c > "u" && (!i || !i.getContext) && (c = i, i = void 0), i || (l = n()), c = t.getOptions(c);
      const _ = t.getImageWidth(a.modules.size, c), E = l.getContext("2d"), h = E.createImageData(_, _);
      return t.qrToImageData(h.data, a, c), r(E, l, _), E.putImageData(h, 0, 0), l;
    }, e.renderToDataURL = function(a, i, s) {
      let c = s;
      typeof c > "u" && (!i || !i.getContext) && (c = i, i = void 0), c || (c = {});
      const l = e.render(a, i, c), _ = c.type || "image/png", E = c.rendererOpts || {};
      return l.toDataURL(_, E.quality);
    };
  })(fr)), fr;
}
var Or = {}, ea;
function sh() {
  if (ea) return Or;
  ea = 1;
  const e = oi();
  function t(o, a) {
    const i = o.a / 255, s = a + '="' + o.hex + '"';
    return i < 1 ? s + " " + a + '-opacity="' + i.toFixed(2).slice(1) + '"' : s;
  }
  function r(o, a, i) {
    let s = o + a;
    return typeof i < "u" && (s += " " + i), s;
  }
  function n(o, a, i) {
    let s = "", c = 0, l = !1, _ = 0;
    for (let E = 0; E < o.length; E++) {
      const h = Math.floor(E % a), u = Math.floor(E / a);
      !h && !l && (l = !0), o[E] ? (_++, E > 0 && h > 0 && o[E - 1] || (s += l ? r("M", h + i, 0.5 + u + i) : r("m", c, 0), c = 0, l = !1), h + 1 < a && o[E + 1] || (s += r("h", _), _ = 0)) : c++;
    }
    return s;
  }
  return Or.render = function(a, i, s) {
    const c = e.getOptions(i), l = a.modules.size, _ = a.modules.data, E = l + c.margin * 2, h = c.color.light.a ? "<path " + t(c.color.light, "fill") + ' d="M0 0h' + E + "v" + E + 'H0z"/>' : "", u = "<path " + t(c.color.dark, "stroke") + ' d="' + n(_, l, c.margin) + '"/>', A = 'viewBox="0 0 ' + E + " " + E + '"', v = '<svg xmlns="http://www.w3.org/2000/svg" ' + (c.width ? 'width="' + c.width + '" height="' + c.width + '" ' : "") + A + ' shape-rendering="crispEdges">' + h + u + `</svg>
`;
    return typeof s == "function" && s(null, v), v;
  }, Or;
}
var ta;
function ch() {
  if (ta) return ot;
  ta = 1;
  const e = G0(), t = ah(), r = ih(), n = sh();
  function o(a, i, s, c, l) {
    const _ = [].slice.call(arguments, 1), E = _.length, h = typeof _[E - 1] == "function";
    if (!h && !e())
      throw new Error("Callback required as last argument");
    if (h) {
      if (E < 2)
        throw new Error("Too few arguments provided");
      E === 2 ? (l = s, s = i, i = c = void 0) : E === 3 && (i.getContext && typeof l > "u" ? (l = c, c = void 0) : (l = c, c = s, s = i, i = void 0));
    } else {
      if (E < 1)
        throw new Error("Too few arguments provided");
      return E === 1 ? (s = i, i = c = void 0) : E === 2 && !i.getContext && (c = s, s = i, i = void 0), new Promise(function(u, A) {
        try {
          const g = t.create(s, c);
          u(a(g, i, c));
        } catch (g) {
          A(g);
        }
      });
    }
    try {
      const u = t.create(s, c);
      l(null, a(u, i, c));
    } catch (u) {
      l(u);
    }
  }
  return ot.create = t.create, ot.toCanvas = o.bind(null, r.render), ot.toDataURL = o.bind(null, r.renderToDataURL), ot.toString = o.bind(null, function(a, i, s) {
    return n.render(a, s);
  }), ot;
}
var lh = ch();
const dh = /* @__PURE__ */ V0(lh), pr = "SolanaMobileWalletAdapterDefaultAuthorizationCache";
function Xr() {
  let e;
  try {
    e = window.localStorage;
  } catch {
  }
  return {
    async clear() {
      if (e)
        try {
          e.removeItem(pr);
        } catch {
        }
    },
    async get() {
      if (e)
        try {
          const t = JSON.parse(e.getItem(pr));
          if (t && t.accounts) {
            const r = t.accounts.map((n) => ({
              ...n,
              publicKey: "publicKey" in n ? new Uint8Array(Object.values(n.publicKey)) : eR(n.address)
            }));
            return {
              ...t,
              accounts: r
            };
          } else return t || void 0;
        } catch {
        }
    },
    async set(t) {
      if (e)
        try {
          e.setItem(pr, JSON.stringify(t));
        } catch {
        }
    }
  };
}
function Zr() {
  return { async select(e) {
    return e.length === 1 ? e[0] : e.includes(io) ? io : e[0];
  } };
}
const _h = `
<div class="mobile-wallet-adapter-embedded-modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div data-modal-close style="position: absolute; width: 100%; height: 100%;"></div>
	<div class="mobile-wallet-adapter-embedded-modal-card">
		<div>
			<button data-modal-close class="mobile-wallet-adapter-embedded-modal-close">
				<svg width="14" height="14">
					<path d="M 6.7125,8.3036995 1.9082,13.108199 c -0.2113,0.2112 -0.4765,0.3168 -0.7957,0.3168 -0.3192,0 -0.5844,-0.1056 -0.7958,-0.3168 C 0.1056,12.896899 0,12.631699 0,12.312499 c 0,-0.3192 0.1056,-0.5844 0.3167,-0.7958 L 5.1212,6.7124995 0.3167,1.9082 C 0.1056,1.6969 0,1.4317 0,1.1125 0,0.7933 0.1056,0.5281 0.3167,0.3167 0.5281,0.1056 0.7933,0 1.1125,0 1.4317,0 1.6969,0.1056 1.9082,0.3167 L 6.7125,5.1212 11.5167,0.3167 C 11.7281,0.1056 11.9933,0 12.3125,0 c 0.3192,0 0.5844,0.1056 0.7957,0.3167 0.2112,0.2114 0.3168,0.4766 0.3168,0.7958 0,0.3192 -0.1056,0.5844 -0.3168,0.7957 L 8.3037001,6.7124995 13.1082,11.516699 c 0.2112,0.2114 0.3168,0.4766 0.3168,0.7958 0,0.3192 -0.1056,0.5844 -0.3168,0.7957 -0.2113,0.2112 -0.4765,0.3168 -0.7957,0.3168 -0.3192,0 -0.5844,-0.1056 -0.7958,-0.3168 z" />
				</svg>
			</button>
		</div>
		<div class="mobile-wallet-adapter-embedded-modal-content"></div>
	</div>
</div>
`, uh = `
.mobile-wallet-adapter-embedded-modal-container {
    display: flex; /* Use flexbox to center content */
    justify-content: center; /* Center horizontally */
    align-items: center; /* Center vertically */
    position: fixed; /* Stay in place */
    z-index: 2147483647; /* Sit on top */
    left: 0;
    top: 0;
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
    overflow-y: auto; /* enable scrolling */
}

.mobile-wallet-adapter-embedded-modal-card {
    display: flex;
    flex-direction: column;
    margin: auto 20px;
    max-width: 780px;
    padding: 20px;
    border-radius: 24px;
    background: #ffffff;
    font-family: "Inter Tight", "PT Sans", Calibri, sans-serif;
    transform: translateY(-200%);
    animation: slide-in 0.5s forwards;
}

@keyframes slide-in {
    100% { transform: translateY(0%); }
}

.mobile-wallet-adapter-embedded-modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    cursor: pointer;
    background: #e4e9e9;
    border: none;
    border-radius: 50%;
}

.mobile-wallet-adapter-embedded-modal-close:focus-visible {
    outline-color: red;
}

.mobile-wallet-adapter-embedded-modal-close svg {
    fill: #546266;
    transition: fill 200ms ease 0s;
}

.mobile-wallet-adapter-embedded-modal-close:hover svg {
    fill: #fff;
}
`, Rh = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
`;
var ee, ve, qe, Ve, ai, ii, si, Mt, oa, Qt = (oa = class {
  constructor() {
    N(this, Ve);
    N(this, ee, null);
    N(this, ve, {});
    N(this, qe, !1);
    y(this, "dom", null);
    y(this, "open", () => {
      console.debug("Modal open"), ne(this, Ve, ii).call(this), d(this, ee) && (d(this, ee).style.display = "flex");
    });
    y(this, "close", (e = void 0) => {
      console.debug("Modal close"), ne(this, Ve, si).call(this), d(this, ee) && (d(this, ee).style.display = "none"), d(this, ve).close?.forEach((t) => t(e));
    });
    N(this, Mt, (e) => {
      e.key === "Escape" && this.close(e);
    });
    this.init = this.init.bind(this), V(this, ee, document.getElementById("mobile-wallet-adapter-embedded-root-ui"));
  }
  async init() {
    console.log("Injecting modal"), ne(this, Ve, ai).call(this);
  }
  addEventListener(e, t) {
    return d(this, ve)[e]?.push(t) || (d(this, ve)[e] = [t]), () => this.removeEventListener(e, t);
  }
  removeEventListener(e, t) {
    d(this, ve)[e] = d(this, ve)[e]?.filter((r) => t !== r);
  }
}, ee = new WeakMap(), ve = new WeakMap(), qe = new WeakMap(), Ve = new WeakSet(), ai = function() {
  if (document.getElementById("mobile-wallet-adapter-embedded-root-ui")) {
    d(this, ee) || V(this, ee, document.getElementById("mobile-wallet-adapter-embedded-root-ui"));
    return;
  }
  V(this, ee, document.createElement("div")), d(this, ee).id = "mobile-wallet-adapter-embedded-root-ui", d(this, ee).innerHTML = _h, d(this, ee).style.display = "none";
  const e = d(this, ee).querySelector(".mobile-wallet-adapter-embedded-modal-content");
  e && (e.innerHTML = this.contentHtml);
  const t = document.createElement("style");
  t.id = "mobile-wallet-adapter-embedded-modal-styles", t.textContent = uh + this.contentStyles;
  const r = document.createElement("div");
  r.innerHTML = Rh, this.dom = r.attachShadow({ mode: "closed" }), this.dom.appendChild(t), this.dom.appendChild(d(this, ee)), document.body.appendChild(r);
}, ii = function() {
  !d(this, ee) || d(this, qe) || ([...d(this, ee).querySelectorAll("[data-modal-close]")].forEach((e) => e?.addEventListener("click", this.close)), window.addEventListener("load", this.close), document.addEventListener("keydown", d(this, Mt)), V(this, qe, !0));
}, si = function() {
  d(this, qe) && (window.removeEventListener("load", this.close), document.removeEventListener("keydown", d(this, Mt)), d(this, ee) && ([...d(this, ee).querySelectorAll("[data-modal-close]")].forEach((e) => e?.removeEventListener("click", this.close)), V(this, qe, !1)));
}, Mt = new WeakMap(), oa);
const hh = "To use mobile wallet adapter, you must have a compatible mobile wallet application installed on your device.", Eh = "This browser appears to be incompatible with mobile wallet adapter. Open this page in a compatible mobile browser app and try again.";
var fh = class extends Qt {
  constructor() {
    super(...arguments);
    y(this, "contentStyles", Oh);
    y(this, "contentHtml", Ah);
  }
  initWithError(t) {
    super.init(), this.populateError(t);
  }
  populateError(t) {
    const r = this.dom?.getElementById("mobile-wallet-adapter-error-message"), n = this.dom?.getElementById("mobile-wallet-adapter-error-action");
    if (r) {
      if (t.name === "SolanaMobileWalletAdapterError") switch (t.code) {
        case "ERROR_WALLET_NOT_FOUND":
          r.innerHTML = hh, n && n.addEventListener("click", () => {
            window.location.href = "https://solanamobile.com/wallets";
          });
          return;
        case "ERROR_BROWSER_NOT_SUPPORTED":
          r.innerHTML = Eh, n && (n.style.display = "none");
          return;
      }
      r.innerHTML = `An unexpected error occurred: ${t.message}`;
    } else console.log("Failed to locate error dialog element");
  }
};
const Ah = `
<svg class="mobile-wallet-adapter-embedded-modal-error-icon" xmlns="http://www.w3.org/2000/svg" height="50px" viewBox="0 -960 960 960" width="50px" fill="#000000"><path d="M 280,-80 Q 197,-80 138.5,-138.5 80,-197 80,-280 80,-363 138.5,-421.5 197,-480 280,-480 q 83,0 141.5,58.5 58.5,58.5 58.5,141.5 0,83 -58.5,141.5 Q 363,-80 280,-80 Z M 824,-120 568,-376 Q 556,-389 542.5,-402.5 529,-416 516,-428 q 38,-24 61,-64 23,-40 23,-88 0,-75 -52.5,-127.5 Q 495,-760 420,-760 345,-760 292.5,-707.5 240,-655 240,-580 q 0,6 0.5,11.5 0.5,5.5 1.5,11.5 -18,2 -39.5,8 -21.5,6 -38.5,14 -2,-11 -3,-22 -1,-11 -1,-23 0,-109 75.5,-184.5 Q 311,-840 420,-840 q 109,0 184.5,75.5 75.5,75.5 75.5,184.5 0,43 -13.5,81.5 Q 653,-460 629,-428 l 251,252 z m -615,-61 71,-71 70,71 29,-28 -71,-71 71,-71 -28,-28 -71,71 -71,-71 -28,28 71,71 -71,71 z"/></svg>
<div class="mobile-wallet-adapter-embedded-modal-title">We can't find a wallet.</div>
<div id="mobile-wallet-adapter-error-message" class="mobile-wallet-adapter-embedded-modal-subtitle"></div>
<div>
    <button data-error-action id="mobile-wallet-adapter-error-action" class="mobile-wallet-adapter-embedded-modal-error-action">
        Find a wallet
    </button>
</div>
`, Oh = `
.mobile-wallet-adapter-embedded-modal-content {
    text-align: center;
}

.mobile-wallet-adapter-embedded-modal-error-icon {
    margin-top: 24px;
}

.mobile-wallet-adapter-embedded-modal-title {
    margin: 18px 100px auto 100px;
    color: #000000;
    font-size: 2.75em;
    font-weight: 600;
}

.mobile-wallet-adapter-embedded-modal-subtitle {
    margin: 30px 60px 40px 60px;
    color: #000000;
    font-size: 1.25em;
    font-weight: 400;
}

.mobile-wallet-adapter-embedded-modal-error-action {
    display: block;
    width: 100%;
    height: 56px;
    /*margin-top: 40px;*/
    font-size: 1.25em;
    /*line-height: 24px;*/
    /*letter-spacing: -1%;*/
    background: #000000;
    color: #FFFFFF;
    border-radius: 18px;
}

/* Smaller screens */
@media all and (max-width: 600px) {
    .mobile-wallet-adapter-embedded-modal-title {
        font-size: 1.5em;
        margin-right: 12px;
        margin-left: 12px;
    }
    .mobile-wallet-adapter-embedded-modal-subtitle {
        margin-right: 12px;
        margin-left: 12px;
    }
}
`;
async function ph() {
  if (typeof window < "u") {
    const e = window.navigator.userAgent.toLowerCase(), t = new fh();
    e.includes("wv") ? t.initWithError({
      name: "SolanaMobileWalletAdapterError",
      code: "ERROR_BROWSER_NOT_SUPPORTED",
      message: ""
    }) : t.initWithError({
      name: "SolanaMobileWalletAdapterError",
      code: "ERROR_WALLET_NOT_FOUND",
      message: ""
    }), t.open();
  }
}
function Jr() {
  return async () => {
    ph();
  };
}
var un, ci, aa, mh = (aa = class extends Qt {
  constructor() {
    super(...arguments);
    N(this, un);
    y(this, "contentStyles", Nh);
    y(this, "contentHtml", gh);
  }
  initWithCallback(t) {
    super.init(), ne(this, un, ci).call(this, t);
  }
}, un = new WeakSet(), ci = function(t) {
  const r = this.dom?.getElementById("mobile-wallet-adapter-launch-action"), n = async () => {
    r?.removeEventListener("click", n), this.close(), t();
  };
  r?.addEventListener("click", n);
}, aa);
const gh = `
<svg class="mobile-wallet-adapter-embedded-modal-launch-icon" width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.6 48C7.2 48 0 40.8 0 26.4V21.6C0 7.2 7.2 0 21.6 0H26.4C40.8 0 48 7.2 48 21.6V26.4C48 40.8 40.8 48 26.4 48H21.6Z" fill="#15994E"/>
    <mask id="mask0_189_522" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="8" y="8" width="32" height="32">
        <rect x="8" y="8" width="32" height="32" fill="#D9D9D9"/>
    </mask>
    <g mask="url(#mask0_189_522)">
        <mask id="mask1_189_522" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="8" y="8" width="32" height="32">
            <rect x="8" y="8" width="32" height="32" fill="#D9D9D9"/>
        </mask>
        <g mask="url(#mask1_189_522)">
            <path d="M22.1092 26.1208L19.4498 23.4615C19.1736 23.1851 18.8253 23.0468 18.4048 23.0468C17.9846 23.0468 17.6363 23.1851 17.3598 23.4615C17.0836 23.7377 16.9468 24.0861 16.9495 24.5065C16.9522 24.9267 17.0916 25.275 17.3678 25.5512L21.0405 29.2238C21.3463 29.5276 21.7031 29.6795 22.1108 29.6795C22.5184 29.6795 22.8742 29.5276 23.1782 29.2238L30.5918 21.8098C30.8683 21.5336 31.0065 21.1867 31.0065 20.7692C31.0065 20.3514 30.8683 20.0044 30.5918 19.7282C30.3156 19.4517 29.9673 19.3135 29.5468 19.3135C29.1266 19.3135 28.7784 19.4517 28.5022 19.7282L22.1092 26.1208ZM23.9998 37.6042C22.113 37.6042 20.3425 37.2473 18.6885 36.5335C17.0343 35.8197 15.5954 34.8512 14.3718 33.6278C13.1485 32.4043 12.18 30.9654 11.4662 29.3112C10.7524 27.6572 10.3955 25.8867 10.3955 23.9998C10.3955 22.113 10.7524 20.3425 11.4662 18.6885C12.18 17.0343 13.1485 15.5954 14.3718 14.3718C15.5954 13.1485 17.0343 12.18 18.6885 11.4662C20.3425 10.7524 22.113 10.3955 23.9998 10.3955C25.8867 10.3955 27.6572 10.7524 29.3112 11.4662C30.9654 12.18 32.4043 13.1485 33.6278 14.3718C34.8512 15.5954 35.8197 17.0343 36.5335 18.6885C37.2473 20.3425 37.6042 22.113 37.6042 23.9998C37.6042 25.8867 37.2473 27.6572 36.5335 29.3112C35.8197 30.9654 34.8512 32.4043 33.6278 33.6278C32.4043 34.8512 30.9654 35.8197 29.3112 36.5335C27.6572 37.2473 25.8867 37.6042 23.9998 37.6042Z" fill="white"/>
        </g>
    </g>
</svg>
<div class="mobile-wallet-adapter-embedded-modal-title">Ready to connect!</div>
<div>
    <button data-modal-action id="mobile-wallet-adapter-launch-action" class="mobile-wallet-adapter-embedded-modal-launch-action">
        Connect Wallet
    </button>
</div>
`, Nh = `
.mobile-wallet-adapter-embedded-modal-close {
    display: none;
}
.mobile-wallet-adapter-embedded-modal-content {
    text-align: center;
    min-width: 300px;
}
.mobile-wallet-adapter-embedded-modal-launch-icon {
    margin-top: 24px;
}
.mobile-wallet-adapter-embedded-modal-title {
    margin: 18px 100px 30px 100px;
    color: #000000;
    font-size: 2.75em;
    font-weight: 600;
}
.mobile-wallet-adapter-embedded-modal-launch-action {
    display: block;
    width: 100%;
    height: 56px;
    font-size: 1.25em;
    background: #000000;
    color: #FFFFFF;
    border-radius: 18px;
}
/* Smaller screens */
@media all and (max-width: 600px) {
    .mobile-wallet-adapter-embedded-modal-title {
        font-size: 1.5em;
        margin-right: 12px;
        margin-left: 12px;
    }
}
`;
var Rn, li, ia, Sh = (ia = class extends Qt {
  constructor() {
    super(...arguments);
    N(this, Rn);
    y(this, "contentStyles", wh);
  }
  get contentHtml() {
    const t = Dh() ? "Long press the app icon on your home screen to open site settings" : "Tap the lock or settings icon in the address bar to open site settings";
    return Th.replace("{{PERMISSION_INSTRUCTION_DETAIL}}", t);
  }
  async init() {
    super.init(), ne(this, Rn, li).call(this);
  }
}, Rn = new WeakSet(), li = function() {
  const t = this.dom?.getElementById("mobile-wallet-adapter-launch-action"), r = async (n) => {
    t?.removeEventListener("click", r), this.close(n);
  };
  t?.addEventListener("click", r);
}, ia);
const Th = `
<div class="mobile-wallet-adapter-embedded-modal-header">
    Local Wallet Connection
</div>
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.6 48C7.2 48 0 40.8 0 26.4V21.6C0 7.2 7.2 0 21.6 0H26.4C40.8 0 48 7.2 48 21.6V26.4C48 40.8 40.8 48 26.4 48H21.6Z" fill="#ED1515"/>
    <mask id="mask0_147_1364" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="8" y="8" width="32" height="32">
        <rect x="8" y="8" width="32" height="32" fill="#D9D9D9"/>
    </mask>
    <g mask="url(#mask0_147_1364)">
        <path d="M20.1398 36.2705C19.7363 36.2705 19.3508 36.1945 18.9835 36.0425C18.6162 35.8907 18.2916 35.674 18.0098 35.3922L12.6072 29.9895C12.3254 29.7077 12.1086 29.3832 11.9568 29.0158C11.8048 28.6485 11.7288 28.2631 11.7288 27.8595V20.1395C11.7288 19.736 11.8048 19.3505 11.9568 18.9832C12.1086 18.6158 12.3254 18.2913 12.6072 18.0095L18.0098 12.6068C18.2916 12.3251 18.6162 12.1083 18.9835 11.9565C19.3508 11.8045 19.7363 11.7285 20.1398 11.7285H27.8598C28.2634 11.7285 28.6488 11.8045 29.0162 11.9565C29.3835 12.1083 29.708 12.3251 29.9898 12.6068L35.3925 18.0095C35.6743 18.2913 35.891 18.6158 36.0428 18.9832C36.1948 19.3505 36.2708 19.736 36.2708 20.1395V27.8595C36.2708 28.2631 36.1948 28.6485 36.0428 29.0158C35.891 29.3832 35.6743 29.7077 35.3925 29.9895L29.9898 35.3922C29.708 35.674 29.3835 35.8907 29.0162 36.0425C28.6488 36.1945 28.2634 36.2705 27.8598 36.2705H20.1398ZM20.1732 33.2372H27.8265L33.2375 27.8262V20.1728L27.8265 14.7618H20.1732L14.7622 20.1728V27.8262L20.1732 33.2372ZM23.9998 25.9538L26.7868 28.7408C27.0473 29.0013 27.3729 29.1302 27.7638 29.1275C28.1549 29.1248 28.4807 28.9933 28.7412 28.7328C29.0016 28.4724 29.1318 28.1466 29.1318 27.7555C29.1318 27.3646 29.0016 27.039 28.7412 26.7785L25.9542 23.9995L28.7412 21.2125C29.0016 20.9521 29.1318 20.6264 29.1318 20.2355C29.1318 19.8444 29.0016 19.5186 28.7412 19.2582C28.4807 18.9977 28.1549 18.8675 27.7638 18.8675C27.3729 18.8675 27.0473 18.9977 26.7868 19.2582L23.9998 22.0452L21.2128 19.2582C20.9524 18.9977 20.628 18.8675 20.2398 18.8675C19.8514 18.8675 19.5269 18.9977 19.2665 19.2582C19.006 19.5186 18.8758 19.8444 18.8758 20.2355C18.8758 20.6264 19.006 20.9521 19.2665 21.2125L22.0455 23.9995L19.2585 26.7865C18.998 27.047 18.8692 27.3713 18.8718 27.7595C18.8745 28.148 19.006 28.4724 19.2665 28.7328C19.5269 28.9933 19.8527 29.1235 20.2438 29.1235C20.6347 29.1235 20.9604 28.9933 21.2208 28.7328L23.9998 25.9538Z" fill="black"/>
    </g>
</svg>
<div class="mobile-wallet-adapter-embedded-modal-title">
    Your wallet connection is blocked
</div>
<div id="mobile-wallet-adapter-local-launch-message" class="mobile-wallet-adapter-embedded-modal-subtitle">
    Visit site settings in the address bar and allow "Apps on Device".
</div>

<div class="mobile-wallet-adapter-embedded-modal-divider"><hr></div>
<div class="mobile-wallet-adapter-embedded-modal-footer">
    <div class="mobile-wallet-adapter-embedded-modal-details">
        <!-- Clickable header (label associated with the checkbox) -->
      	<label for="collapsible-1" class="mobile-wallet-adapter-embedded-modal-details-collapsible-header">
            <!-- Hidden checkbox to track state -->
            <input type="checkbox" id="collapsible-1" class="mobile-wallet-adapter-embedded-modal-details-collapsible-input">
            <span class="mobile-wallet-adapter-embedded-modal-details-collapsible-header-label">
              See details
            </span>
            <svg class="mobile-wallet-adapter-embedded-modal-details-collapsible-header-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <mask id="mask0_147_1382" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                <rect width="24" height="24" fill="#D9D9D9"/>
              </mask>
              <g mask="url(#mask0_147_1382)">
                <path d="M11.9999 17.0811C11.8506 17.0811 11.7087 17.0563 11.5741 17.0067C11.4395 16.957 11.3162 16.8762 11.2042 16.7643L6.57924 12.1393C6.36801 11.9281 6.26656 11.667 6.27489 11.3561C6.28322 11.0453 6.39301 10.7842 6.60424 10.573C6.81547 10.3618 7.08069 10.2561 7.39989 10.2561C7.71909 10.2561 7.9843 10.3618 8.19554 10.573L11.9999 14.3773L15.8292 10.548C16.0405 10.3368 16.3015 10.2353 16.6124 10.2436C16.9233 10.252 17.1843 10.3618 17.3955 10.573C17.6068 10.7842 17.7124 11.0494 17.7124 11.3686C17.7124 11.6878 17.6068 11.9531 17.3955 12.1643L12.7955 16.7643C12.6836 16.8762 12.5603 16.957 12.4257 17.0067C12.2911 17.0563 12.1492 17.0811 11.9999 17.0811Z" fill="black"/>
              </g>
            </svg>
      	</label>
        
        <!-- Content to show/hide -->
        <ul class="mobile-wallet-adapter-embedded-modal-details-collapsible-content">
            <li>{{PERMISSION_INSTRUCTION_DETAIL}}</li>
            <li>Allow "Apps on Device"</li>
        </ul>
    </div>
</div>
<div>
    <button data-modal-action id="mobile-wallet-adapter-launch-action" class="mobile-wallet-adapter-embedded-modal-launch-action">
        Got it
    </button>
</div>
`, wh = `
.mobile-wallet-adapter-embedded-modal-close {
    display: none;
}
.mobile-wallet-adapter-embedded-modal-content {
    text-align: center;
}
.mobile-wallet-adapter-embedded-modal-header {
    margin: 18px auto 30px auto;
    color: #7D9093;
    font-size: 1.0em;
    font-weight: 500;
}
.mobile-wallet-adapter-embedded-modal-title {
    margin: 18px 100px auto 100px;
    color: #000000;
    font-size: 2.75em;
    font-weight: 600;
}
.mobile-wallet-adapter-embedded-modal-subtitle {
    margin: 12px 60px 30px 60px;
    color: #7D9093;
    font-size: 1.25em;
    font-weight: 400;
}
.mobile-wallet-adapter-embedded-modal-details-collapsible-header {
    display: flex;
    flex-direction: row;
  	justify-content: space-between;
    margin: 10px auto 10px auto;
    color: #000000;
    font-size: 1.5em;
    font-weight: 600;
    cursor: pointer; /* Show pointer on hover */
    transition: background 0.2s ease; /* Smooth background change */
}
.mobile-wallet-adapter-embedded-modal-details-collapsible-header-icon {
  	transition: rotate 0.3s ease;
}
.mobile-wallet-adapter-embedded-modal-details-collapsible-input {
  	display: none; /* Hide the checkbox */
}
.mobile-wallet-adapter-embedded-modal-details-collapsible-content {
    margin: 0px auto 40px auto;
    max-height: 0px; /* Collapse content */
    overflow: hidden; /* Hide overflow when collapsed */
    transition: max-height 0.3s ease; /* Smooth transition */
}
.mobile-wallet-adapter-embedded-modal-details-collapsible-content li {
    margin: 20px auto;
    color: #000000;
    font-size: 1.25em;
    font-weight: 400;
    text-align: left;
}
/* When checkbox is checked, show content */
.mobile-wallet-adapter-embedded-modal-details-collapsible-header:has(> input:checked) ~ .mobile-wallet-adapter-embedded-modal-details-collapsible-content {
  	max-height: 300px;
}
.mobile-wallet-adapter-embedded-modal-details-collapsible-header:has(> input:checked) > .mobile-wallet-adapter-embedded-modal-details-collapsible-header-icon {
  	rotate: 180deg;
}
.mobile-wallet-adapter-embedded-modal-launch-action {
    display: block;
    width: 100%;
    height: 56px;
    /*margin-top: 40px;*/
    font-size: 1.25em;
    /*line-height: 24px;*/
    /*letter-spacing: -1%;*/
    background: #000000;
    color: #FFFFFF;
    border-radius: 18px;
}
/* Smaller screens */
@media all and (max-width: 600px) {
    .mobile-wallet-adapter-embedded-modal-title {
        font-size: 1.75em;
        margin-right: 12px;
        margin-left: 12px;
    }
    .mobile-wallet-adapter-embedded-modal-subtitle {
        margin-right: 12px;
        margin-left: 12px;
    }
}
`;
var hn, di, sa, Ih = (sa = class extends Qt {
  constructor() {
    super(...arguments);
    N(this, hn);
    y(this, "contentStyles", Ch);
    y(this, "contentHtml", bh);
  }
  async init() {
    super.init(), ne(this, hn, di).call(this);
  }
}, hn = new WeakSet(), di = function() {
  const t = this.dom?.getElementById("mobile-wallet-adapter-launch-action"), r = async () => {
    t?.removeEventListener("click", r);
    try {
      await fetch("http://localhost");
    } catch {
    }
    this.close();
  };
  t?.addEventListener("click", r);
}, sa);
const bh = `
<div class="mobile-wallet-adapter-embedded-modal-title">Allow connections to your wallet</div>
<div id="mobile-wallet-adapter-local-launch-message" class="mobile-wallet-adapter-embedded-modal-subtitle">
    Tap "Allow" on the next screen
</div>
<svg class="mobile-wallet-adapter-embedded-modal-permission-prompt-mock" xmlns="http://www.w3.org/2000/svg" width="281" height="83" viewBox="0 0 281 83" fill="none">
    <rect width="281" height="83" rx="22" fill="#F0F3F5"/>
    <path d="M254.194 64L252.626 56.657H254.047L254.866 61.452L254.985 62.278H255.02L255.146 61.452L255.993 57.497H257.4L258.254 61.431L258.373 62.278H258.415L258.534 61.431L259.346 56.657H260.718L259.143 64H257.673L256.826 59.961L256.693 59.093H256.651L256.511 59.961L255.664 64H254.194Z" fill="black"/>
    <path d="M248.837 64.231C248.147 64.231 247.54 64.07 247.017 63.748C246.495 63.426 246.086 62.978 245.792 62.404C245.498 61.83 245.351 61.1673 245.351 60.416V60.241C245.351 59.4897 245.498 58.827 245.792 58.253C246.086 57.679 246.495 57.2333 247.017 56.916C247.54 56.594 248.147 56.433 248.837 56.433C249.528 56.433 250.135 56.594 250.657 56.916C251.18 57.2333 251.588 57.679 251.882 58.253C252.176 58.827 252.323 59.4897 252.323 60.241V60.416C252.323 61.1673 252.176 61.83 251.882 62.404C251.588 62.978 251.18 63.426 250.657 63.748C250.135 64.07 249.528 64.231 248.837 64.231ZM248.837 62.824C249.43 62.824 249.897 62.607 250.237 62.173C250.583 61.7343 250.755 61.1417 250.755 60.395V60.262C250.755 59.5107 250.583 58.918 250.237 58.484C249.897 58.05 249.43 57.833 248.837 57.833C248.249 57.833 247.783 58.05 247.437 58.484C247.092 58.918 246.919 59.5107 246.919 60.262V60.395C246.919 61.1417 247.092 61.7343 247.437 62.173C247.783 62.607 248.249 62.824 248.837 62.824Z" fill="black"/>
    <path d="M242.298 64.231C241.467 64.231 240.814 63.993 240.338 63.517C239.866 63.0364 239.631 62.3737 239.631 61.529V53.78H241.178V61.389C241.178 62.3317 241.591 62.803 242.417 62.803C242.65 62.803 242.865 62.7587 243.061 62.67C243.257 62.5814 243.464 62.4367 243.684 62.236L244.538 63.377C244.225 63.6664 243.884 63.881 243.516 64.021C243.152 64.161 242.746 64.231 242.298 64.231ZM237.51 55.061V53.78H240.611V55.061H237.51Z" fill="black"/>
    <path d="M234.463 64.231C233.633 64.231 232.979 63.993 232.503 63.517C232.032 63.0364 231.796 62.3737 231.796 61.529V53.78H233.343V61.389C233.343 62.3317 233.756 62.803 234.582 62.803C234.816 62.803 235.03 62.7587 235.226 62.67C235.422 62.5814 235.63 62.4367 235.849 62.236L236.703 63.377C236.391 63.6664 236.05 63.881 235.681 64.021C235.317 64.161 234.911 64.231 234.463 64.231ZM229.675 55.061V53.78H232.776V55.061H229.675Z" fill="black"/>
    <path d="M221.442 64L224.557 53.976H226.132L229.233 64H227.581L225.642 56.972L225.341 55.761H225.299L225.005 56.972L223.073 64H221.442ZM222.835 61.634L223.255 60.29H227.371L227.805 61.634H222.835Z" fill="black"/>
    <path d="M178.261 64L175.034 60.066V60.024L178.121 56.657H180.011L176.504 60.423V59.632L180.165 64H178.261ZM173.543 64V53.78H175.097V64H173.543Z" fill="#7D9093" fill-opacity="0.5"/>
    <path d="M169.306 64.224C168.588 64.224 167.958 64.0653 167.416 63.748C166.88 63.426 166.462 62.9803 166.163 62.411C165.865 61.837 165.715 61.1673 165.715 60.402V60.248C165.715 59.4873 165.862 58.8223 166.156 58.253C166.45 57.679 166.863 57.2333 167.395 56.916C167.927 56.594 168.546 56.433 169.25 56.433C169.978 56.433 170.59 56.6056 171.084 56.951C171.579 57.2917 171.955 57.777 172.211 58.407L170.874 58.995C170.72 58.6123 170.508 58.323 170.237 58.127C169.967 57.9263 169.633 57.826 169.236 57.826C168.63 57.826 168.149 58.0383 167.794 58.463C167.444 58.883 167.269 59.4616 167.269 60.199V60.465C167.269 61.1837 167.454 61.7577 167.822 62.187C168.196 62.6163 168.69 62.831 169.306 62.831C169.712 62.831 170.06 62.733 170.349 62.537C170.639 62.341 170.877 62.0423 171.063 61.641L172.379 62.285C172.188 62.6957 171.941 63.0457 171.637 63.335C171.334 63.6243 170.986 63.846 170.594 64C170.202 64.1493 169.773 64.224 169.306 64.224Z" fill="#7D9093" fill-opacity="0.5"/>
    <path d="M161.003 64.231C160.312 64.231 159.706 64.07 159.183 63.748C158.66 63.426 158.252 62.978 157.958 62.404C157.664 61.83 157.517 61.1673 157.517 60.416V60.241C157.517 59.4897 157.664 58.827 157.958 58.253C158.252 57.679 158.66 57.2333 159.183 56.916C159.706 56.594 160.312 56.433 161.003 56.433C161.694 56.433 162.3 56.594 162.823 56.916C163.346 57.2333 163.754 57.679 164.048 58.253C164.342 58.827 164.489 59.4897 164.489 60.241V60.416C164.489 61.1673 164.342 61.83 164.048 62.404C163.754 62.978 163.346 63.426 162.823 63.748C162.3 64.07 161.694 64.231 161.003 64.231ZM161.003 62.824C161.596 62.824 162.062 62.607 162.403 62.173C162.748 61.7343 162.921 61.1417 162.921 60.395V60.262C162.921 59.5107 162.748 58.918 162.403 58.484C162.062 58.05 161.596 57.833 161.003 57.833C160.415 57.833 159.948 58.05 159.603 58.484C159.258 58.918 159.085 59.5107 159.085 60.262V60.395C159.085 61.1417 159.258 61.7343 159.603 62.173C159.948 62.607 160.415 62.824 161.003 62.824Z" fill="#7D9093" fill-opacity="0.5"/>
    <path d="M154.463 64.231C153.633 64.231 152.979 63.993 152.503 63.517C152.032 63.0364 151.796 62.3737 151.796 61.529V53.78H153.343V61.389C153.343 62.3317 153.756 62.803 154.582 62.803C154.816 62.803 155.03 62.7587 155.226 62.67C155.422 62.5814 155.63 62.4367 155.849 62.236L156.703 63.377C156.391 63.6664 156.05 63.881 155.681 64.021C155.317 64.161 154.911 64.231 154.463 64.231ZM149.675 55.061V53.78H152.776V55.061H149.675Z" fill="#7D9093" fill-opacity="0.5"/>
    <path d="M142.24 64V53.976H145.544C146.421 53.976 147.112 54.1953 147.616 54.634C148.12 55.0726 148.372 55.6583 148.372 56.391V56.566C148.372 57.0886 148.246 57.5366 147.994 57.91C147.742 58.2833 147.38 58.5586 146.909 58.736V58.792C147.492 58.9226 147.947 59.2003 148.274 59.625C148.605 60.045 148.771 60.5606 148.771 61.172V61.361C148.771 61.893 148.645 62.3573 148.393 62.754C148.145 63.1506 147.795 63.4586 147.343 63.678C146.895 63.8926 146.365 64 145.754 64H142.24ZM143.794 62.656H145.572C146.085 62.656 146.482 62.5253 146.762 62.264C147.042 62.0026 147.182 61.6293 147.182 61.144V60.99C147.182 60.5046 147.037 60.1313 146.748 59.87C146.463 59.604 146.05 59.471 145.509 59.471H143.36V58.183H145.32C145.791 58.183 146.153 58.064 146.405 57.826C146.657 57.588 146.783 57.2496 146.783 56.811V56.685C146.783 56.2416 146.657 55.9033 146.405 55.67C146.157 55.4366 145.796 55.32 145.32 55.32H143.794V62.656Z" fill="#7D9093" fill-opacity="0.5"/>
    <rect x="18" y="17" width="246" height="7" rx="3.5" fill="#7D9093" fill-opacity="0.26"/>
    <rect x="18" y="33" width="82" height="7" rx="3.5" fill="#7D9093" fill-opacity="0.26"/>
</svg>
<div>
    <button data-modal-action id="mobile-wallet-adapter-launch-action" class="mobile-wallet-adapter-embedded-modal-launch-action">
        Continue to Allow
    </button>
</div>
`, Ch = `
.mobile-wallet-adapter-embedded-modal-close {
    display: none;
}
.mobile-wallet-adapter-embedded-modal-content {
    text-align: center;
}
.mobile-wallet-adapter-embedded-modal-title {
    margin: 18px 100px auto 100px;
    color: #000000;
    font-size: 2.75em;
    font-weight: 600;
}
.mobile-wallet-adapter-embedded-modal-subtitle {
    margin: 20px 60px 40px 60px;
    color: #7D9093;
    font-size: 1.25em;
    font-weight: 400;
}
.mobile-wallet-adapter-embedded-modal-permission-prompt-mock {
    width: 90%;
    height: auto;
    margin: 0 auto 30px auto;
    display: block;
}
.mobile-wallet-adapter-embedded-modal-launch-action {
    display: block;
    width: 100%;
    height: 56px;
    font-size: 1.25em;
    background: #000000;
    color: #FFFFFF;
    border-radius: 18px;
}
/* Smaller screens */
@media all and (max-width: 600px) {
    .mobile-wallet-adapter-embedded-modal-title {
        font-size: 1.5em;
        margin-right: 12px;
        margin-left: 12px;
    }
    .mobile-wallet-adapter-embedded-modal-subtitle {
        margin-right: 12px;
        margin-left: 12px;
    }
}
`;
function yh() {
  return typeof window < "u" && window.isSecureContext && typeof document < "u" && /android/i.test(navigator.userAgent);
}
function Lh() {
  return typeof window < "u" && window.isSecureContext && typeof document < "u" && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
function vh(e) {
  return /(WebView|Version\/.+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+)|; wv\).+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+))/i.test(e);
}
function Qr(e) {
  return e.includes("Solana Mobile Web Shell");
}
function Dh() {
  const e = typeof document < "u" && document.referrer.startsWith("android-app://");
  if (typeof window > "u") return e;
  const t = window.matchMedia("(display-mode: standalone)").matches, r = window.matchMedia("(display-mode: fullscreen)").matches, n = window.matchMedia("(display-mode: minimal-ui)").matches;
  return e || t || r || n;
}
function xh(e) {
  return e === "localhost" || e.endsWith(".localhost") || e === "[::1]" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(e);
}
function _i() {
  return typeof window < "u" && !!window.location && xh(window.location.hostname);
}
async function Mh() {
  if (typeof navigator < "u" && Qr(navigator.userAgent) || _i()) return !0;
  try {
    return (await navigator.permissions.query({ name: "loopback-network" })).state === "granted";
  } catch (e) {
    return !!(e instanceof TypeError && (e.message.includes("loopback-network") || e.message.includes("local-network-access")));
  }
}
async function ui() {
  if (!(typeof navigator < "u" && Qr(navigator.userAgent)) && !_i())
    try {
      const e = await navigator.permissions.query({ name: "loopback-network" });
      if (e.state === "granted") return;
      if (e.state === "denied") {
        const t = new Sh();
        throw t.init(), t.open(), new G(q.ERROR_LOOPBACK_ACCESS_BLOCKED, "Local Network Access permission denied");
      } else if (e.state === "prompt") {
        const t = new Ih();
        if (await new Promise((r, n) => {
          t.addEventListener("close", (o) => {
            o && n(new G(q.ERROR_ASSOCIATION_CANCELLED, "Wallet connection cancelled by user", { event: o }));
          }), e.onchange = () => {
            e.onchange = null, r(e.state);
          }, t.init(), t.open();
        }) === "granted") {
          const r = new mh();
          await new Promise((n, o) => {
            r.addEventListener("close", (a) => {
              a && o(new G(q.ERROR_ASSOCIATION_CANCELLED, "Wallet connection cancelled by user", { event: a }));
            }), r.initWithCallback(async () => {
              n(!0);
            }), r.open();
          });
          return;
        } else return await ui();
      }
      throw new G(q.ERROR_LOOPBACK_ACCESS_BLOCKED, "Local Network Access permission unknown");
    } catch (e) {
      if (e instanceof TypeError && (e.message.includes("loopback-network") || e.message.includes("local-network-access"))) return;
      throw e instanceof G ? e : new G(q.ERROR_LOOPBACK_ACCESS_BLOCKED, e instanceof Error ? e.message : "Local Network Access permission unknown");
    }
}
const Ph = `
<div class="mobile-wallet-adapter-embedded-loading-indicator" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div data-modal-close style="position: absolute; width: 100%; height: 100%;"></div>
    <div class="mobile-wallet-adapter-embedded-loading-container">
        <div class="mobile-wallet-adapter-embedded-loading-animation"></div>
    </div>
</div>
`, Uh = `
.mobile-wallet-adapter-embedded-loading-indicator {
    display: flex; /* Use flexbox to center content */
    justify-content: center; /* Center horizontally */
    align-items: start; /* Center vertically */
    position: fixed; /* Stay in place */
    z-index: 1; /* Sit on top */
    left: 0;
    top: 0;
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
    overflow-y: auto; /* enable scrolling */
}

.mobile-wallet-adapter-embedded-loading-container {
    display: flex;
    margin: auto;
}

.mobile-wallet-adapter-embedded-loading-animation {
    position: relative;
    left: -9999px;
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background-color: var(--spinner-color);
    color: var(--spinner-color);
    box-shadow: 9984px 0 0 0 var(--spinner-color), 
                9999px 0 0 0 var(--spinner-color), 
                10014px 0 0 0 var(--spinner-color);
    animation: dot-typing 1.5s infinite linear;
}

@keyframes dot-typing {
    0% {
        box-shadow: 9984px 0 0 0 var(--spinner-color), 
                    9999px 0 0 0 var(--spinner-color), 
                    10014px 0 0 0 var(--spinner-color);
    }
    16.667% {
        box-shadow: 9984px -10px 0 0 var(--spinner-color), 
                    9999px 0 0 0 var(--spinner-color), 
                    10014px 0 0 0 var(--spinner-color);
    }
    33.333% {
        box-shadow: 9984px 0 0 0 var(--spinner-color), 
                    9999px 0 0 0 var(--spinner-color), 
                    10014px 0 0 0 var(--spinner-color);
    }
    50% {
        box-shadow: 9984px 0 0 0 var(--spinner-color), 
                    9999px -10px 0 0 var(--spinner-color), 
                    10014px 0 0 0 var(--spinner-color);
    }
    66.667% {
        box-shadow: 9984px 0 0 0 var(--spinner-color), 
                    9999px 0 0 0 var(--spinner-color), 
                    10014px 0 0 0 var(--spinner-color);
    }
    83.333% {
        box-shadow: 9984px 0 0 0 var(--spinner-color), 
                    9999px 0 0 0 var(--spinner-color), 
                    10014px -10px 0 0 var(--spinner-color);
    }
    100% {
        box-shadow: 9984px 0 0 0 var(--spinner-color), 
                    9999px 0 0 0 var(--spinner-color), 
                    10014px 0 0 0 var(--spinner-color);
    }
}
`;
var ae, De, ze, Ge, Ri, hi, Ei, Pt, ca, Bh = (ca = class {
  constructor() {
    N(this, Ge);
    N(this, ae, null);
    N(this, De, {});
    N(this, ze, !1);
    y(this, "dom", null);
    y(this, "open", () => {
      console.debug("Modal open"), ne(this, Ge, hi).call(this), d(this, ae) && (d(this, ae).style.display = "flex");
    });
    y(this, "close", (e = void 0) => {
      console.debug("Modal close"), ne(this, Ge, Ei).call(this), d(this, ae) && (d(this, ae).style.display = "none"), d(this, De).close?.forEach((t) => t(e));
    });
    N(this, Pt, (e) => {
      e.key === "Escape" && this.close(e);
    });
    this.init = this.init.bind(this), V(this, ae, document.getElementById("mobile-wallet-adapter-embedded-root-ui"));
  }
  async init() {
    console.log("Injecting modal"), ne(this, Ge, Ri).call(this);
  }
  addEventListener(e, t) {
    return d(this, De)[e]?.push(t) || (d(this, De)[e] = [t]), () => this.removeEventListener(e, t);
  }
  removeEventListener(e, t) {
    d(this, De)[e] = d(this, De)[e]?.filter((r) => t !== r);
  }
}, ae = new WeakMap(), De = new WeakMap(), ze = new WeakMap(), Ge = new WeakSet(), Ri = function() {
  if (this.dom) return;
  V(this, ae, document.createElement("div")), d(this, ae).id = "mobile-wallet-adapter-embedded-root-ui", d(this, ae).innerHTML = Ph, d(this, ae).style.display = "none";
  const e = document.createElement("style");
  e.id = "mobile-wallet-adapter-embedded-modal-styles", e.textContent = Uh;
  const t = document.createElement("div");
  this.dom = t.attachShadow({ mode: "closed" }), t.style.setProperty("--spinner-color", "#FFFFFF"), this.dom.appendChild(e), this.dom.appendChild(d(this, ae)), document.body.appendChild(t);
}, hi = function() {
  !d(this, ae) || d(this, ze) || ([...d(this, ae).querySelectorAll("[data-modal-close]")].forEach((e) => e?.addEventListener("click", (t) => {
    this.close(t);
  })), window.addEventListener("load", this.close), document.addEventListener("keydown", d(this, Pt)), V(this, ze, !0));
}, Ei = function() {
  d(this, ze) && (window.removeEventListener("load", this.close), document.removeEventListener("keydown", d(this, Pt)), d(this, ae) && ([...d(this, ae).querySelectorAll("[data-modal-close]")].forEach((e) => e?.removeEventListener("click", this.close)), V(this, ze, !1)));
}, Pt = new WeakMap(), ca), Fh = class extends Qt {
  constructor() {
    super(...arguments);
    y(this, "contentStyles", kh);
    y(this, "contentHtml", $h);
  }
  async initWithQR(t) {
    super.init(), this.populateQRCode(t);
  }
  async populateQRCode(t) {
    const r = this.dom?.getElementById("mobile-wallet-adapter-embedded-modal-qr-code-container");
    if (r) {
      const n = await dh.toCanvas(t, {
        width: 200,
        margin: 0
      });
      r.firstElementChild !== null ? r.replaceChild(n, r.firstElementChild) : r.appendChild(n);
      const o = this.dom?.getElementById("mobile-wallet-adapter-embedded-modal-qr-placeholder");
      o && (o.style.display = "none");
    } else console.error("QRCode Container not found");
  }
};
const $h = `
<div class="mobile-wallet-adapter-embedded-modal-qr-content">
    <div>
        <svg class="mobile-wallet-adapter-embedded-modal-icon" width="100%" height="100%">
            <circle r="52" cx="53" cy="53" fill="#99b3be" stroke="#000000" stroke-width="2"/>
            <path d="m 53,82.7305 c -3.3116,0 -6.1361,-1.169 -8.4735,-3.507 -2.338,-2.338 -3.507,-5.1625 -3.507,-8.4735 0,-3.3116 1.169,-6.1364 3.507,-8.4744 2.3374,-2.338 5.1619,-3.507 8.4735,-3.507 3.3116,0 6.1361,1.169 8.4735,3.507 2.338,2.338 3.507,5.1628 3.507,8.4744 0,3.311 -1.169,6.1355 -3.507,8.4735 -2.3374,2.338 -5.1619,3.507 -8.4735,3.507 z m 0.007,-5.25 c 1.8532,0 3.437,-0.6598 4.7512,-1.9793 1.3149,-1.3195 1.9723,-2.9058 1.9723,-4.7591 0,-1.8526 -0.6598,-3.4364 -1.9793,-4.7512 -1.3195,-1.3149 -2.9055,-1.9723 -4.7582,-1.9723 -1.8533,0 -3.437,0.6598 -4.7513,1.9793 -1.3148,1.3195 -1.9722,2.9058 -1.9722,4.7591 0,1.8527 0.6597,3.4364 1.9792,4.7512 1.3195,1.3149 2.9056,1.9723 4.7583,1.9723 z m -28,-33.5729 -3.85,-3.6347 c 4.1195,-4.025 8.8792,-7.1984 14.2791,-9.52 5.4005,-2.3223 11.2551,-3.4834 17.5639,-3.4834 6.3087,0 12.1634,1.1611 17.5639,3.4834 5.3999,2.3216 10.1596,5.495 14.2791,9.52 l -3.85,3.6347 C 77.2999,40.358 73.0684,37.5726 68.2985,35.5514 63.5292,33.5301 58.4296,32.5195 53,32.5195 c -5.4297,0 -10.5292,1.0106 -15.2985,3.0319 -4.7699,2.0212 -9.0014,4.8066 -12.6945,8.3562 z m 44.625,10.8771 c -2.2709,-2.1046 -4.7962,-3.7167 -7.5758,-4.8361 -2.7795,-1.12 -5.7983,-1.68 -9.0562,-1.68 -3.2579,0 -6.2621,0.56 -9.0125,1.68 -2.7504,1.1194 -5.2903,2.7315 -7.6195,4.8361 L 32.5189,51.15 c 2.8355,-2.6028 5.9777,-4.6086 9.4263,-6.0174 3.4481,-1.4087 7.133,-2.1131 11.0548,-2.1131 3.9217,0 7.5979,0.7044 11.0285,2.1131 3.43,1.4088 6.5631,3.4146 9.3992,6.0174 z"/>
        </svg>
        <div class="mobile-wallet-adapter-embedded-modal-title">Remote Mobile Wallet Adapter</div>
    </div>
    <div>
        <div>
            <h4 class="mobile-wallet-adapter-embedded-modal-qr-label">
                Open your wallet and scan this code
            </h4>
        </div>
        <div id="mobile-wallet-adapter-embedded-modal-qr-code-container" class="mobile-wallet-adapter-embedded-modal-qr-code-container">
            <div id="mobile-wallet-adapter-embedded-modal-qr-placeholder" class="mobile-wallet-adapter-embedded-modal-qr-placeholder"></div>
        </div>
    </div>
</div>
<div class="mobile-wallet-adapter-embedded-modal-divider"><hr></div>
<div class="mobile-wallet-adapter-embedded-modal-footer">
    <div class="mobile-wallet-adapter-embedded-modal-subtitle">
        Follow the instructions on your device. When you're finished, this screen will update.
    </div>
    <div class="mobile-wallet-adapter-embedded-modal-progress-badge">
        <div>
            <div class="spinner">
                <div class="leftWrapper">
                    <div class="left">
                        <div class="circle"></div>
                    </div>
                </div>
                <div class="rightWrapper">
                    <div class="right">
                        <div class="circle"></div>
                    </div>
                </div>
            </div>
        </div>
        <div>Waiting for scan</div>
    </div>
</div>
`, kh = `
.mobile-wallet-adapter-embedded-modal-qr-content {
    display: flex; 
    margin-top: 10px;
    padding: 10px;
}

.mobile-wallet-adapter-embedded-modal-qr-content > div:first-child {
    display: flex;
    flex-direction: column;
    flex: 2;
    margin-top: auto;
    margin-right: 30px;
}

.mobile-wallet-adapter-embedded-modal-qr-content > div:nth-child(2) {
    display: flex;
    flex-direction: column;
    flex: 1;
    margin-left: auto;
}

.mobile-wallet-adapter-embedded-modal-footer {
    display: flex;
    padding: 10px;
}

.mobile-wallet-adapter-embedded-modal-icon {}

.mobile-wallet-adapter-embedded-modal-title {
    color: #000000;
    font-size: 2.5em;
    font-weight: 600;
}

.mobile-wallet-adapter-embedded-modal-qr-label {
    text-align: right;
    color: #000000;
}

.mobile-wallet-adapter-embedded-modal-qr-code-container {
    margin-left: auto;
}

.mobile-wallet-adapter-embedded-modal-qr-placeholder {
    margin-left: auto;
    min-width: 200px;
    min-height: 200px;
    background: linear-gradient(-60deg, #F7F8F8 30%, #ECEEEE 50%, #F7F8F8 70%);
    background-size: 200%;
    animation: placeholderAnimate 2.7s linear infinite;
    border-radius: 12px;
}

.mobile-wallet-adapter-embedded-modal-divider {
    margin-top: 20px;
    padding-left: 10px;
    padding-right: 10px;
}

.mobile-wallet-adapter-embedded-modal-divider hr {
    border-top: 1px solid #D9DEDE;
}

.mobile-wallet-adapter-embedded-modal-subtitle {
    margin: auto;
    margin-right: 60px;
    padding: 20px;
    color: #6E8286;
}

.mobile-wallet-adapter-embedded-modal-progress-badge {
    display: flex;
    background: #F7F8F8;
    height: 56px;
    min-width: 200px;
    margin: auto;
    padding-left: 20px;
    padding-right: 20px;
    border-radius: 18px;
    color: #A8B6B8;
    align-items: center;
}

.mobile-wallet-adapter-embedded-modal-progress-badge > div:first-child {
    margin-left: auto;
    margin-right: 20px;
}

.mobile-wallet-adapter-embedded-modal-progress-badge > div:nth-child(2) {
    margin-right: auto;
}

/* Smaller screens */
@media all and (max-width: 600px) {
    .mobile-wallet-adapter-embedded-modal-card {
        text-align: center;
    }
    .mobile-wallet-adapter-embedded-modal-qr-content {
        flex-direction: column;
    }
    .mobile-wallet-adapter-embedded-modal-qr-content > div:first-child {
        margin: auto;
    }
    .mobile-wallet-adapter-embedded-modal-qr-content > div:nth-child(2) {
        margin: auto;
        flex: 2 auto;
    }
    .mobile-wallet-adapter-embedded-modal-footer {
        flex-direction: column;
    }
    .mobile-wallet-adapter-embedded-modal-icon {
        display: none;
    }
    .mobile-wallet-adapter-embedded-modal-title {
        font-size: 1.5em;
    }
    .mobile-wallet-adapter-embedded-modal-subtitle {
        margin-right: unset;
    }
    .mobile-wallet-adapter-embedded-modal-qr-label {
        text-align: center;
    }
    .mobile-wallet-adapter-embedded-modal-qr-code-container {
        margin: auto;
    }
    .mobile-wallet-adapter-embedded-modal-qr-placeholder {
        margin: auto;
    }
}

/* QR Placeholder */
@keyframes placeholderAnimate {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* Spinner */
@keyframes spinLeft {
    0% {
        transform: rotate(20deg);
    }
    50% {
        transform: rotate(160deg);
    }
    100% {
        transform: rotate(20deg);
    }
}
@keyframes spinRight {
    0% {
        transform: rotate(160deg);
    }
    50% {
        transform: rotate(20deg);
    }
    100% {
        transform: rotate(160deg);
    }
}
@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(2520deg);
    }
}

.spinner {
    position: relative;
    width: 1.5em;
    height: 1.5em;
    margin: auto;
    animation: spin 10s linear infinite;
}
.spinner::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
}
.right, .rightWrapper, .left, .leftWrapper {
    position: absolute;
    top: 0;
    overflow: hidden;
    width: .75em;
    height: 1.5em;
}
.left, .leftWrapper {
    left: 0;
}
.right {
    left: -12px;
}
.rightWrapper {
    right: 0;
}
.circle {
    border: .125em solid #A8B6B8;
    width: 1.25em; /* 1.5em - 2*0.125em border */
    height: 1.25em; /* 1.5em - 2*0.125em border */
    border-radius: 0.75em; /* 0.5*1.5em spinner size 8 */
}
.left {
    transform-origin: 100% 50%;
    animation: spinLeft 2.5s cubic-bezier(.2,0,.8,1) infinite;
}
.right {
    transform-origin: 100% 50%;
    animation: spinRight 2.5s cubic-bezier(.2,0,.8,1) infinite;
}
`, fi = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik03IDIuNUgxN0MxNy44Mjg0IDIuNSAxOC41IDMuMTcxNTcgMTguNSA0VjIwQzE4LjUgMjAuODI4NCAxNy44Mjg0IDIxLjUgMTcgMjEuNUg3QzYuMTcxNTcgMjEuNSA1LjUgMjAuODI4NCA1LjUgMjBWNEM1LjUgMy4xNzE1NyA2LjE3MTU3IDIuNSA3IDIuNVpNMyA0QzMgMS43OTA4NiA0Ljc5MDg2IDAgNyAwSDE3QzE5LjIwOTEgMCAyMSAxLjc5MDg2IDIxIDRWMjBDMjEgMjIuMjA5MSAxOS4yMDkxIDI0IDE3IDI0SDdDNC43OTA4NiAyNCAzIDIyLjIwOTEgMyAyMFY0Wk0xMSA0LjYxNTM4QzEwLjQ0NzcgNC42MTUzOCAxMCA1LjA2MzEgMTAgNS42MTUzOFY2LjM4NDYyQzEwIDYuOTM2OSAxMC40NDc3IDcuMzg0NjIgMTEgNy4zODQ2MkgxM0MxMy41NTIzIDcuMzg0NjIgMTQgNi45MzY5IDE0IDYuMzg0NjJWNS42MTUzOEMxNCA1LjA2MzEgMTMuNTUyMyA0LjYxNTM4IDEzIDQuNjE1MzhIMTFaIiBmaWxsPSIjRENCOEZGIi8+Cjwvc3ZnPgo=", Vh = "Mobile Wallet Adapter", Gh = "Remote Mobile Wallet Adapter", Ai = [
  Ie,
  be,
  Yr,
  Wr
], Hh = 3e4;
function Oi(e, t) {
  return e?.length === t?.length && (e ?? []).every((r, n) => r === t?.[n]);
}
function pi(e) {
  if (Ie in e) return e[Ie].supportedTransactionVersions;
  if (be in e) return e[be].supportedTransactionVersions;
}
function _e(e) {
  return e instanceof Error ? e.message : "Unknown error";
}
var xe, En, fn, An, On, lt, ie, ge, Se, dt, Me, Ut, Ke, Bt, We, pn, Fe, nn, mi, mn, Ft, Ye, $t, _t, kt, je, ut, Vt, gn, Nn, Gt, Ht, Sn, Tn, qt, la, qh = (la = class {
  constructor({ appIdentity: e, authorizationCache: t = Xr(), chains: r, chainSelector: n = Zr(), onWalletNotFound: o = Jr(), nostrRelay: a }) {
    N(this, Fe);
    N(this, xe, {});
    N(this, En, "1.0.0");
    N(this, fn, Vh);
    N(this, An, "https://solanamobile.com/wallets");
    N(this, On, fi);
    N(this, lt);
    N(this, ie);
    N(this, ge);
    N(this, Se, !1);
    /**
    * Every time the connection is recycled in some way (eg. `disconnect()` is called)
    * increment this and use it to make sure that `transact` calls from the previous
    * 'generation' don't continue to do work and throw exceptions.
    */
    N(this, dt, 0);
    N(this, Me, []);
    N(this, Ut);
    N(this, Ke);
    N(this, Bt);
    N(this, We);
    N(this, pn, (e, t) => (d(this, xe)[e]?.push(t) || (d(this, xe)[e] = [t]), () => ne(this, Fe, mi).call(this, e, t)));
    N(this, mn, async ({ silent: e } = {}) => {
      if (d(this, Se) || this.connected) return { accounts: this.accounts };
      V(this, Se, !0);
      try {
        if (e) {
          const t = await d(this, ge).get();
          if (t)
            await d(this, $t).call(this, t.capabilities), await d(this, Ye).call(this, t);
          else return { accounts: this.accounts };
        } else await d(this, Ft).call(this);
      } catch (t) {
        throw new Error(_e(t), { cause: t });
      } finally {
        V(this, Se, !1);
      }
      return { accounts: this.accounts };
    });
    N(this, Ft, async (e) => {
      try {
        const t = await d(this, ge).get();
        if (t)
          return d(this, Ye).call(this, t), t;
        const r = await d(this, Ut).select(d(this, Me));
        return await d(this, je).call(this, async (n) => {
          const [o, a] = await Promise.all([n.getCapabilities(), n.authorize({
            chain: r,
            identity: d(this, lt),
            sign_in_payload: e
          })]), i = d(this, Vt).call(this, a.accounts), s = {
            ...a,
            accounts: i,
            chain: r,
            capabilities: o
          };
          return Promise.all([
            d(this, $t).call(this, o),
            d(this, ge).set(s),
            d(this, Ye).call(this, s)
          ]), s;
        });
      } catch (t) {
        throw new Error(_e(t), { cause: t });
      }
    });
    N(this, Ye, async (e) => {
      const t = d(this, ie) == null || d(this, ie)?.accounts.length !== e.accounts.length || d(this, ie).accounts.some((r, n) => r.address !== e.accounts[n].address);
      V(this, ie, e), t && ne(this, Fe, nn).call(this, "change", { accounts: this.accounts });
    });
    N(this, $t, async (e) => {
      const t = e.features.includes("solana:signTransactions"), r = e.supports_sign_and_send_transactions, n = Ie in this.features !== r || be in this.features !== t || !Oi(pi(d(this, Ke)), e.supported_transaction_versions);
      V(this, Ke, {
        ...(r || !r && !t) && { [Ie]: {
          version: "1.0.0",
          supportedTransactionVersions: e.supported_transaction_versions,
          signAndSendTransaction: d(this, Gt)
        } },
        ...t && { [be]: {
          version: "1.0.0",
          supportedTransactionVersions: e.supported_transaction_versions,
          signTransaction: d(this, Ht)
        } }
      }), n && ne(this, Fe, nn).call(this, "change", { features: this.features });
    });
    N(this, _t, async (e, t, r) => {
      try {
        const [n, o] = await Promise.all([d(this, ie)?.capabilities ?? await e.getCapabilities(), e.authorize({
          auth_token: t,
          identity: d(this, lt),
          chain: r
        })]), a = d(this, Vt).call(this, o.accounts), i = {
          ...o,
          accounts: a,
          chain: r,
          capabilities: n
        };
        Promise.all([d(this, ge).set(i), d(this, Ye).call(this, i)]);
      } catch (n) {
        throw d(this, kt).call(this), new Error(_e(n), { cause: n });
      }
    });
    N(this, kt, async () => {
      d(this, ge).clear(), V(this, Se, !1), Hn(this, dt)._++, V(this, ie, void 0), ne(this, Fe, nn).call(this, "change", { accounts: this.accounts });
    });
    N(this, je, async (e) => {
      const t = d(this, ie)?.wallet_uri_base, r = t ? { baseUri: t } : void 0, n = d(this, dt), o = new Bh();
      try {
        let a = !0, i;
        const s = await Mh(), c = await Promise.race([(async () => {
          !s && !d(this, We) && await ui();
        })().then(async () => {
          o.init();
          const { wallet: l, close: _ } = !s && d(this, We) ? await Za({
            ...r,
            connectionType: "local",
            relayDomain: d(this, We)
          }) : await $0(r);
          a = !1, o.addEventListener("close", (h) => {
            h && _();
          }), o.open();
          const E = await e(await l);
          return o.close(), _(), E;
        }), new Promise((l, _) => {
          i = setTimeout(() => {
            a && _(new G(q.ERROR_ASSOCIATION_CANCELLED, "Wallet connection timed out", { event: void 0 }));
          }, Hh);
        })]);
        return clearTimeout(i), c;
      } catch (a) {
        throw o.close(), d(this, dt) !== n && await new Promise(() => {
        }), a instanceof Error && a.name === "SolanaMobileWalletAdapterError" && a.code === "ERROR_WALLET_NOT_FOUND" && await d(this, Bt).call(this, this), a;
      }
    });
    N(this, ut, () => {
      if (!d(this, ie)) throw new Error("Wallet not connected");
      return {
        authToken: d(this, ie).auth_token,
        chain: d(this, ie).chain
      };
    });
    N(this, Vt, (e) => e.map((t) => {
      const r = ce(t.address);
      return {
        address: an(r),
        publicKey: r,
        label: t.label,
        icon: t.icon,
        chains: t.chains ?? d(this, Me),
        features: t.features ?? Ai
      };
    }));
    N(this, gn, async (e) => {
      const { authToken: t, chain: r } = d(this, ut).call(this);
      try {
        const n = e.map((o) => Be(o));
        return await d(this, je).call(this, async (o) => (await d(this, _t).call(this, o, t, r), (await o.signTransactions({ payloads: n })).signed_payloads.map(ce)));
      } catch (n) {
        throw new Error(_e(n), { cause: n });
      }
    });
    N(this, Nn, async (e, t) => {
      const { authToken: r, chain: n } = d(this, ut).call(this);
      try {
        return await d(this, je).call(this, async (o) => {
          const [a] = await Promise.all([o.getCapabilities(), d(this, _t).call(this, o, r, n)]);
          if (a.supports_sign_and_send_transactions) {
            const i = Be(e);
            return (await o.signAndSendTransactions({
              ...t,
              payloads: [i]
            })).signatures.map(ce)[0];
          } else throw new Error("connected wallet does not support signAndSendTransaction");
        });
      } catch (o) {
        throw new Error(_e(o), { cause: o });
      }
    });
    N(this, Gt, async (...e) => {
      const t = [];
      for (const r of e) {
        const n = await d(this, Nn).call(this, r.transaction, r.options);
        t.push({ signature: n });
      }
      return t;
    });
    N(this, Ht, async (...e) => (await d(this, gn).call(this, e.map(({ transaction: t }) => t))).map((t) => ({ signedTransaction: t })));
    N(this, Sn, async (...e) => {
      const { authToken: t, chain: r } = d(this, ut).call(this), n = e.map(({ account: a }) => Be(new Uint8Array(a.publicKey))), o = e.map(({ message: a }) => Be(a));
      try {
        return await d(this, je).call(this, async (a) => (await d(this, _t).call(this, a, t, r), (await a.signMessages({
          addresses: n,
          payloads: o
        })).signed_payloads.map(ce).map((i) => ({
          signedMessage: i,
          signature: i.slice(-64)
        }))));
      } catch (a) {
        throw new Error(_e(a), { cause: a });
      }
    });
    N(this, Tn, async (...e) => {
      const t = [];
      if (e.length > 1) for (const r of e) t.push(await d(this, qt).call(this, r));
      else return [await d(this, qt).call(this, e[0])];
      return t;
    });
    N(this, qt, async (e) => {
      V(this, Se, !0);
      try {
        const t = await d(this, Ft).call(this, {
          ...e,
          domain: e?.domain ?? window.location.host
        });
        if (!t.sign_in_result) throw new Error("Sign in failed, no sign in result returned by wallet");
        const r = t.sign_in_result.address, n = t.accounts.find((o) => o.address == r);
        return {
          account: {
            ...n ?? { address: an(ce(r)) },
            publicKey: ce(r),
            chains: n?.chains ?? d(this, Me),
            features: n?.features ?? t.capabilities.features
          },
          signedMessage: ce(t.sign_in_result.signed_message),
          signature: ce(t.sign_in_result.signature)
        };
      } catch (t) {
        throw new Error(_e(t), { cause: t });
      } finally {
        V(this, Se, !1);
      }
    });
    V(this, ge, t), V(this, lt, e), V(this, Me, r), V(this, Ut, n), V(this, Bt, o), V(this, We, a), V(this, Ke, {
      [Ie]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signAndSendTransaction: d(this, Gt)
      },
      [be]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: d(this, Ht)
      }
    });
  }
  get version() {
    return d(this, En);
  }
  get name() {
    return d(this, fn);
  }
  get url() {
    return d(this, An);
  }
  get icon() {
    return d(this, On);
  }
  get chains() {
    return d(this, Me);
  }
  get features() {
    return {
      [Ja]: {
        version: "1.0.0",
        connect: d(this, mn)
      },
      [Qa]: {
        version: "1.0.0",
        disconnect: d(this, kt)
      },
      [ei]: {
        version: "1.0.0",
        on: d(this, pn)
      },
      [Yr]: {
        version: "1.0.0",
        signMessage: d(this, Sn)
      },
      [Wr]: {
        version: "1.0.0",
        signIn: d(this, Tn)
      },
      ...d(this, Ke)
    };
  }
  get accounts() {
    return d(this, ie)?.accounts ?? [];
  }
  get connected() {
    return !!d(this, ie);
  }
  get isAuthorized() {
    return !!d(this, ie);
  }
  get currentAuthorization() {
    return d(this, ie);
  }
  get cachedAuthorizationResult() {
    return d(this, ge).get();
  }
}, xe = new WeakMap(), En = new WeakMap(), fn = new WeakMap(), An = new WeakMap(), On = new WeakMap(), lt = new WeakMap(), ie = new WeakMap(), ge = new WeakMap(), Se = new WeakMap(), dt = new WeakMap(), Me = new WeakMap(), Ut = new WeakMap(), Ke = new WeakMap(), Bt = new WeakMap(), We = new WeakMap(), pn = new WeakMap(), Fe = new WeakSet(), nn = function(e, ...t) {
  d(this, xe)[e]?.forEach((r) => r.apply(null, t));
}, mi = function(e, t) {
  d(this, xe)[e] = d(this, xe)[e]?.filter((r) => t !== r);
}, mn = new WeakMap(), Ft = new WeakMap(), Ye = new WeakMap(), $t = new WeakMap(), _t = new WeakMap(), kt = new WeakMap(), je = new WeakMap(), ut = new WeakMap(), Vt = new WeakMap(), gn = new WeakMap(), Nn = new WeakMap(), Gt = new WeakMap(), Ht = new WeakMap(), Sn = new WeakMap(), Tn = new WeakMap(), qt = new WeakMap(), la), Pe, wn, In, bn, Cn, Rt, se, Te, we, ht, Ue, zt, Xe, Kt, Ze, Re, yn, $e, rn, gi, Ln, Wt, Et, vn, ft, Yt, Je, At, jt, Dn, xn, Xt, Zt, Mn, Pn, Jt, da, na = (da = class {
  constructor(e) {
    N(this, $e);
    N(this, Pe, {});
    N(this, wn, "1.0.0");
    N(this, In, Gh);
    N(this, bn, "https://solanamobile.com/wallets");
    N(this, Cn, fi);
    N(this, Rt);
    N(this, se);
    N(this, Te);
    N(this, we, !1);
    /**
    * Every time the connection is recycled in some way (eg. `disconnect()` is called)
    * increment this and use it to make sure that `transact` calls from the previous
    * 'generation' don't continue to do work and throw exceptions.
    */
    N(this, ht, 0);
    N(this, Ue, []);
    N(this, zt);
    N(this, Xe);
    N(this, Kt);
    N(this, Ze);
    N(this, Re);
    N(this, yn, (e, t) => (d(this, Pe)[e]?.push(t) || (d(this, Pe)[e] = [t]), () => ne(this, $e, gi).call(this, e, t)));
    N(this, Ln, async (e = {}) => {
      if (d(this, we) || this.connected) return { accounts: this.accounts };
      V(this, we, !0);
      try {
        await d(this, Wt).call(this);
      } catch (t) {
        throw new Error(_e(t), { cause: t });
      } finally {
        V(this, we, !1);
      }
      return { accounts: this.accounts };
    });
    N(this, Wt, async (e) => {
      try {
        const t = await d(this, Te).get();
        if (t)
          return d(this, Et).call(this, t), t;
        d(this, Re) && V(this, Re, void 0);
        const r = await d(this, zt).select(d(this, Ue));
        return await d(this, Je).call(this, async (n) => {
          const [o, a] = await Promise.all([n.getCapabilities(), n.authorize({
            chain: r,
            identity: d(this, Rt),
            sign_in_payload: e
          })]), i = d(this, jt).call(this, a.accounts), s = {
            ...a,
            accounts: i,
            chain: r,
            capabilities: o
          };
          return Promise.all([
            d(this, vn).call(this, o),
            d(this, Te).set(s),
            d(this, Et).call(this, s)
          ]), s;
        });
      } catch (t) {
        throw new Error(_e(t), { cause: t });
      }
    });
    N(this, Et, async (e) => {
      const t = d(this, se) == null || d(this, se)?.accounts.length !== e.accounts.length || d(this, se).accounts.some((r, n) => r.address !== e.accounts[n].address);
      V(this, se, e), t && ne(this, $e, rn).call(this, "change", { accounts: this.accounts });
    });
    N(this, vn, async (e) => {
      const t = e.features.includes("solana:signTransactions"), r = e.supports_sign_and_send_transactions || e.features.includes("solana:signAndSendTransaction"), n = Ie in this.features !== r || be in this.features !== t || !Oi(pi(d(this, Xe)), e.supported_transaction_versions);
      V(this, Xe, {
        ...r && { [Ie]: {
          version: "1.0.0",
          supportedTransactionVersions: e.supported_transaction_versions,
          signAndSendTransaction: d(this, Xt)
        } },
        ...t && { [be]: {
          version: "1.0.0",
          supportedTransactionVersions: e.supported_transaction_versions,
          signTransaction: d(this, Zt)
        } }
      }), n && ne(this, $e, rn).call(this, "change", { features: this.features });
    });
    N(this, ft, async (e, t, r) => {
      try {
        const [n, o] = await Promise.all([d(this, se)?.capabilities ?? await e.getCapabilities(), e.authorize({
          auth_token: t,
          identity: d(this, Rt),
          chain: r
        })]), a = d(this, jt).call(this, o.accounts), i = {
          ...o,
          accounts: a,
          chain: r,
          capabilities: n
        };
        Promise.all([d(this, Te).set(i), d(this, Et).call(this, i)]);
      } catch (n) {
        throw d(this, Yt).call(this), new Error(_e(n), { cause: n });
      }
    });
    N(this, Yt, async () => {
      d(this, Re)?.close(), d(this, Te).clear(), V(this, we, !1), Hn(this, ht)._++, V(this, se, void 0), V(this, Re, void 0), ne(this, $e, rn).call(this, "change", { accounts: this.accounts });
    });
    N(this, Je, async (e) => {
      const t = d(this, se)?.wallet_uri_base, r = t ? { baseUri: t } : void 0, n = d(this, ht), o = new Fh();
      if (d(this, Re)) return e(d(this, Re).wallet);
      try {
        o.init(), o.open();
        const { associationUrl: a, close: i, wallet: s } = d(this, Ze).kind == "reflector" ? await k0({
          ...r,
          remoteHostAuthority: d(this, Ze).domain
        }) : await Za({
          ...r,
          connectionType: "remote",
          relayDomain: d(this, Ze).domain
        }), c = o.addEventListener("close", (l) => {
          l && i();
        });
        return o.populateQRCode(a.toString()), V(this, Re, {
          close: i,
          wallet: await s
        }), c(), o.close(), await e(d(this, Re).wallet);
      } catch (a) {
        throw o.close(), d(this, ht) !== n && await new Promise(() => {
        }), a instanceof Error && a.name === "SolanaMobileWalletAdapterError" && a.code === "ERROR_WALLET_NOT_FOUND" && await d(this, Kt).call(this, this), a;
      }
    });
    N(this, At, () => {
      if (!d(this, se)) throw new Error("Wallet not connected");
      return {
        authToken: d(this, se).auth_token,
        chain: d(this, se).chain
      };
    });
    N(this, jt, (e) => e.map((t) => {
      const r = ce(t.address);
      return {
        address: an(r),
        publicKey: r,
        label: t.label,
        icon: t.icon,
        chains: t.chains ?? d(this, Ue),
        features: t.features ?? Ai
      };
    }));
    N(this, Dn, async (e) => {
      const { authToken: t, chain: r } = d(this, At).call(this);
      try {
        return await d(this, Je).call(this, async (n) => (await d(this, ft).call(this, n, t, r), (await n.signTransactions({ payloads: e.map(Be) })).signed_payloads.map(ce)));
      } catch (n) {
        throw new Error(_e(n), { cause: n });
      }
    });
    N(this, xn, async (e, t) => {
      const { authToken: r, chain: n } = d(this, At).call(this);
      try {
        return await d(this, Je).call(this, async (o) => {
          const [a] = await Promise.all([o.getCapabilities(), d(this, ft).call(this, o, r, n)]);
          if (a.supports_sign_and_send_transactions) return (await o.signAndSendTransactions({
            ...t,
            payloads: [Be(e)]
          })).signatures.map(ce)[0];
          throw new Error("connected wallet does not support signAndSendTransaction");
        });
      } catch (o) {
        throw new Error(_e(o), { cause: o });
      }
    });
    N(this, Xt, async (...e) => {
      const t = [];
      for (const r of e) {
        const n = await d(this, xn).call(this, r.transaction, r.options);
        t.push({ signature: n });
      }
      return t;
    });
    N(this, Zt, async (...e) => (await d(this, Dn).call(this, e.map(({ transaction: t }) => t))).map((t) => ({ signedTransaction: t })));
    N(this, Mn, async (...e) => {
      const { authToken: t, chain: r } = d(this, At).call(this), n = e.map(({ account: a }) => Be(new Uint8Array(a.publicKey))), o = e.map(({ message: a }) => Be(a));
      try {
        return await d(this, Je).call(this, async (a) => (await d(this, ft).call(this, a, t, r), (await a.signMessages({
          addresses: n,
          payloads: o
        })).signed_payloads.map(ce).map((i) => ({
          signedMessage: i,
          signature: i.slice(-64)
        }))));
      } catch (a) {
        throw new Error(_e(a), { cause: a });
      }
    });
    N(this, Pn, async (...e) => {
      const t = [];
      if (e.length > 1) for (const r of e) t.push(await d(this, Jt).call(this, r));
      else return [await d(this, Jt).call(this, e[0])];
      return t;
    });
    N(this, Jt, async (e) => {
      V(this, we, !0);
      try {
        const t = await d(this, Wt).call(this, {
          ...e,
          domain: e?.domain ?? window.location.host
        });
        if (!t.sign_in_result) throw new Error("Sign in failed, no sign in result returned by wallet");
        const r = t.sign_in_result.address, n = t.accounts.find((o) => o.address == r);
        return {
          account: {
            ...n ?? { address: an(ce(r)) },
            publicKey: ce(r),
            chains: n?.chains ?? d(this, Ue),
            features: n?.features ?? t.capabilities.features
          },
          signedMessage: ce(t.sign_in_result.signed_message),
          signature: ce(t.sign_in_result.signature)
        };
      } catch (t) {
        throw new Error(_e(t), { cause: t });
      } finally {
        V(this, we, !1);
      }
    });
    const { appIdentity: t, authorizationCache: r = Xr(), chains: n, chainSelector: o = Zr(), onWalletNotFound: a = Jr() } = e;
    V(this, Te, r), V(this, Rt, t), V(this, Ue, n), V(this, zt, o), V(this, Ze, "remoteHostAuthority" in e ? {
      kind: "reflector",
      domain: e.remoteHostAuthority
    } : {
      kind: "nostr",
      domain: e.nostrRelay
    }), V(this, Kt, a), V(this, Xe, {
      [Ie]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signAndSendTransaction: d(this, Xt)
      },
      [be]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: d(this, Zt)
      }
    });
  }
  get version() {
    return d(this, wn);
  }
  get name() {
    return d(this, In);
  }
  get url() {
    return d(this, bn);
  }
  get icon() {
    return d(this, Cn);
  }
  get chains() {
    return d(this, Ue);
  }
  get features() {
    return {
      [Ja]: {
        version: "1.0.0",
        connect: d(this, Ln)
      },
      [Qa]: {
        version: "1.0.0",
        disconnect: d(this, Yt)
      },
      [ei]: {
        version: "1.0.0",
        on: d(this, yn)
      },
      [Yr]: {
        version: "1.0.0",
        signMessage: d(this, Mn)
      },
      [Wr]: {
        version: "1.0.0",
        signIn: d(this, Pn)
      },
      ...d(this, Xe)
    };
  }
  get accounts() {
    return d(this, se)?.accounts ?? [];
  }
  get connected() {
    return !!d(this, Re) && !!d(this, se);
  }
  get isAuthorized() {
    return !!d(this, se);
  }
  get currentAuthorization() {
    return d(this, se);
  }
  get cachedAuthorizationResult() {
    return d(this, Te).get();
  }
}, Pe = new WeakMap(), wn = new WeakMap(), In = new WeakMap(), bn = new WeakMap(), Cn = new WeakMap(), Rt = new WeakMap(), se = new WeakMap(), Te = new WeakMap(), we = new WeakMap(), ht = new WeakMap(), Ue = new WeakMap(), zt = new WeakMap(), Xe = new WeakMap(), Kt = new WeakMap(), Ze = new WeakMap(), Re = new WeakMap(), yn = new WeakMap(), $e = new WeakSet(), rn = function(e, ...t) {
  d(this, Pe)[e]?.forEach((r) => r.apply(null, t));
}, gi = function(e, t) {
  d(this, Pe)[e] = d(this, Pe)[e]?.filter((r) => t !== r);
}, Ln = new WeakMap(), Wt = new WeakMap(), Et = new WeakMap(), vn = new WeakMap(), ft = new WeakMap(), Yt = new WeakMap(), Je = new WeakMap(), At = new WeakMap(), jt = new WeakMap(), Dn = new WeakMap(), xn = new WeakMap(), Xt = new WeakMap(), Zt = new WeakMap(), Mn = new WeakMap(), Pn = new WeakMap(), Jt = new WeakMap(), da);
function zh(e) {
  if (typeof window > "u") {
    console.warn("MWA not registered: no window object");
    return;
  }
  if (!window.isSecureContext) {
    console.warn("MWA not registered: secure context required (https)");
    return;
  }
  const t = navigator.userAgent;
  yh() && (!vh(t) || Qr(t)) ? qn(new qh(e)) : Lh() && ("nostrRelay" in e || e.remoteHostAuthority !== void 0) ? "nostrRelay" in e ? qn(new na({
    ...e,
    nostrRelay: e.nostrRelay
  })) : qn(new na({
    ...e,
    remoteHostAuthority: e.remoteHostAuthority
  })) : console.warn("MWA not registered: device or environment not supported");
}
let ra = !1;
function Wh(e) {
  ra || (ra = !0, zh({
    appIdentity: { name: "Soothia", uri: e, icon: "img/icon-128.png" },
    authorizationCache: Xr(),
    chains: ["solana:mainnet"],
    chainSelector: Zr(),
    onWalletNotFound: Jr()
  }));
}
export {
  Wh as register
};
