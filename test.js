require('dotenv').config()
const chai = require('chai')

const alchemy = require('./utils/alchemy')
const airstack = require('./utils/airstack')
const moralis = require('./utils/moralis')

const expect = chai.expect

describe('API requests', () => {
  it('get_owners_for_collection', async () => {
    const result = await alchemy.get_owners_for_collection({
      chain: 'eth',
      address: '0xed5af388653567af2f388e6224dc7c4b3241c544',
    })
    expect(result).to.have.nested.property('data.ownerAddresses')
  })
  it('query_token_nfts', async () => {
    const result = await airstack.query_token_nfts({
      chain: 'ethereum',
      address: '0xed5af388653567af2f388e6224dc7c4b3241c544',
    })
    expect(result).to.have.property('data')
  })
  it('get_nft_trades', async () => {
    const res = await moralis.get_nft_trades({
      chain: '0x1',
      address: '0xed5af388653567af2f388e6224dc7c4b3241c544',
    })
    expect(res).to.have.nested.property('result')
  })
})
