#!/bin/bash
export RUST_BACKTRACE=1
cargo test --package spelling-launcher --lib db::tests::test_live_db_migration -- --exact --nocapture
