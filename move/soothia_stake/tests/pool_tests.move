#[test_only]
module soothia_stake::pool_tests;

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
const REFUND_AFTER: u64 = 604_800_000;
const SUI_1: u64 = 1_000_000_000;
const MIN: u64 = 100_000_000;

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

fun new_pool(scenario: &mut Scenario, clock: &Clock, question: vector<u8>, close_ms: u64) {
    scenario.next_tx(PUBLISHER);
    let cap = scenario.take_from_sender<ResolverCap>();
    let mut config = scenario.take_shared<Config>();
    pool::create_pool(&cap, &mut config, question, close_ms, clock, scenario.ctx());
    scenario.return_to_sender(cap);
    ts::return_shared(config);
}

fun open_pool(): (Scenario, Clock) {
    let (mut scenario, clock) = setup();
    new_pool(&mut scenario, &clock, hash(1), CLOSE);
    (scenario, clock)
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
    let config = scenario.take_shared<Config>();
    let mut p = scenario.take_shared<Pool>();
    pool::resolve(&cap, &config, &mut p, outcome_yes, clock, scenario.ctx());
    scenario.return_to_sender(cap);
    ts::return_shared(config);
    ts::return_shared(p);
}

fun claim(scenario: &mut Scenario, who: address) {
    scenario.next_tx(who);
    let mut p = scenario.take_shared<Pool>();
    pool::claim(&mut p, scenario.ctx());
    ts::return_shared(p);
}

/// The value of the coin `who` just received.
fun received(scenario: &mut Scenario, who: address): u64 {
    scenario.next_tx(who);
    let paid = scenario.take_from_address<Coin<SUI>>(who);
    let value = paid.value();
    ts::return_to_address(who, paid);
    value
}

fun held(scenario: &mut Scenario): u64 {
    scenario.next_tx(PUBLISHER);
    let p = scenario.take_shared<Pool>();
    let value = p.held();
    ts::return_shared(p);
    value
}

fun set_limits(scenario: &mut Scenario, min_stake: u64, max_user: u64, max_pool: u64) {
    scenario.next_tx(PUBLISHER);
    let cap = scenario.take_from_sender<AdminCap>();
    let mut config = scenario.take_shared<Config>();
    pool::set_limits(&cap, &mut config, min_stake, max_user, max_pool, REFUND_AFTER);
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

fun assert_status(scenario: &mut Scenario, open: bool, resolved: bool, void: bool) {
    scenario.next_tx(PUBLISHER);
    let p = scenario.take_shared<Pool>();
    assert!(p.is_open() == open);
    assert!(p.is_resolved() == resolved);
    assert!(p.is_void() == void);
    ts::return_shared(p);
}

#[test]
fun happy_path_three_stakers() {
    let (mut scenario, mut clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, BOB, true, 3 * SUI_1);
    stake(&mut scenario, &clock, CAROL, false, 2 * SUI_1);
    assert!(held(&mut scenario) == 6 * SUI_1);

    clock.set_for_testing(CLOSE);
    resolve(&mut scenario, &clock, true);
    assert_status(&mut scenario, false, true, false);
    // 1% of 6 SUI.
    assert!(received(&mut scenario, TREASURY) == 60_000_000);

    claim(&mut scenario, ALICE);
    assert!(received(&mut scenario, ALICE) == 1_485_000_000);
    claim(&mut scenario, BOB);
    assert!(received(&mut scenario, BOB) == 4_455_000_000);
    assert!(held(&mut scenario) == 0);
    finish(scenario, clock);
}

#[test]
fun a_top_up_on_the_same_side_adds_to_the_position() {
    let (mut scenario, mut clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, MIN);
    stake(&mut scenario, &clock, ALICE, true, MIN);
    stake(&mut scenario, &clock, CAROL, false, 2 * MIN);
    clock.set_for_testing(CLOSE);
    resolve(&mut scenario, &clock, true);
    claim(&mut scenario, ALICE);
    // The only winner takes the whole pot, less 1%.
    assert!(received(&mut scenario, ALICE) == 396_000_000);
    finish(scenario, clock);
}

#[test]
fun rounding_never_overpays_and_dust_stays_in_the_pool() {
    let (mut scenario, mut clock) = open_pool();
    let (a, b, c, loser) = (100_000_001, 100_000_002, 100_000_004, 333_333_337);
    stake(&mut scenario, &clock, ALICE, true, a);
    stake(&mut scenario, &clock, BOB, true, b);
    stake(&mut scenario, &clock, @0x4, true, c);
    stake(&mut scenario, &clock, CAROL, false, loser);
    clock.set_for_testing(CLOSE);
    resolve(&mut scenario, &clock, true);

    let pot = a + b + c + loser;
    let fee = received(&mut scenario, TREASURY);
    assert!(fee == pot / 100);
    let net = pot - fee;

    claim(&mut scenario, ALICE);
    claim(&mut scenario, BOB);
    claim(&mut scenario, @0x4);
    let paid = received(&mut scenario, ALICE) + received(&mut scenario, BOB) + received(&mut scenario, @0x4);
    assert!(paid <= net);
    let dust = held(&mut scenario);
    assert!(dust == net - paid);
    // Each winner rounds down by less than one unit.
    assert!(dust < 3);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EAlreadyClaimed)]
