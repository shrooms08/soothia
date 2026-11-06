/// Soothia Total Recall: proof that a call was made before the event.
///
/// The Soothia Worker hashes each pick (see worker/src/recall/records.ts,
/// canonicalPick) and calls `commit` before kickoff. The event lands in a Sui
/// checkpoint with a timestamp, so anyone can check, with any Sui RPC, that
/// the pick existed at that time and has not changed since. Nothing is stored
/// in objects: the event is the record, and the full pick lives in Walrus Memory.
module soothia_recall::recall;

use sui::event;

/// Emitted once per pick. `hash` is the SHA-256 of the canonical pick JSON.
public struct PickCommitted has copy, drop {
    hash: vector<u8>,
    pick_id: vector<u8>,
    committer: address,
}

/// A hash is SHA-256: exactly 32 bytes.
const EBadHash: u64 = 0;
/// Pick ids are short ("p_" + 16 hex).
const EBadPickId: u64 = 1;

public fun commit(hash: vector<u8>, pick_id: vector<u8>, ctx: &TxContext) {
    assert!(hash.length() == 32, EBadHash);
    assert!(pick_id.length() > 0 && pick_id.length() <= 64, EBadPickId);
    event::emit(PickCommitted { hash, pick_id, committer: ctx.sender() });
}

#[test_only]
use sui::test_scenario;

#[test]
fun commit_accepts_a_sha256() {
    let mut scenario = test_scenario::begin(@0xA);
    let mut hash = vector[];
    let mut i = 0;
    while (i < 32) {
        hash.push_back(i as u8);
        i = i + 1;
    };
    commit(hash, b"p_0123456789abcdef", scenario.ctx());
    scenario.end();
}

#[test, expected_failure(abort_code = EBadHash)]
fun commit_rejects_a_short_hash() {
    let mut scenario = test_scenario::begin(@0xA);
    commit(b"short", b"p_1", scenario.ctx());
    scenario.end();
}
