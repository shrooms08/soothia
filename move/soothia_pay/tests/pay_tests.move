#[test_only]
module soothia_pay::pay_tests;

use soothia_pay::pay::{Self, AdminCap, PayConfig};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario::{Self as ts, Scenario};

const ADMIN: address = @0xA;
const PAYER: address = @0xB;
const RECIPIENT: address = @0xC;
const TREASURY: address = @0x8e0e9fecb8141cc2635effcb1a0d25c96331eecae8eb998329c47241259abb6a;
const NEW_TREASURY: address = @0xD;

fun nonce(byte: u8): vector<u8> {
    let mut out = vector[];
    let mut i = 0;
    while (i < 16) {
        out.push_back(byte);
        i = i + 1;
    };
    out
}

fun start(): Scenario {
    let mut scenario = ts::begin(ADMIN);
    pay::init_for_testing(scenario.ctx());
    scenario.next_tx(PAYER);
    scenario
}

fun pay_as_payer(scenario: &mut Scenario, amount: u64, n: vector<u8>) {
    let mut config = scenario.take_shared<PayConfig>();
    let payment = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    pay::pay(&mut config, n, RECIPIENT, payment, scenario.ctx());
    ts::return_shared(config);
}

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

macro fun as_admin($scenario: &mut Scenario, $action: |&AdminCap, &mut PayConfig|) {
    let scenario = $scenario;
    scenario.next_tx(ADMIN);
    let cap = scenario.take_from_sender<AdminCap>();
    let mut config = scenario.take_shared<PayConfig>();
    $action(&cap, &mut config);
    scenario.return_to_sender(cap);
    ts::return_shared(config);
    scenario.next_tx(PAYER);
}

#[test]
fun defaults_are_set_at_init() {
    let mut scenario = start();
    let config = scenario.take_shared<PayConfig>();
    assert!(config.fee_bps() == 1000);
    assert!(config.max_price_mist() == 500_000_000);
    assert!(config.treasury() == TREASURY);
    ts::return_shared(config);
    scenario.end();
}

#[test]
fun ten_percent_to_the_treasury_and_the_rest_to_the_caller() {
    let mut scenario = start();
    pay_as_payer(&mut scenario, 20_000_000, nonce(1));
    assert!(received(&mut scenario, RECIPIENT) == 18_000_000);
    assert!(received(&mut scenario, TREASURY) == 2_000_000);
    scenario.end();
}

#[test]
fun the_fee_rounds_down_and_the_caller_keeps_the_dust() {
    let mut scenario = start();
    pay_as_payer(&mut scenario, 19, nonce(1));
    assert!(received(&mut scenario, TREASURY) == 1);
    assert!(received(&mut scenario, RECIPIENT) == 18);
    scenario.end();
}

#[test]
fun an_amount_too_small_for_a_fee_all_goes_to_the_caller() {
    let mut scenario = start();
    pay_as_payer(&mut scenario, 9, nonce(1));
    assert!(received(&mut scenario, RECIPIENT) == 9);
    assert!(received(&mut scenario, TREASURY) == 0);
    scenario.end();
}

#[test]
fun the_maximum_price_is_allowed() {
    let mut scenario = start();
    pay_as_payer(&mut scenario, 500_000_000, nonce(1));
    assert!(received(&mut scenario, RECIPIENT) == 450_000_000);
    scenario.end();
}

#[test]
fun a_nonce_is_marked_used() {
    let mut scenario = start();
    pay_as_payer(&mut scenario, 1000, nonce(1));
    scenario.next_tx(PAYER);
    let config = scenario.take_shared<PayConfig>();
    assert!(config.nonce_used(nonce(1)));
    assert!(!config.nonce_used(nonce(2)));
    ts::return_shared(config);
    scenario.end();
}

#[test, expected_failure(abort_code = pay::ENonceUsed)]
fun a_replayed_nonce_aborts() {
    let mut scenario = start();
    pay_as_payer(&mut scenario, 1000, nonce(1));
    scenario.next_tx(PAYER);
    pay_as_payer(&mut scenario, 1000, nonce(1));
    scenario.end();
}

#[test, expected_failure(abort_code = pay::EZeroAmount)]
fun a_zero_amount_aborts() {
    let mut scenario = start();
    pay_as_payer(&mut scenario, 0, nonce(1));
    scenario.end();
}

#[test, expected_failure(abort_code = pay::EAboveMaxPrice)]
fun above_the_maximum_price_aborts() {
    let mut scenario = start();
    pay_as_payer(&mut scenario, 500_000_001, nonce(1));
    scenario.end();
}

#[test, expected_failure(abort_code = pay::EBadNonce)]
fun a_short_nonce_aborts() {
    let mut scenario = start();
    pay_as_payer(&mut scenario, 1000, vector[1, 2, 3]);
    scenario.end();
}

#[test, expected_failure(abort_code = pay::EBadNonce)]
fun a_long_nonce_aborts() {
    let mut scenario = start();
    let mut long = nonce(1);
    long.append(nonce(2));
    long.append(vector[1]);
    assert!(long.length() == 33);
    pay_as_payer(&mut scenario, 1000, long);
    scenario.end();
}

#[test]
fun nonces_of_16_and_32_bytes_are_fine() {
    let mut scenario = start();
    pay_as_payer(&mut scenario, 1000, nonce(1));
    scenario.next_tx(PAYER);
    let mut long = nonce(2);
    long.append(nonce(3));
    pay_as_payer(&mut scenario, 1000, long);
    scenario.end();
}

#[test]
fun the_admin_can_update_treasury_fee_and_maximum() {
    let mut scenario = start();
    as_admin!(&mut scenario, |cap, config| {
        pay::set_treasury(cap, config, NEW_TREASURY);
        pay::set_fee_bps(cap, config, 2000);
        pay::set_max_price(cap, config, 1000);
    });
    pay_as_payer(&mut scenario, 1000, nonce(1));
    assert!(received(&mut scenario, NEW_TREASURY) == 200);
    assert!(received(&mut scenario, RECIPIENT) == 800);
    scenario.end();
}

#[test, expected_failure(abort_code = pay::EAboveMaxPrice)]
fun a_lowered_maximum_applies() {
    let mut scenario = start();
    as_admin!(&mut scenario, |cap, config| pay::set_max_price(cap, config, 999));
    pay_as_payer(&mut scenario, 1000, nonce(1));
    scenario.end();
}

#[test, expected_failure(abort_code = pay::EFeeTooHigh)]
fun the_fee_cannot_pass_twenty_percent() {
    let mut scenario = start();
    as_admin!(&mut scenario, |cap, config| pay::set_fee_bps(cap, config, 2001));
    scenario.end();
}

#[test, expected_failure(abort_code = pay::EBadMaxPrice)]
fun the_maximum_cannot_be_zero() {
    let mut scenario = start();
    as_admin!(&mut scenario, |cap, config| pay::set_max_price(cap, config, 0));
    scenario.end();
}
