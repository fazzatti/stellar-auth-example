use soroban_sdk::{contracttype, Address, Env};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    AssetA, //Address
    AssetB, //Address
}

pub fn write_asset_a(env: &Env, asset_a: Address) {
    env.storage().instance().set(&DataKey::AssetA, &asset_a);
}
pub fn read_asset_a(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::AssetA)
        .unwrap_or_else(|| panic!("Asset A not set"))
}

pub fn write_asset_b(env: &Env, asset_b: Address) {
    env.storage().instance().set(&DataKey::AssetB, &asset_b);
}
pub fn read_asset_b(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::AssetB)
        .unwrap_or_else(|| panic!("Asset B not set"))
}
