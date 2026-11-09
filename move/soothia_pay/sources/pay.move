/// Soothia premium calls: one payment in SUI, split between the caller and the
/// treasury, with a nonce that can be used only once.
module soothia_pay::pay;

use sui::coin::Coin;
use sui::event;
use sui::sui::SUI;
use sui::table::{Self, Table};

const INITIAL_TREASURY: address = @0x8e0e9fecb8141cc2635effcb1a0d25c96331eecae8eb998329c47241259abb6a;
const INITIAL_FEE_BPS: u64 = 1000;
const INITIAL_MAX_PRICE_MIST: u64 = 500_000_000;

const MAX_FEE_BPS: u64 = 2000;
const BPS_DENOMINATOR: u128 = 10_000;
const MIN_NONCE_LENGTH: u64 = 16;
const MAX_NONCE_LENGTH: u64 = 32;

const ENonceUsed: u64 = 0;
const EZeroAmount: u64 = 1;
const EAboveMaxPrice: u64 = 2;
const EBadNonce: u64 = 3;
const EFeeTooHigh: u64 = 4;
const EBadMaxPrice: u64 = 5;

/// May change the treasury, the fee and the maximum price.
public struct AdminCap has key, store { id: UID }

public struct PayConfig has key {
    id: UID,
    treasury: address,
    fee_bps: u64,
    max_price_mist: u64,
    used: Table<vector<u8>, bool>,
}

public struct Paid has copy, drop {
    nonce: vector<u8>,
    payer: address,
    recipient: address,
    amount: u64,
    fee: u64,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(PayConfig {
        id: object::new(ctx),
        treasury: INITIAL_TREASURY,
        fee_bps: INITIAL_FEE_BPS,
        max_price_mist: INITIAL_MAX_PRICE_MIST,
        used: table::new(ctx),
    });
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
}

public fun set_treasury(_: &AdminCap, config: &mut PayConfig, treasury: address) {
    config.treasury = treasury;
}

public fun set_fee_bps(_: &AdminCap, config: &mut PayConfig, fee_bps: u64) {
    assert!(fee_bps <= MAX_FEE_BPS, EFeeTooHigh);
    config.fee_bps = fee_bps;
}

public fun set_max_price(_: &AdminCap, config: &mut PayConfig, max_price_mist: u64) {
    assert!(max_price_mist > 0, EBadMaxPrice);
    config.max_price_mist = max_price_mist;
}

/// Pays `recipient` from `coin`, less the fee, once per nonce.
public fun pay(config: &mut PayConfig, nonce: vector<u8>, recipient: address, mut coin: Coin<SUI>, ctx: &mut TxContext) {
    let length = nonce.length();
    assert!(length >= MIN_NONCE_LENGTH && length <= MAX_NONCE_LENGTH, EBadNonce);
    assert!(!config.used.contains(nonce), ENonceUsed);
    let amount = coin.value();
    assert!(amount > 0, EZeroAmount);
    assert!(amount <= config.max_price_mist, EAboveMaxPrice);

    config.used.add(nonce, true);
    let fee = fee_on(amount, config.fee_bps);
    if (fee > 0) {
        transfer::public_transfer(coin.split(fee, ctx), config.treasury);
    };
    transfer::public_transfer(coin, recipient);
    event::emit(Paid { nonce, payer: ctx.sender(), recipient, amount, fee });
}

fun fee_on(amount: u64, fee_bps: u64): u64 {
    (((amount as u128) * (fee_bps as u128) / BPS_DENOMINATOR) as u64)
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

#[test_only]
public fun fee_bps(config: &PayConfig): u64 { config.fee_bps }

#[test_only]
public fun max_price_mist(config: &PayConfig): u64 { config.max_price_mist }

#[test_only]
public fun treasury(config: &PayConfig): address { config.treasury }

#[test_only]
public fun nonce_used(config: &PayConfig, nonce: vector<u8>): bool { config.used.contains(nonce) }
