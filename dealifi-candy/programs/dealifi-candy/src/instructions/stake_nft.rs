use anchor_lang::prelude::*;
use crate::state::UserClaim;

#[derive(Accounts)]
pub struct StakeNft<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        space = UserClaim::LEN,
        seeds = [b"user_claim", user.key().as_ref(), candy_machine.key().as_ref()],
        bump
    )]
    pub user_claim: Account<'info, UserClaim>,
    
    /// CHECK: This is the candy machine public key from Metaplex
    pub candy_machine: UncheckedAccount<'info>,
    
    /// CHECK: This is the mint public key of the NFT
    pub mint: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn stake_nft(ctx: Context<StakeNft>) -> Result<()> {
    let user_claim = &mut ctx.accounts.user_claim;
    
    // Initialize user claim with staked status
    user_claim.user = ctx.accounts.user.key();
    user_claim.candy_machine = ctx.accounts.candy_machine.key();
    user_claim.mint = ctx.accounts.mint.key();
    user_claim.is_staked = true;
    user_claim.staked_at = Some(Clock::get()?.unix_timestamp);
    user_claim.unstaked_at = None;
    user_claim.bump = ctx.bumps.user_claim;
    
    Ok(())
}
