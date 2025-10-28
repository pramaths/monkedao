use anchor_lang::prelude::*;

pub const NAME_PREFIX_MAX: usize = 64;
pub const URI_PREFIX_MAX: usize = 128;
pub const MERCHANT_NAME_MAX: usize = 64;

#[account]
pub struct Merchant {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub name: String,
    pub bump: u8,
}

impl Merchant {
    pub const LEN: usize = 8 + 32 + 32 + (4 + MERCHANT_NAME_MAX) + 1;
}

#[account]
pub struct Deal {
    pub merchant: Pubkey,
    pub candy_machine: Pubkey,
    pub collection_mint: Pubkey,
    pub name_prefix: String,
    pub uri_prefix: String,
    pub items_available: u64,
    pub go_live_date: Option<i64>,
    pub end_date: Option<i64>,
    pub price_lamports: u64,
    pub payout_wallet: Pubkey,
    pub allowlist_merkle_root: Option<[u8; 32]>,
    pub status: u8,
    pub bump: u8,
}

impl Deal {
    pub const LEN: usize = 8 + 32 + 32 + 32 + (4 + NAME_PREFIX_MAX) + (4 + URI_PREFIX_MAX)
        + 8 + (1 + 8) + (1 + 8) + 8 + 32 + (1 + 32) + 1 + 1;
}

#[account]
pub struct Sale {
    pub deal: Pubkey,
    pub mint: Pubkey,
    pub buyer: Pubkey,
    pub price_lamports: u64,
    pub ts: i64,
    pub bump: u8,
}

impl Sale {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct UserClaim {
    pub user: Pubkey,
    pub candy_machine: Pubkey,
    pub mint: Pubkey,
    pub is_staked: bool,
    pub staked_at: Option<i64>,
    pub unstaked_at: Option<i64>,
    pub bump: u8,
}

impl UserClaim {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + (1 + 8) + (1 + 8) + 1;
}
