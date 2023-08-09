const { fetchQuery, fetchQueryWithPagination, init } = require('@airstack/node')

init(process.env.AIRSTACK_API_KEY, 'dev')

const query_token_nfts = async ({ chain, address }) => {
  return fetchQueryWithPagination(`query MyQuery {
  TokenNfts(
    input: {filter: {address: {_eq: "${address}"}}, blockchain: ${chain}, limit: 200}
  ) {
    pageInfo {
      nextCursor
      prevCursor
    }
    TokenNft {
      tokenId
      tokenURI
    }
  }
}`)
}

const query_token = async ({ chain, address }) => {
  return fetchQuery(`query MyQuery {
  Token(
    input: {address: "${address}", blockchain: ${chain}}
  ) {
    baseURI
    name
  }
}`)
}

module.exports = {
  query_token_nfts,
  query_token,
}
