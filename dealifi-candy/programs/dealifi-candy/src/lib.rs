use anchor_lang::prelude::*;

// Module declarations
pub mod state;
pub mod errors;
pub mod instructions;

// Re-exports for easier access
pub use state::*;
pub use errors::*;
use instructions::*;

declare_id!("3HjM15FLHaRkPmTGhovcdNKu4mv9q6vpvDBeHM4SpvZA");

#[program]
pub mod dealifi_candy {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    // Create merchant
    pub fn create_merchant(ctx: Context<CreateMerchant>, treasury: Pubkey, name: String) -> Result<()> {
        instructions::create_merchant(ctx, treasury, name)
    }

    // Create deal tied to a Candy Machine
    pub fn create_deal(ctx: Context<CreateDeal>, params: CreateDealParams) -> Result<()> {
        instructions::create_deal(ctx, params)
    }

    // Update deal status (Draft/Active/Paused/Ended)
    pub fn update_deal_status(ctx: Context<UpdateDealStatus>, status: u8) -> Result<()> {
        instructions::update_deal_status(ctx, status)
    }

    // Record a sale after a successful CM mint (optional analytics)
    pub fn record_sale(ctx: Context<RecordSale>, price_lamports: u64) -> Result<()> {
        instructions::record_sale(ctx, price_lamports)
    }

    // Stake NFT
    pub fn stake_nft(ctx: Context<StakeNft>) -> Result<()> {
        instructions::stake_nft(ctx)
    }

    // Unstake NFT
    pub fn unstake_nft(ctx: Context<UnstakeNft>) -> Result<()> {
        instructions::unstake_nft(ctx)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
