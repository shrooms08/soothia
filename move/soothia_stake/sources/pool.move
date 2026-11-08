/// Soothia staking: a parimutuel YES/NO pool in SUI, one per question.
///
/// Stakers back one side before the question closes. A resolved pool first sits
/// through a challenge window, in which the AdminCap can overturn it and refund
/// everyone. After the window the winning side shares the pot less a fee, in
/// proportion to its stakes, and anyone can send the fee to the treasury with
/// collect_fee. A pool with no winners, or one nobody resolves in time, is void and
/// every staker takes their stake back.
///
/// The fee and both delays are copied into each pool when it is created, so a later
/// change to Config cannot affect a pool people have already staked in.
module soothia_stake::pool;

use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui::table::{Self, Table};

// Set at publish. The AdminCap can change all of these later.
const INITIAL_TREASURY: address = @0x8e0e9fecb8141cc2635effcb1a0d25c96331eecae8eb998329c47241259abb6a;
const INITIAL_FEE_BPS: u64 = 100;
const INITIAL_MIN_STAKE: u64 = 100_000_000;
const INITIAL_MAX_STAKE_PER_USER: u64 = 5_000_000_000;
const INITIAL_MAX_POOL: u64 = 50_000_000_000;
const INITIAL_REFUND_AFTER_MS: u64 = 604_800_000;
const INITIAL_MIN_RESOLVE_DELAY_MS: u64 = 8_100_000;
const INITIAL_CHALLENGE_MS: u64 = 21_600_000;

const MAX_FEE_BPS: u64 = 500;
const BPS_DENOMINATOR: u128 = 10_000;
const HASH_LENGTH: u64 = 32;
const MAX_MIN_RESOLVE_DELAY_MS: u64 = 86_400_000;
const MAX_CHALLENGE_MS: u64 = 172_800_000;
const MAX_EVIDENCE_LENGTH: u64 = 200;

const STATUS_OPEN: u8 = 0;
const STATUS_RESOLVED: u8 = 1;
const STATUS_VOID: u8 = 2;

const EBadQuestionHash: u64 = 0;
const ECloseNotInFuture: u64 = 1;
const EAlreadyRegistered: u64 = 2;
const EPoolNotOpen: u64 = 3;
const EPoolClosed: u64 = 4;
const EBelowMinStake: u64 = 5;
const ESideSwitch: u64 = 6;
const EUserCapReached: u64 = 7;
const EPoolCapReached: u64 = 8;
const EBadPickHash: u64 = 9;
const EPoolStillRunning: u64 = 10;
const ERefundWindowNotReached: u64 = 11;
const EPoolNotSettled: u64 = 12;
const ENoPosition: u64 = 13;
const EAlreadyClaimed: u64 = 14;
const ELoser: u64 = 15;
const EFeeTooHigh: u64 = 16;
const EBadLimits: u64 = 17;
const EEvidenceTooLong: u64 = 18;
const EChallengeWindowOpen: u64 = 19;
const EChallengeWindowOver: u64 = 20;
const EPoolNotResolved: u64 = 21;
const EFeeAlreadyCollected: u64 = 22;
const EDelayTooLong: u64 = 23;

/// May change the treasury, the fee, the limits and the delays, and overturn a resolution.
public struct AdminCap has key, store { id: UID }

/// May create, resolve and void pools.
public struct ResolverCap has key, store { id: UID }

public struct Config has key {
    id: UID,
    treasury: address,
    fee_bps: u64,
    min_stake: u64,
    max_stake_per_user: u64,
    max_pool: u64,
    refund_after_ms: u64,
    min_resolve_delay_ms: u64,
    challenge_ms: u64,
    /// question_hash to pool id. A question can only ever have one pool.
    registry: Table<vector<u8>, ID>,
}

public struct Position has store {
    side: bool,
    amount: u64,
    claimed: bool,
}

