#[test_only]
/// Audit tests. Each test named `finding_*` PASSES while the finding still exists:
/// it asserts the current (undesired) behaviour. Tests named `sound_*` check
/// behaviour that the audit found correct, at its edges.
module soothia_stake::security_tests;

use soothia_stake::pool::{Self, AdminCap, Config, Pool, ResolverCap};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario::{Self as ts, Scenario};

const PUBLISHER: address = @0xA;
const TREASURY: address = @0x8e0e9fecb8141cc2635effcb1a0d25c96331eecae8eb998329c47241259abb6a;
const ALICE: address = @0x1;
const BOB: address = @0x2;
const CAROL: address = @0x3;

const START: u64 = 1_000_000;
const CLOSE: u64 = 2_000_000;
const DELAY: u64 = 8_100_000;
const CHALLENGE: u64 = 21_600_000;
const RESOLVE_AT: u64 = CLOSE + DELAY;
const CLAIM_AT: u64 = RESOLVE_AT + CHALLENGE;
const SUI_1: u64 = 1_000_000_000;
const MIN: u64 = 100_000_000;
const MAX_USER: u64 = 5_000_000_000;
const MAX_POOL: u64 = 50_000_000_000;
const DAY: u64 = 86_400_000;
const U64_MAX: u64 = 18_446_744_073_709_551_615;

fun hash(byte: u8): vector<u8> {
    vector::tabulate!(32, |_| byte)
}

fun setup(): (Scenario, Clock) {
    let mut scenario = ts::begin(PUBLISHER);
    pool::init_for_testing(scenario.ctx());
    scenario.next_tx(PUBLISHER);
    let mut clock = clock::create_for_testing(scenario.ctx());
    clock.set_for_testing(START);
    (scenario, clock)
}

fun finish(scenario: Scenario, clock: Clock) {
    clock.destroy_for_testing();
    scenario.end();
}

fun new_pool(scenario: &mut Scenario, clock: &Clock, close_ms: u64) {
    scenario.next_tx(PUBLISHER);
    let cap = scenario.take_from_sender<ResolverCap>();
    let mut config = scenario.take_shared<Config>();
    pool::create_pool(&cap, &mut config, hash(1), close_ms, clock, scenario.ctx());
    scenario.return_to_sender(cap);
    ts::return_shared(config);
}

fun stake(scenario: &mut Scenario, clock: &Clock, who: address, side: bool, amount: u64) {
    scenario.next_tx(who);
    let config = scenario.take_shared<Config>();
    let mut p = scenario.take_shared<Pool>();
    let payment = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    pool::stake(&config, &mut p, side, payment, hash(9), clock, scenario.ctx());
    ts::return_shared(config);
    ts::return_shared(p);
}

fun resolve(scenario: &mut Scenario, clock: &Clock, outcome_yes: bool) {
    scenario.next_tx(PUBLISHER);
    let cap = scenario.take_from_sender<ResolverCap>();
    let mut p = scenario.take_shared<Pool>();
    pool::resolve(&cap, &mut p, outcome_yes, b"audit", clock);
    scenario.return_to_sender(cap);
    ts::return_shared(p);
}

fun claim(scenario: &mut Scenario, clock: &Clock, who: address) {
    scenario.next_tx(who);
    let mut p = scenario.take_shared<Pool>();
    pool::claim(&mut p, clock, scenario.ctx());
    ts::return_shared(p);
}

fun collect_fee(scenario: &mut Scenario, clock: &Clock) {
    scenario.next_tx(CAROL);
    let config = scenario.take_shared<Config>();
    let mut p = scenario.take_shared<Pool>();
    pool::collect_fee(&config, &mut p, clock, scenario.ctx());
    ts::return_shared(config);
    ts::return_shared(p);
}

fun overturn(scenario: &mut Scenario, clock: &Clock) {
    scenario.next_tx(PUBLISHER);
    let cap = scenario.take_from_sender<AdminCap>();
    let mut p = scenario.take_shared<Pool>();
    pool::overturn(&cap, &mut p, clock);
    scenario.return_to_sender(cap);
    ts::return_shared(p);
}

fun set_refund_after(scenario: &mut Scenario, refund_after_ms: u64) {
    scenario.next_tx(PUBLISHER);
    let cap = scenario.take_from_sender<AdminCap>();
    let mut config = scenario.take_shared<Config>();
    pool::set_limits(&cap, &mut config, MIN, MAX_USER, MAX_POOL, refund_after_ms);
    scenario.return_to_sender(cap);
    ts::return_shared(config);
}

fun void_expired(scenario: &mut Scenario, clock: &Clock) {
    scenario.next_tx(CAROL);
    let config = scenario.take_shared<Config>();
    let mut p = scenario.take_shared<Pool>();
    pool::void_expired(&config, &mut p, clock);
    ts::return_shared(config);
    ts::return_shared(p);
}

