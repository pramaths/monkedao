use anchor_lang::prelude::*;
use crate::state::{Deal, Merchant, NAME_PREFIX_MAX, URI_PREFIX_MAX};
use crate::errors::ErrorCode;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateDealParams {
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
}

pub fn create_deal(ctx: Context<CreateDeal>, params: CreateDealParams) -> Result<()> {
    require!(params.name_prefix.as_bytes().len() <= NAME_PREFIX_MAX, ErrorCode::NameTooLong);
    require!(params.uri_prefix.as_bytes().len() <= URI_PREFIX_MAX, ErrorCode::UriTooLong);

    let deal = &mut ctx.accounts.deal;
    deal.merchant = ctx.accounts.merchant.key();
    deal.candy_machine = params.candy_machine;
    deal.collection_mint = params.collection_mint;
    deal.name_prefix = params.name_prefix;
    deal.uri_prefix = params.uri_prefix;
    deal.items_available = params.items_available;
    deal.go_live_date = params.go_live_date;
    deal.end_date = params.end_date;
    deal.price_lamports = params.price_lamports;
    deal.payout_wallet = params.payout_wallet;
    deal.allowlist_merkle_root = params.allowlist_merkle_root;
    deal.status = 1;
    deal.bump = ctx.bumps.deal;
    Ok(())
}

#[derive(Accounts)]
#[instruction(params: CreateDealParams)]
pub struct CreateDeal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub merchant: Account<'info, Merchant>,
    #[account(
        init,
        payer = authority,
        space = Deal::LEN,
        seeds = [b"deal", merchant.key().as_ref(), params.candy_machine.as_ref()],
        bump
    )]
    pub deal: Account<'info, Deal>,
    pub system_program: Program<'info, System>,
}


