#[test_only]
/// Audit test. `finding_*` PASSES while the finding still exists.
module soothia_recall::security_tests;

use soothia_recall::recall;
use sui::test_scenario;

#[test]
/// commit is permissionless: any address can emit a genuine
/// soothia_recall::recall::PickCommitted for any 32-byte hash and any pick id,
/// including a pick id that belongs to someone else. Only `committer` (the tx
/// sender) and the digest the Worker stored tell a real commit from a planted one.
fun finding_anyone_can_commit_any_hash_under_any_pick_id() {
    let mut scenario = test_scenario::begin(@0xBAD);
    recall::commit(vector::tabulate!(32, |_| 0xAAu8), b"p_0123456789abcdef", scenario.ctx());
    recall::commit(vector::tabulate!(32, |_| 0xBBu8), b"p_0123456789abcdef", scenario.ctx());
    let effects = scenario.next_tx(@0xBAD);
    assert!(effects.num_user_events() == 2);
    scenario.end();
}