/// Sum of every SUI coin `who` holds.
fun received(scenario: &mut Scenario, who: address): u64 {
    scenario.next_tx(who);
    let mut total = 0;
    let ids = ts::ids_for_address<Coin<SUI>>(who);
    let mut i = 0;
    while (i < ids.length()) {
        let held = scenario.take_from_address_by_id<Coin<SUI>>(who, ids[i]);
        total = total + held.value();
        ts::return_to_address(who, held);
        i = i + 1;
    };
    total
}

fun is_void(scenario: &mut Scenario): bool {
    scenario.next_tx(PUBLISHER);
    let p = scenario.take_shared<Pool>();
    let v = p.is_void();
    ts::return_shared(p);
    v
}

fun held(scenario: &mut Scenario): u64 {
    scenario.next_tx(PUBLISHER);
    let p = scenario.take_shared<Pool>();
    let value = p.held();
    ts::return_shared(p);
    value
}

fun sybil(i: u64): address {
    sui::address::from_u256(0x1000 + (i as u256))
}

// ---- M-1: the fee is charged on the whole pot, even with no (or too few) losers ----

#[test]
/// A pool where everyone backed the winning side is resolved, not voided, and every
/// "winner" gets back 1% less than they staked. The treasury earns a fee on a pool
/// in which nobody lost anything.
fun finding_one_sided_pool_charges_winners_a_fee() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, BOB, true, 2 * SUI_1);
    clock.set_for_testing(RESOLVE_AT);
    resolve(&mut scenario, &clock, true);
    clock.set_for_testing(CLAIM_AT);
    claim(&mut scenario, &clock, ALICE);
    claim(&mut scenario, &clock, BOB);
    collect_fee(&mut scenario, &clock);
    assert!(received(&mut scenario, ALICE) == 990_000_000); // staked 1 SUI, "won", got 0.99
    assert!(received(&mut scenario, BOB) == 1_980_000_000); // staked 2 SUI, got 1.98
    assert!(received(&mut scenario, TREASURY) == 30_000_000);
    finish(scenario, clock);
}

#[test]
/// With the default 1% fee and the default caps, the winning side can be paid less
/// than it staked whenever the losing side is under ~1% of the pot. Ten addresses
/// (one person, Sybil) fill 49.9 SUI on YES; one person stakes 0.1 SUI on NO.
/// YES wins and the winners collectively lose 0.399 SUI.
fun finding_fee_can_exceed_the_losing_side_so_winners_lose() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    let mut i = 0;
    while (i < 9) {
        stake(&mut scenario, &clock, sybil(i), true, MAX_USER);
        i = i + 1;
    };
    stake(&mut scenario, &clock, sybil(9), true, 4_900_000_000);
    stake(&mut scenario, &clock, CAROL, false, MIN);
    clock.set_for_testing(RESOLVE_AT);
    resolve(&mut scenario, &clock, true);
    clock.set_for_testing(CLAIM_AT);

    let mut paid = 0;
    let mut j = 0;
    while (j < 10) {
        claim(&mut scenario, &clock, sybil(j));
        paid = paid + received(&mut scenario, sybil(j));
        j = j + 1;
    };
    let staked_by_winners = 9 * MAX_USER + 4_900_000_000;
    assert!(paid < staked_by_winners);
    // fee = 1% of 50 SUI = 0.5 SUI, but the losers only put in 0.1 SUI.
    assert!(staked_by_winners - paid >= 399_000_000);
    // The per-user cap did not stop one person holding 49.9 of the 50 SUI pool.
    finish(scenario, clock);
}

// ---- M-2: refund_after_ms is unbounded and applies to pools already open ----

#[test]
/// The AdminCap sets refund_after_ms to 0 on a pool people already staked in. One
/// millisecond after close, anyone (here CAROL, a stranger) can void it, long before
/// the resolver is even allowed to resolve (close + 2h15). A losing side that knows
/// the score voids every pool and escapes.
fun finding_refund_after_zero_lets_anyone_void_before_resolution() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, BOB, false, SUI_1);
    set_refund_after(&mut scenario, 0);
    clock.set_for_testing(CLOSE + 1);
    void_expired(&mut scenario, &clock);
    assert!(is_void(&mut scenario));
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::ERefundWindowNotReached)]
/// The AdminCap sets refund_after_ms to u64::MAX: the "anyone can void after 7 days"
/// safety net is gone for every existing pool. A year after close it still aborts.
fun finding_refund_after_max_disables_the_safety_net_for_existing_pools() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    set_refund_after(&mut scenario, U64_MAX);
    clock.set_for_testing(CLOSE + 365 * DAY);
    void_expired(&mut scenario, &clock);
    finish(scenario, clock);
}

// ---- M-4 (Info): close_ms has no upper bound ----

#[test, expected_failure(arithmetic_error, location = soothia_stake::pool)]
/// A pool created with a close time near u64::MAX can never be resolved: the
/// `close_ms + min_resolve_delay_ms` check overflows. void_expired can never fire
/// either; only the ResolverCap's `void` can release the stakes.
fun finding_far_future_close_cannot_be_resolved() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, U64_MAX - 1);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    clock.set_for_testing(RESOLVE_AT);
    resolve(&mut scenario, &clock, true);
    finish(scenario, clock);
}

