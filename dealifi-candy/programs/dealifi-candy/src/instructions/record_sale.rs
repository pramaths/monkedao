use anchor_lang::prelude::*;
use crate::state::{Sale, Deal};

pub fn record_sale(ctx: Context<RecordSale>, price_lamports: u64) -> Result<()> {
    let sale = &mut ctx.accounts.sale;
    sale.deal = ctx.accounts.deal.key();
    sale.mint = ctx.accounts.mint.key();
    sale.buyer = ctx.accounts.buyer.key();
    sale.price_lamports = price_lamports;
    sale.ts = Clock::get()?.unix_timestamp;
    sale.bump = ctx.bumps.sale;
    Ok(())
}

#[derive(Accounts)]
pub struct RecordSale<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: mint address only
    pub mint: AccountInfo<'info>,
    pub deal: Account<'info, Deal>,
    #[account(
        init,
        payer = buyer,
        space = Sale::LEN,
        seeds = [b"sale", deal.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub sale: Account<'info, Sale>,
    pub system_program: Program<'info, System>,
}


