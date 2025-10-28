import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';

describe('dealifi-candy - happy path', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DealifiCandy as Program<DealifiCandy>;

  it('creates merchant, deal, updates status, records sale', async () => {
    const authority = provider.wallet.publicKey;

    const [merchantPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('merchant'), authority.toBuffer()],
      program.programId
    );

    const treasury = Keypair.generate().publicKey;
    const name = 'Test Merchant';

    await program.methods
      .createMerchant(treasury, name)
      .accountsStrict({ authority, payer: authority, merchant: merchantPda, systemProgram: SystemProgram.programId })
      .rpc();

    const merchant = await program.account.merchant.fetch(merchantPda);
    expect(merchant.authority.toBase58()).equal(authority.toBase58());
    expect(merchant.treasury.toBase58()).equal(treasury.toBase58());
    expect(merchant.name).equal(name);

    const candyMachine = Keypair.generate().publicKey; // placeholder
    const collectionMint = Keypair.generate().publicKey; // placeholder

    const [dealPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('deal'), merchantPda.toBuffer(), candyMachine.toBuffer()],
      program.programId
    );

    const createDealParams = {
      candyMachine,
      collectionMint,
      namePrefix: 'My NFT #',
      uriPrefix: 'https://example.com/nft',
      itemsAvailable: new anchor.BN(100),
      goLiveDate: null,
      endDate: null,
      priceLamports: new anchor.BN(1_000_000_000),
      payoutWallet: treasury,
      allowlistMerkleRoot: null,
    };

    await program.methods
      .createDeal(createDealParams)
      .accountsStrict({ authority, merchant: merchantPda, deal: dealPda, systemProgram: SystemProgram.programId })
      .rpc();

    const deal = await program.account.deal.fetch(dealPda);
    expect(deal.merchant.toBase58()).equal(merchantPda.toBase58());
    expect(deal.candyMachine.toBase58()).equal(candyMachine.toBase58());
    expect(deal.collectionMint.toBase58()).equal(collectionMint.toBase58());
    expect(deal.namePrefix).equal('My NFT #');
    expect(deal.uriPrefix).equal('https://example.com/nft');
    expect(deal.itemsAvailable.toNumber()).equal(100);
    expect(deal.priceLamports.toNumber()).equal(1_000_000_000);
    expect(deal.payoutWallet.toBase58()).equal(treasury.toBase58());

    await program.methods
      .updateDealStatus(2) // Paused
      .accountsStrict({ authority, merchant: merchantPda, deal: dealPda })
      .rpc();

    const dealAfterStatus = await program.account.deal.fetch(dealPda);
    expect(dealAfterStatus.status).equal(2);

    const buyer = authority;
    const mint = Keypair.generate().publicKey;
    const [salePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('sale'), dealPda.toBuffer(), mint.toBuffer()],
      program.programId
    );

    await program.methods
      .recordSale(new anchor.BN(1_000_000_000))
      .accountsStrict({ buyer, mint, deal: dealPda, sale: salePda, systemProgram: SystemProgram.programId })
      .rpc();

    const sale = await program.account.sale.fetch(salePda);
    expect(sale.deal.toBase58()).equal(dealPda.toBase58());
    expect(sale.mint.toBase58()).equal(mint.toBase58());
    expect(sale.buyer.toBase58()).equal(buyer.toBase58());
    expect(sale.priceLamports.toNumber()).equal(1_000_000_000);
  });
});

import { DealifiCandy } from "../target/types/dealifi_candy";
import { expect } from "chai";

