use anchor_lang::prelude::*;
use crate::state::{Merchant, MERCHANT_NAME_MAX};
use crate::errors::ErrorCode;

pub fn create_merchant(ctx: Context<CreateMerchant>, treasury: Pubkey, name: String) -> Result<()> {
    require!(name.as_bytes().len() <= MERCHANT_NAME_MAX, ErrorCode::NameTooLong);
    let merchant = &mut ctx.accounts.merchant;
    merchant.authority = ctx.accounts.authority.key();
    merchant.treasury = treasury;
    merchant.name = name;
    merchant.bump = ctx.bumps.merchant;
    Ok(())
}

#[derive(Accounts)]
pub struct CreateMerchant<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = Merchant::LEN,
        seeds = [b"merchant", authority.key().as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    pub system_program: Program<'info, System>,
}


