use anchor_lang::prelude::*;

#[error_code]
pub enum DealifiError {
    #[msg("NFT is already staked")]
    AlreadyStaked,
    #[msg("NFT is not staked")]
    NotStaked,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Name prefix too long")]
    NameTooLong,
    #[msg("URI prefix too long")]
    UriTooLong,
}
