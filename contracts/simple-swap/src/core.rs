use soroban_sdk::{token, Address, Env};

use crate::storage::{read_asset_a, read_asset_b};

pub fn is_enough_balance(env: &Env, is_sell_asset_a: bool, amount: i128) -> bool {
    let asset_address: Address = if is_sell_asset_a {
        read_asset_b(env)
    } else {
        read_asset_a(env)
    };

    let contract_balance = load_contract_balance(env, asset_address);

    contract_balance >= amount
}

pub fn load_contract_balance(env: &Env, asset: Address) -> i128 {
    let asset_admin_client = token::TokenClient::new(&env, &asset);

    asset_admin_client.balance(&env.current_contract_address())
}

pub fn swap_in(env: &Env, asset: Address, from: Address, amount: i128) {
    transfer(env, asset, from, env.current_contract_address(), amount);
}

pub fn swap_out(env: &Env, asset: Address, to: Address, amount: i128) {
    transfer(env, asset, env.current_contract_address(), to, amount);
}

fn transfer(env: &Env, asset: Address, from: Address, to: Address, amount: i128) {
    let asset_admin_client = token::TokenClient::new(env, &asset);
    asset_admin_client.transfer(&from, &to, &amount);
}