fun double_claim_aborts() {
    let (mut scenario, mut clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    clock.set_for_testing(CLOSE);
    resolve(&mut scenario, &clock, true);
    claim(&mut scenario, ALICE);
    claim(&mut scenario, ALICE);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::ELoser)]
fun loser_claim_aborts() {
    let (mut scenario, mut clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, CAROL, false, SUI_1);
    clock.set_for_testing(CLOSE);
    resolve(&mut scenario, &clock, true);
    claim(&mut scenario, CAROL);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::ENoPosition)]
fun claim_without_a_position_aborts() {
    let (mut scenario, mut clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    clock.set_for_testing(CLOSE);
    resolve(&mut scenario, &clock, true);
    claim(&mut scenario, BOB);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EPoolNotSettled)]
fun claim_while_open_aborts() {
    let (mut scenario, clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    claim(&mut scenario, ALICE);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EPoolClosed)]
fun stake_at_close_aborts() {
    let (mut scenario, mut clock) = open_pool();
    clock.set_for_testing(CLOSE);
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EBelowMinStake)]
fun stake_below_minimum_aborts() {
    let (mut scenario, clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, MIN - 1);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EUserCapReached)]
fun first_stake_above_the_user_cap_aborts() {
    let (mut scenario, clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, 5 * SUI_1 + 1);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EUserCapReached)]
fun top_up_above_the_user_cap_aborts() {
    let (mut scenario, clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, 5 * SUI_1);
    stake(&mut scenario, &clock, ALICE, true, MIN);
    finish(scenario, clock);
}

#[test]
fun exactly_the_caps_are_allowed() {
    let (mut scenario, clock) = open_pool();
    set_limits(&mut scenario, MIN, 5 * SUI_1, 6 * SUI_1);
    stake(&mut scenario, &clock, ALICE, true, 5 * SUI_1);
    stake(&mut scenario, &clock, BOB, false, SUI_1);
    assert!(held(&mut scenario) == 6 * SUI_1);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EPoolCapReached)]
fun stake_above_the_pool_cap_aborts() {
    let (mut scenario, clock) = open_pool();
    set_limits(&mut scenario, MIN, 5 * SUI_1, 6 * SUI_1);
    stake(&mut scenario, &clock, ALICE, true, 5 * SUI_1);
    stake(&mut scenario, &clock, BOB, false, SUI_1 + 1);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::ESideSwitch)]
fun switching_sides_aborts() {
    let (mut scenario, clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, ALICE, false, SUI_1);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EBadPickHash)]
fun a_short_pick_hash_aborts() {
    let (mut scenario, clock) = open_pool();
    scenario.next_tx(ALICE);
    let config = scenario.take_shared<Config>();
    let mut p = scenario.take_shared<Pool>();
    let payment = coin::mint_for_testing<SUI>(SUI_1, scenario.ctx());
    pool::stake(&config, &mut p, true, payment, b"short", &clock, scenario.ctx());
    ts::return_shared(config);
    ts::return_shared(p);
    finish(scenario, clock);
}

