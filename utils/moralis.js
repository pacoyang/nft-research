const Moralis = require('moralis').default

// @see: https://docs.moralis.io/web3-data-api/evm/reference/get-nft-trades
const get_nft_trades = async ({ chain, address }) => {
  await Moralis.start({
    apiKey: process.env.MORALIS_KEY
  })
  const response = await Moralis.EvmApi.nft.getNFTTrades({
    chain,
    address,
    marketplace: 'opensea',
  })
  return response
}

module.exports = {
  get_nft_trades,
}
