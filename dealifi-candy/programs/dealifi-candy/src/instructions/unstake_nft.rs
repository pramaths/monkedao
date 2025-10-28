use anchor_lang::prelude::*;
use crate::state::UserClaim;
use crate::errors::DealifiError;

#[derive(Accounts)]
pub struct UnstakeNft<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user_claim", user.key().as_ref(), candy_machine.key().as_ref()],
        bump = user_claim.bump,
        constraint = user_claim.user == user.key()
    )]
    pub user_claim: Account<'info, UserClaim>,
    
    /// CHECK: This is the candy machine public key from Metaplex
    pub candy_machine: UncheckedAccount<'info>,
}

pub fn unstake_nft(ctx: Context<UnstakeNft>) -> Result<()> {
    let user_claim = &mut ctx.accounts.user_claim;
    
    // Check if NFT is staked
    require!(
        user_claim.is_staked,
        DealifiError::NotStaked
    );
    
    // Unstake the NFT
    user_claim.is_staked = false;
    user_claim.unstaked_at = Some(Clock::get()?.unix_timestamp);
    
    Ok(())
}