#[test]
fun a_pool_with_no_winners_voids_and_refunds_without_a_fee() {
    let (mut scenario, mut clock) = open_pool();
    stake(&mut scenario, &clock, CAROL, false, SUI_1);
    clock.set_for_testing(CLOSE);
    resolve(&mut scenario, &clock, true);
    assert_status(&mut scenario, false, false, true);
    claim(&mut scenario, CAROL);
    assert!(received(&mut scenario, CAROL) == SUI_1);
    scenario.next_tx(TREASURY);
    assert!(!ts::has_most_recent_for_address<Coin<SUI>>(TREASURY));
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EPoolStillRunning)]
fun resolve_before_close_aborts() {
    let (mut scenario, clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    resolve(&mut scenario, &clock, true);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EPoolNotOpen)]
fun resolving_twice_aborts() {
    let (mut scenario, mut clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    clock.set_for_testing(CLOSE);
    resolve(&mut scenario, &clock, true);
    resolve(&mut scenario, &clock, false);
    finish(scenario, clock);
}

#[test]
fun the_resolver_can_void_and_stakes_come_back_on_both_sides() {
    let (mut scenario, clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    stake(&mut scenario, &clock, CAROL, false, 2 * SUI_1);
    scenario.next_tx(PUBLISHER);
    let cap = scenario.take_from_sender<ResolverCap>();
    let mut p = scenario.take_shared<Pool>();
    pool::void(&cap, &mut p);
    scenario.return_to_sender(cap);
    ts::return_shared(p);
    claim(&mut scenario, ALICE);
    claim(&mut scenario, CAROL);
    assert!(received(&mut scenario, ALICE) == SUI_1);
    assert!(received(&mut scenario, CAROL) == 2 * SUI_1);
    assert!(held(&mut scenario) == 0);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::ERefundWindowNotReached)]
fun void_expired_inside_the_window_aborts() {
    let (mut scenario, mut clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    clock.set_for_testing(CLOSE + REFUND_AFTER);
    void_expired(&mut scenario, &clock);
    finish(scenario, clock);
}

#[test]
fun anyone_can_void_expired_after_the_window() {
    let (mut scenario, mut clock) = open_pool();
    stake(&mut scenario, &clock, ALICE, true, SUI_1);
    clock.set_for_testing(CLOSE + REFUND_AFTER + 1);
    void_expired(&mut scenario, &clock);
    assert_status(&mut scenario, false, false, true);
    claim(&mut scenario, ALICE);
    assert!(received(&mut scenario, ALICE) == SUI_1);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EFeeTooHigh)]
fun a_fee_above_500_is_rejected() {
    let (scenario, clock) = setup();
    let cap = scenario.take_from_sender<AdminCap>();
    let mut config = scenario.take_shared<Config>();
    pool::set_fee_bps(&cap, &mut config, 501);
    scenario.return_to_sender(cap);
    ts::return_shared(config);
    finish(scenario, clock);
}

#[test]
fun a_fee_of_exactly_500_is_allowed() {
    let (scenario, clock) = setup();
    let cap = scenario.take_from_sender<AdminCap>();
    let mut config = scenario.take_shared<Config>();
    pool::set_fee_bps(&cap, &mut config, 500);
    assert!(config.fee_bps() == 500);
    scenario.return_to_sender(cap);
    ts::return_shared(config);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EBadLimits)]
fun limits_that_contradict_each_other_are_rejected() {
    let (mut scenario, clock) = setup();
    set_limits(&mut scenario, 2 * SUI_1, SUI_1, 50 * SUI_1);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EAlreadyRegistered)]
fun a_duplicate_question_hash_is_rejected() {
    let (mut scenario, clock) = setup();
    new_pool(&mut scenario, &clock, hash(1), CLOSE);
    new_pool(&mut scenario, &clock, hash(1), CLOSE);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::EBadQuestionHash)]
fun a_short_question_hash_is_rejected() {
    let (mut scenario, clock) = setup();
    new_pool(&mut scenario, &clock, b"short", CLOSE);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = pool::ECloseNotInFuture)]
fun a_close_time_in_the_past_is_rejected() {
    let (mut scenario, clock) = setup();
    new_pool(&mut scenario, &clock, hash(1), START);
    finish(scenario, clock);
}