public struct Pool has key {
    id: UID,
    question_hash: vector<u8>,
    close_ms: u64,
    /// Copied from Config when the pool is created.
    fee_bps: u64,
    min_resolve_delay_ms: u64,
    challenge_ms: u64,
    /// The two sides stay apart until the challenge window ends, so an overturn can
    /// refund both. After that this holds the whole pot and `no` is empty.
    yes: Balance<SUI>,
    no: Balance<SUI>,
    positions: Table<address, Position>,
    status: u8,
    outcome: bool,
    fee_amount: u64,
    fee_collected: bool,
    yes_total: u64,
    no_total: u64,
    resolved_at_ms: u64,
    evidence: vector<u8>,
}

public struct PoolCreated has copy, drop {
    pool: ID,
    question_hash: vector<u8>,
    close_ms: u64,
}

public struct Staked has copy, drop {
    pool: ID,
    staker: address,
    side: bool,
    amount: u64,
    pick_hash: vector<u8>,
}

public struct Resolved has copy, drop {
    pool: ID,
    outcome_yes: bool,
    yes_total: u64,
    no_total: u64,
    fee: u64,
    resolved_at_ms: u64,
    evidence: vector<u8>,
}

public struct Overturned has copy, drop {
    pool: ID,
}

public struct FeeCollected has copy, drop {
    pool: ID,
    treasury: address,
    amount: u64,
}

public struct Voided has copy, drop {
    pool: ID,
}

public struct Claimed has copy, drop {
    pool: ID,
    claimer: address,
    amount: u64,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(Config {
        id: object::new(ctx),
        treasury: INITIAL_TREASURY,
        fee_bps: INITIAL_FEE_BPS,
        min_stake: INITIAL_MIN_STAKE,
        max_stake_per_user: INITIAL_MAX_STAKE_PER_USER,
        max_pool: INITIAL_MAX_POOL,
        refund_after_ms: INITIAL_REFUND_AFTER_MS,
        min_resolve_delay_ms: INITIAL_MIN_RESOLVE_DELAY_MS,
        challenge_ms: INITIAL_CHALLENGE_MS,
        registry: table::new(ctx),
    });
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
    transfer::transfer(ResolverCap { id: object::new(ctx) }, ctx.sender());
}

// ---- Admin ----

public fun set_treasury(_: &AdminCap, config: &mut Config, treasury: address) {
    config.treasury = treasury;
}

public fun set_fee_bps(_: &AdminCap, config: &mut Config, fee_bps: u64) {
    assert!(fee_bps <= MAX_FEE_BPS, EFeeTooHigh);
    config.fee_bps = fee_bps;
}

public fun set_limits(
    _: &AdminCap,
    config: &mut Config,
    min_stake: u64,
    max_stake_per_user: u64,
    max_pool: u64,
    refund_after_ms: u64,
) {
    assert!(min_stake > 0 && min_stake <= max_stake_per_user && max_stake_per_user <= max_pool, EBadLimits);
    config.min_stake = min_stake;
    config.max_stake_per_user = max_stake_per_user;
    config.max_pool = max_pool;
    config.refund_after_ms = refund_after_ms;
}

public fun set_delays(_: &AdminCap, config: &mut Config, min_resolve_delay_ms: u64, challenge_ms: u64) {
    assert!(min_resolve_delay_ms <= MAX_MIN_RESOLVE_DELAY_MS && challenge_ms <= MAX_CHALLENGE_MS, EDelayTooLong);
    config.min_resolve_delay_ms = min_resolve_delay_ms;
    config.challenge_ms = challenge_ms;
}

// ---- Pools ----

public fun create_pool(
    _: &ResolverCap,
    config: &mut Config,
    question_hash: vector<u8>,
    close_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(question_hash.length() == HASH_LENGTH, EBadQuestionHash);
    assert!(close_ms > clock.timestamp_ms(), ECloseNotInFuture);
    assert!(!config.registry.contains(question_hash), EAlreadyRegistered);
    let pool = Pool {
        id: object::new(ctx),
        question_hash,
        close_ms,
        fee_bps: config.fee_bps,
        min_resolve_delay_ms: config.min_resolve_delay_ms,
        challenge_ms: config.challenge_ms,
        yes: balance::zero(),
        no: balance::zero(),
        positions: table::new(ctx),
        status: STATUS_OPEN,
        outcome: false,
        fee_amount: 0,
        fee_collected: false,
        yes_total: 0,
        no_total: 0,
        resolved_at_ms: 0,
        evidence: vector[],
    };
    let pool_id = object::id(&pool);
    config.registry.add(question_hash, pool_id);
    event::emit(PoolCreated { pool: pool_id, question_hash, close_ms });
    transfer::share_object(pool);
}