// ---- Sound: edges the audit checked ----

#[test]
/// Overturn works at the last millisecond of the window.
fun sound_overturn_at_the_last_millisecond() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, BOB, false, 3 * SUI_1);
    clock.set_for_testing(RESOLVE_AT);
    resolve(&mut scenario, &clock, true);
    clock.set_for_testing(CLAIM_AT - 1);
    overturn(&mut scenario, &clock);
    clock.set_for_testing(CLAIM_AT + 1);
    claim(&mut scenario, &clock, ALICE);
    claim(&mut scenario, &clock, BOB);
    assert!(received(&mut scenario, ALICE) == SUI_1);
    assert!(received(&mut scenario, BOB) == 3 * SUI_1);
    assert!(held(&mut scenario) == 0);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EChallengeWindowOpen)]
/// A claim at the last millisecond of the window is refused.
fun sound_claim_at_the_last_millisecond_of_the_window_aborts() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, BOB, false, SUI_1);
    clock.set_for_testing(RESOLVE_AT);
    resolve(&mut scenario, &clock, true);
    clock.set_for_testing(CLAIM_AT - 1);
    claim(&mut scenario, &clock, ALICE);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EChallengeWindowOver)]
/// Once the window has ended and a claim has merged the pot, an overturn is refused,
/// so a void refund can never run against a merged pot.
fun sound_overturn_after_a_claim_aborts() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, BOB, false, SUI_1);
    clock.set_for_testing(RESOLVE_AT);
    resolve(&mut scenario, &clock, true);
    clock.set_for_testing(CLAIM_AT);
    claim(&mut scenario, &clock, ALICE);
    overturn(&mut scenario, &clock);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EPoolNotOpen)]
/// The resolver cannot void a resolved pool (it could otherwise refund a merged pot).
fun sound_resolver_cannot_void_a_resolved_pool() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, BOB, false, SUI_1);
    clock.set_for_testing(RESOLVE_AT);
    resolve(&mut scenario, &clock, true);
    scenario.next_tx(PUBLISHER);
    let cap = scenario.take_from_sender<ResolverCap>();
    let mut p = scenario.take_shared<Pool>();
    pool::void(&cap, &mut p);
    scenario.return_to_sender(cap);
    ts::return_shared(p);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EPoolNotOpen)]
/// void_expired cannot hit a resolved pool, even years later.
fun sound_void_expired_cannot_hit_a_resolved_pool() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, BOB, false, SUI_1);
    clock.set_for_testing(RESOLVE_AT);
    resolve(&mut scenario, &clock, true);
    clock.set_for_testing(CLOSE + 3650 * DAY);
    void_expired(&mut scenario, &clock);
    finish(scenario, clock);
}

#[test]
/// void_expired at exactly close + refund_after is refused, one ms later it works.
fun sound_void_expired_boundary() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    clock.set_for_testing(CLOSE + 7 * DAY + 1);
    void_expired(&mut scenario, &clock);
    assert!(is_void(&mut scenario));
    claim(&mut scenario, &clock, ALICE);
    assert!(received(&mut scenario, ALICE) == SUI_1);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::ERefundWindowNotReached)]
fun sound_void_expired_at_exactly_seven_days_aborts() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    clock.set_for_testing(CLOSE + 7 * DAY);
    void_expired(&mut scenario, &clock);
    finish(scenario, clock);
}

#[test]
/// Many uneven winners, the fee collected in the middle of the claims: the pool
/// never pays out more than it holds, and what is left is dust under one mist per
/// winner.
fun sound_payouts_and_fee_never_exceed_the_pot() {
    let (mut scenario, mut clock) = setup();
    new_pool(&mut scenario, &clock, CLOSE);
    let stakes = vector[100_000_007, 333_333_333, 4_999_999_999, 123_456_789, 777_777_777, 100_000_001];
    let mut i = 0;
    let mut total = 0;
    while (i < stakes.length()) {
        stake(&mut scenario, &clock, sybil(i), true, stakes[i]);
        total = total + stakes[i];
        i = i + 1;
    };
    stake(&mut scenario, &clock, CAROL, false, 1_234_567_891);
    total = total + 1_234_567_891;
    clock.set_for_testing(RESOLVE_AT);
    resolve(&mut scenario, &clock, true);
    clock.set_for_testing(CLAIM_AT);
    let mut out = 0;
    let mut j = 0;
    while (j < stakes.length()) {
        if (j == 3) collect_fee(&mut scenario, &clock);
        claim(&mut scenario, &clock, sybil(j));
        out = out + received(&mut scenario, sybil(j));
        j = j + 1;
    };
    out = out + received(&mut scenario, TREASURY);
    let dust = held(&mut scenario);
    assert!(out + dust == total);
    assert!(dust < stakes.length());
    finish(scenario, clock);
}
