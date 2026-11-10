#[test_only]
/// Audit tests. `finding_*` PASSES while the finding still exists.
module soothia_pay::security_tests;

use soothia_pay::pay::{Self, PayConfig};
use sui::coin;
use sui::sui::SUI;
use sui::test_scenario::{Self as ts, Scenario};

const ADMIN: address = @0xA;
const PAYER: address = @0xB;
const CREATOR: address = @0xC;
const STRANGER: address = @0xE;

fun nonce(byte: u8): vector<u8> {
    vector::tabulate!(16, |_| byte)
}

fun start(): Scenario {
    let mut scenario = ts::begin(ADMIN);
    pay::init_for_testing(scenario.ctx());
    scenario
}

fun pay_as(scenario: &mut Scenario, who: address, amount: u64, n: vector<u8>, recipient: address) {
    scenario.next_tx(who);
    let mut config = scenario.take_shared<PayConfig>();
    let payment = coin::mint_for_testing<SUI>(amount, scenario.ctx());
    pay::pay(&mut config, n, recipient, payment, scenario.ctx());
    ts::return_shared(config);
}

#[test, expected_failure(abort_code = pay::ENonceUsed)]
/// The nonce is global and is not bound to the payer, recipient or price. Anyone who
/// learns a pending nonce can spend it first with 1 mist to themselves; the real
/// payment for that nonce then aborts.
fun finding_anyone_can_burn_a_nonce_with_one_mist() {
    let mut scenario = start();
    pay_as(&mut scenario, STRANGER, 1, nonce(7), STRANGER);
    pay_as(&mut scenario, PAYER, 100_000_000, nonce(7), CREATOR);
    scenario.end();
}

#[test]
/// pay never checks a minimum price; with amounts under 10 mist the fee is zero.
/// (Harmless only because the Worker requires the exact price in the Paid event.)
fun finding_no_minimum_price_on_chain() {
    let mut scenario = start();
    pay_as(&mut scenario, PAYER, 9, nonce(1), CREATOR);
    scenario.next_tx(PAYER);
    let config = scenario.take_shared<PayConfig>();
    assert!(config.nonce_used(nonce(1)));
    ts::return_shared(config);
    scenario.end();
}