public fun stake(
    config: &Config,
    pool: &mut Pool,
    side: bool,
    payment: Coin<SUI>,
    pick_hash: vector<u8>,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(pool.status == STATUS_OPEN, EPoolNotOpen);
    assert!(clock.timestamp_ms() < pool.close_ms, EPoolClosed);
    assert!(pick_hash.length() == HASH_LENGTH, EBadPickHash);
    let amount = payment.value();
    assert!(amount >= config.min_stake, EBelowMinStake);
    assert!(pool.yes.value() + pool.no.value() + amount <= config.max_pool, EPoolCapReached);

    let staker = ctx.sender();
    if (pool.positions.contains(staker)) {
        let position = table::borrow_mut(&mut pool.positions, staker);
        assert!(position.side == side, ESideSwitch);
        assert!(position.amount + amount <= config.max_stake_per_user, EUserCapReached);
        position.amount = position.amount + amount;
    } else {
        assert!(amount <= config.max_stake_per_user, EUserCapReached);
        pool.positions.add(staker, Position { side, amount, claimed: false });
    };

    let stake_balance = payment.into_balance();
    if (side) {
        pool.yes.join(stake_balance);
    } else {
        pool.no.join(stake_balance);
    };
    event::emit(Staked { pool: object::id(pool), staker, side, amount, pick_hash });
}

public fun resolve(
    _: &ResolverCap,
    pool: &mut Pool,
    outcome_yes: bool,
    evidence: vector<u8>,
    clock: &Clock,
) {
    assert!(pool.status == STATUS_OPEN, EPoolNotOpen);
    assert!(evidence.length() <= MAX_EVIDENCE_LENGTH, EEvidenceTooLong);
    let now = clock.timestamp_ms();
    assert!(now >= pool.close_ms + pool.min_resolve_delay_ms, EPoolStillRunning);

    let yes_total = pool.yes.value();
    let no_total = pool.no.value();
    pool.yes_total = yes_total;
    pool.no_total = no_total;

    let winning_total = if (outcome_yes) yes_total else no_total;
    if (winning_total == 0) {
        mark_void(pool);
        return
    };

    let fee = fee_on(yes_total + no_total, pool.fee_bps);
    pool.status = STATUS_RESOLVED;
    pool.outcome = outcome_yes;
    pool.fee_amount = fee;
    pool.resolved_at_ms = now;
    pool.evidence = evidence;
    event::emit(Resolved {
        pool: object::id(pool),
        outcome_yes,
        yes_total,
        no_total,
        fee,
        resolved_at_ms: now,
        evidence,
    });
}

/// During the challenge window, the AdminCap can undo a resolution. Everyone is refunded.
public fun overturn(_: &AdminCap, pool: &mut Pool, clock: &Clock) {
    assert!(pool.status == STATUS_RESOLVED, EPoolNotResolved);
    assert!(clock.timestamp_ms() < challenge_ends_at(pool), EChallengeWindowOver);
    pool.status = STATUS_VOID;
    pool.fee_amount = 0;
    event::emit(Overturned { pool: object::id(pool) });
}

/// After the challenge window, anyone can send the fee to the treasury, once.
public fun collect_fee(config: &Config, pool: &mut Pool, clock: &Clock, ctx: &mut TxContext) {
    assert!(pool.status == STATUS_RESOLVED, EPoolNotResolved);
    assert!(clock.timestamp_ms() >= challenge_ends_at(pool), EChallengeWindowOpen);
    assert!(!pool.fee_collected, EFeeAlreadyCollected);
    pool.fee_collected = true;
    merge_pot(pool);
    let amount = pool.fee_amount;
    if (amount > 0) {
        transfer::public_transfer(coin::from_balance(pool.yes.split(amount), ctx), config.treasury);
    };
    event::emit(FeeCollected { pool: object::id(pool), treasury: config.treasury, amount });
}

