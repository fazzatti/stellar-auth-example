use soroban_sdk::{
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
    contract, contractimpl, vec, Address, Env, IntoVal, Symbol,
};

use crate::{
    core::{is_enough_balance, swap_in, swap_out},
    storage::{read_asset_a, read_asset_b, write_asset_a, write_asset_b},
};

pub trait SimpleSwapTrait {
    fn __constructor(env: Env, asset_a: Address, asset_b: Address);
    fn swap(env: Env, is_sell_asset_a: bool, account: Address, amount: i128);
}

#[contract]
pub struct SimpleSwap;

#[contractimpl]
impl SimpleSwapTrait for SimpleSwap {
    fn __constructor(env: Env, asset_a: Address, asset_b: Address) {
        write_asset_a(&env, asset_a);
        write_asset_b(&env, asset_b);
    }

    fn swap(env: Env, is_sell_asset_a: bool, account: Address, amount: i128) {
        let (asset_in, asset_out): (Address, Address) = if is_sell_asset_a {
            (read_asset_a(&env), read_asset_b(&env))
        } else {
            (read_asset_b(&env), read_asset_a(&env))
        };

        // Require the account to authorize this invocation.
        account.require_auth();

        // Authorize the next contract call to transfer the asset.
        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: asset_in.clone(),
                    fn_name: Symbol::new(&env, "transfer"),
                    args: (
                        account.clone(),
                        env.current_contract_address(),
                        amount.clone(),
                    )
                        .into_val(&env),
                },
                // `sub_invocations` can be used to authorize even deeper calls
                sub_invocations: vec![&env],
            }),
        ]);

        assert!(
            is_enough_balance(&env, is_sell_asset_a, amount),
            "Not enough balance to swap"
        );

        swap_in(&env, asset_in, account.clone(), amount);
        swap_out(&env, asset_out, account, amount);
    }
}
