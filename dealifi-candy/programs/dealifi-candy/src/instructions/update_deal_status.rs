use anchor_lang::prelude::*;
use crate::state::{Deal, Merchant};

pub fn update_deal_status(ctx: Context<UpdateDealStatus>, status: u8) -> Result<()> {
    let deal = &mut ctx.accounts.deal;
    require_keys_eq!(ctx.accounts.authority.key(), ctx.accounts.merchant.authority);
    deal.status = status;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateDealStatus<'info> {
    pub authority: Signer<'info>,
    #[account(has_one = authority)]
    pub merchant: Account<'info, Merchant>,
    #[account(mut)]
    pub deal: Account<'info, Deal>,
}