public fun void(_: &ResolverCap, pool: &mut Pool) {
    assert!(pool.status == STATUS_OPEN, EPoolNotOpen);
    mark_void(pool);
}

/// Anyone may void a pool nobody resolved in time, so stakes can never be stuck.
public fun void_expired(config: &Config, pool: &mut Pool, clock: &Clock) {
    assert!(pool.status == STATUS_OPEN, EPoolNotOpen);
    let now = clock.timestamp_ms();
    assert!(now > pool.close_ms && now - pool.close_ms > config.refund_after_ms, ERefundWindowNotReached);
    mark_void(pool);
}

#[allow(lint(self_transfer))]
public fun claim(pool: &mut Pool, clock: &Clock, ctx: &mut TxContext) {
    assert!(pool.status != STATUS_OPEN, EPoolNotSettled);
    if (pool.status == STATUS_RESOLVED) {
        assert!(clock.timestamp_ms() >= challenge_ends_at(pool), EChallengeWindowOpen);
    };
    let claimer = ctx.sender();
    assert!(pool.positions.contains(claimer), ENoPosition);

    let position = table::borrow_mut(&mut pool.positions, claimer);
    assert!(!position.claimed, EAlreadyClaimed);
    position.claimed = true;
    let side = position.side;
    let staked = position.amount;

    let payout_balance = if (pool.status == STATUS_VOID) {
        if (side) pool.yes.split(staked) else pool.no.split(staked)
    } else {
        assert!(side == pool.outcome, ELoser);
        merge_pot(pool);
        let winning_total = if (pool.outcome) pool.yes_total else pool.no_total;
        let net_pot = pool.yes_total + pool.no_total - pool.fee_amount;
        pool.yes.split(payout(staked, net_pot, winning_total))
    };

    let amount = payout_balance.value();
    transfer::public_transfer(coin::from_balance(payout_balance, ctx), claimer);
    event::emit(Claimed { pool: object::id(pool), claimer, amount });
}

fun mark_void(pool: &mut Pool) {
    pool.status = STATUS_VOID;
    event::emit(Voided { pool: object::id(pool) });
}

fun challenge_ends_at(pool: &Pool): u64 {
    pool.resolved_at_ms + pool.challenge_ms
}

/// Moves the losing stakes into `yes`. Safe to call more than once.
fun merge_pot(pool: &mut Pool) {
    let losing_stakes = balance::withdraw_all(&mut pool.no);
    pool.yes.join(losing_stakes);
}

fun fee_on(total: u64, fee_bps: u64): u64 {
    (((total as u128) * (fee_bps as u128) / BPS_DENOMINATOR) as u64)
}

/// Rounds down, so payouts can never add up to more than the net pot.
fun payout(staked: u64, net_pot: u64, winning_total: u64): u64 {
    (((staked as u128) * (net_pot as u128) / (winning_total as u128)) as u64)
}

// ---- Tests only ----

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

#[test_only]
public fun is_open(pool: &Pool): bool { pool.status == STATUS_OPEN }

#[test_only]
public fun is_resolved(pool: &Pool): bool { pool.status == STATUS_RESOLVED }

#[test_only]
public fun is_void(pool: &Pool): bool { pool.status == STATUS_VOID }

#[test_only]
public fun fee_amount(pool: &Pool): u64 { pool.fee_amount }

#[test_only]
public fun evidence(pool: &Pool): vector<u8> { pool.evidence }

#[test_only]
public fun resolved_at_ms(pool: &Pool): u64 { pool.resolved_at_ms }

/// What is left in the pool.
#[test_only]
public fun held(pool: &Pool): u64 { pool.yes.value() + pool.no.value() }

#[test_only]
public fun fee_bps(config: &Config): u64 { config.fee_bps }
