const { publicKey } = require('@metaplex-foundation/umi');
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { dasApi } = require('@metaplex-foundation/digital-asset-standard-api');
const { fetchCandyMachine, safeFetchCandyGuard } = require('@metaplex-foundation/mpl-candy-machine');

async function testDasApi() {
  try {
    console.log('🚀 Starting DAS API test...');
    
    const umi = createUmi('https://api.devnet.solana.com').use(dasApi());
    const candyMachineAddress = '2CfLcLSmR9A4evCYndkeE59CD5dTDpPM8ippbpwUVGdZ';
    
    const authorityAddress = 'G3HMYG3hTpL4Pf7eFoAEiancqf21P1D9sTP2UJS12ZS8';
    
    console.log('🔍 Fetching assets for authority:', authorityAddress);
    
    const result = await umi.rpc.getAssetsByOwner({
      owner: publicKey(authorityAddress),
      limit: 20
    });
    
    console.log('✅ DAS API Result:');
    console.log(JSON.stringify(result, null, 2));
    // const creatorResult = await umi.rpc.getAssetsByCreator({
    //   creator: publicKey(authorityAddress),
    //   limit: 10, // Limit to 10 results for testing
    // })
    
    // console.log('🔍 Creator Result:');
    // console.log(creatorResult.length)

    // console.log(JSON.stringify(creatorResult, null, 2));
    console.log('\n📊 Summary:');
    console.log(`Total assets found: ${result.items?.length || 0}`);
    
    if (result.items && result.items.length > 0) {
      console.log('\n🎯 All assets owned by this address:');
      result.items.forEach((asset, index) => {
        console.log(`\n${index + 1}. Asset ID: ${asset.id}`);
        console.log(`   Name: ${asset.content?.metadata?.name || 'No name'}`);
        console.log(`   Symbol: ${asset.content?.metadata?.symbol || 'No symbol'}`);
        console.log(`   Interface: ${asset.interface}`);
        console.log(`   Owner: ${asset.ownership?.owner}`);
        console.log(`   Verified: ${asset.ownership?.verified}`);
        console.log(`   Collection: ${asset.grouping?.group_value || 'No collection'}`);
        console.log(`   Created: ${asset.created_at}`);
      });
      
      // Check for NFTs from the candy machine
      const candyMachineNfts = result.items.filter(asset => 
        asset.content?.metadata?.name?.includes('#') || 
        asset.grouping?.group_value
      );
      
      console.log(`\n🍭 NFTs found: ${candyMachineNfts.length}`);
      if (candyMachineNfts.length > 0) {
        console.log('These appear to be minted NFTs!');
      }
    } else {
      console.log('\n❌ No assets found for this address');
      console.log('This means either:');
      console.log('1. The address has not minted any NFTs yet');
      console.log('2. The NFTs are not indexed yet (try again in a few minutes)');
      console.log('3. The address is incorrect');
    }

    console.log('\n🔎 Fetching Candy Machine on-chain state...');
    try {
      const cmPk = publicKey(candyMachineAddress);
      const cm = await fetchCandyMachine(umi, cmPk);
      console.log('✅ Candy Machine fetched', cm);
      console.log({
        address: candyMachineAddress,
        authority: cm.authority,
        collectionMint: cm.collectionMint,
        mintAuthority: cm.mintAuthority,
        itemsAvailable: Number(cm.data.itemsAvailable),
        itemsRedeemed: Number(cm.itemsRedeemed),
        itemsLoaded: cm.itemsLoaded,
        tokenStandard: cm.tokenStandard,
      });

      console.log('\n🛡️ Fetching Candy Guard...');
      const guard = await safeFetchCandyGuard(umi, "E2UkLCZWLNANzZvsLLVo6GYmwALYeG1byva3oEv2GqCP");
      if (guard) {
        console.log('✅ Candy Guard fetched');
        console.log(JSON.stringify(guard.guards || {}, null, 2));
      } else {
        console.log('ℹ️ No Candy Guard found');
      }

      console.log('\n🗂️ Fetching assets in Candy Machine collection via DAS...');
      const collectionMint = cm.collectionMint;
      const byCollection = await umi.rpc.getAssetsByGroup({
        groupKey: 'collection',
        groupValue: collectionMint,
        limit: 100,
      });
      console.log('✅ DAS assets by collection:');
      console.log(JSON.stringify(byCollection, null, 2));
      console.log(`\n📊 Collection assets count: ${byCollection.items?.length || 0}`);
    } catch (e) {
      console.error('❌ Error fetching Candy Machine details:', e?.message || e);
    }
    
  } catch (error) {
    console.error('❌ Error testing DAS API:', error);
    console.error('Error details:', error.message);
  }
}

// Run the test
testDasApi();