describe("dealifi-candy", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.DealifiCandy as Program<DealifiCandy>;
  const provider = anchor.getProvider();

  // Test accounts
  let merchant: Keypair;
  let user: Keypair;
  let candyMachinePda: PublicKey;
  let merchantPda: PublicKey;

  beforeEach(async () => {
    merchant = Keypair.generate();
    user = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(merchant.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);

    // Wait for airdrop confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Derive PDAs
    [candyMachinePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("candy_machine"), merchant.publicKey.toBuffer()],
      program.programId
    );

    [merchantPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant"), merchant.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("Create merchant", async () => {
    const treasury = Keypair.generate().publicKey;
    const name = 'Test Merchant';

    const tx = await program.methods
      .createMerchant(treasury, name)
      .accountsStrict({
        authority: merchant.publicKey,
        payer: merchant.publicKey,
        merchant: merchantPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchant])
      .rpc();

    console.log("Merchant creation tx:", tx);

    // Verify merchant account was created correctly
    const merchantAccount = await program.account.merchant.fetch(merchantPda);
    expect(merchantAccount.authority.toString()).to.equal(merchant.publicKey.toString());
    expect(merchantAccount.treasury.toString()).to.equal(treasury.toString());
    expect(merchantAccount.name).to.equal(name);
  });

  it("Stake NFT", async () => {
    // Create a mock candy machine public key (this would come from Metaplex)
    const mockCandyMachine = Keypair.generate().publicKey;
    const mockMint = Keypair.generate().publicKey;

    // Derive user claim PDA
    const [userClaimPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_claim"), user.publicKey.toBuffer(), mockCandyMachine.toBuffer()],
      program.programId
    );

    // Stake NFT
    const tx = await program.methods
      .stakeNft()
      .accountsStrict({
        user: user.publicKey,
        userClaim: userClaimPda,
        candyMachine: mockCandyMachine,
        mint: mockMint,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Stake NFT tx:", tx);

    // Verify user claim account was created
    const userClaimAccount = await program.account.userClaim.fetch(userClaimPda);
    expect(userClaimAccount.user.toString()).to.equal(user.publicKey.toString());
    expect(userClaimAccount.candyMachine.toString()).to.equal(mockCandyMachine.toString());
    expect(userClaimAccount.mint.toString()).to.equal(mockMint.toString());
    expect(userClaimAccount.isStaked).to.be.true;
    expect(userClaimAccount.stakedAt).to.not.be.null;
  });

  it("Unstake NFT", async () => {
    // Create a mock candy machine public key and mint
    const mockCandyMachine = Keypair.generate().publicKey;
    const mockMint = Keypair.generate().publicKey;

    // Derive user claim PDA
    const [userClaimPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_claim"), user.publicKey.toBuffer(), mockCandyMachine.toBuffer()],
      program.programId
    );

    // First stake the NFT
    await program.methods
      .stakeNft()
      .accountsStrict({
        user: user.publicKey,
        userClaim: userClaimPda,
        candyMachine: mockCandyMachine,
        mint: mockMint,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Now unstake the NFT
    const tx = await program.methods
      .unstakeNft()
      .accountsStrict({
        user: user.publicKey,
        userClaim: userClaimPda,
        candyMachine: mockCandyMachine,
      })
      .signers([user])
      .rpc();

    console.log("Unstake NFT tx:", tx);

    // Verify NFT is unstaked
    const userClaimAccount = await program.account.userClaim.fetch(userClaimPda);
    expect(userClaimAccount.isStaked).to.be.false;
    expect(userClaimAccount.unstakedAt).to.not.be.null;
  });

  it("Should fail to stake already staked NFT", async () => {
    // Create a mock candy machine public key and mint
    const mockCandyMachine = Keypair.generate().publicKey;
    const mockMint = Keypair.generate().publicKey;

    // Derive user claim PDA
    const [userClaimPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_claim"), user.publicKey.toBuffer(), mockCandyMachine.toBuffer()],
      program.programId
    );

    // First stake
    await program.methods
      .stakeNft()
      .accountsStrict({
        user: user.publicKey,
        userClaim: userClaimPda,
        candyMachine: mockCandyMachine,
        mint: mockMint,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Try to stake again with the same user/candy machine combination - should fail
    // because the account already exists (this is the expected behavior)
    try {
      await program.methods
        .stakeNft()
        .accountsStrict({
          user: user.publicKey,
          userClaim: userClaimPda,
          candyMachine: mockCandyMachine,
          mint: mockMint,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      
      expect.fail("Should have failed when trying to stake already staked NFT");
    } catch (error) {
      // The error will be about account already existing, which is the correct behavior
      expect(error.message).to.include("already in use");
    }
  });

  it("Should fail to unstake non-staked NFT", async () => {
    // Create a mock candy machine public key and mint
    const mockCandyMachine = Keypair.generate().publicKey;
    const mockMint = Keypair.generate().publicKey;

    // Derive user claim PDA
    const [userClaimPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_claim"), user.publicKey.toBuffer(), mockCandyMachine.toBuffer()],
      program.programId
    );

    // First stake the NFT
    await program.methods
      .stakeNft()
      .accountsStrict({
        user: user.publicKey,
        userClaim: userClaimPda,
        candyMachine: mockCandyMachine,
        mint: mockMint,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Unstake it
    await program.methods
      .unstakeNft()
      .accountsStrict({
        user: user.publicKey,
        userClaim: userClaimPda,
        candyMachine: mockCandyMachine,
      })
      .signers([user])
      .rpc();

    // Try to unstake again - should fail
    try {
      await program.methods
        .unstakeNft()
        .accountsStrict({
          user: user.publicKey,
          userClaim: userClaimPda,
          candyMachine: mockCandyMachine,
        })
        .signers([user])
        .rpc();
      
      expect.fail("Should have failed when trying to unstake non-staked NFT");
    } catch (error) {
      expect(error.message).to.include("NotStaked");
    }
  });
});
