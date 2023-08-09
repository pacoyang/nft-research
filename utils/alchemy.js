const axios = require('axios')

const get_owners_for_collection = async ({ chain, address, pageKey = '' }) => {
  const res = await axios.get(`https://${chain}-mainnet.g.alchemy.com/nft/v2/${process.env.ALCHEMY_API_KEY}/getOwnersForCollection`, {
    params: {
      contractAddress: address,
      withTokenBalances: true,
      pageKey,
    }
  })
  return res
}

module.exports = {
  get_owners_for_collection,
}
