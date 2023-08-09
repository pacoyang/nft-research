require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Command } = require('commander')
const csv = require('csvtojson')
const json2csv = require('json2csv').parse

const alchemy = require('./utils/alchemy')
const airstack = require('./utils/airstack')
const opeansea = require('./utils/opeansea')

const program = new Command()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function merge(list1, list2) {
  const mergedDict = {}
  list1.forEach(item => {
    const tokenId = item.tokenId
    if (!mergedDict[tokenId]) {
      mergedDict[tokenId] = {}
    }
    Object.assign(mergedDict[tokenId], item)
  })
  list2.forEach(item => {
    const tokenId = item.tokenId
    if (!mergedDict[tokenId]) {
      mergedDict[tokenId] = {}
    }
    Object.assign(mergedDict[tokenId], item)
  })
  return Object.values(mergedDict)
}

async function get_nft_owners({ chain, address }) {
  let results = []
  let pageKey = ''
  while (true) {
    try {
      const res = await alchemy.get_owners_for_collection({
        chain: chain === 'ethereum' ? 'eth' : chain,
        address,
      })
      const data = res.data
      for (const item of data.ownerAddresses) {
        const { ownerAddress, tokenBalances } = item
        for (const token of tokenBalances) {
          results.push({
            ownerAddress,
            tokenId: `${parseInt(token.tokenId, 16)}`,
          })
        }
      }
      if (pageKey === data.pageKey) {
        break
      }
      pageKey = data.pageKey
      if (!pageKey) {
        break
      }
      console.info(data.ownerAddresses.length, pageKey)
    } catch(error) {
      console.info('sleeping...')
      console.info(error)
      await sleep(5000)
    }
  }
  return results
}

async function get_nft_metadatas({ chain, address }) {
  let results = []
  let { data, getNextPage } = await airstack.query_token_nfts({
    chain,
    address,
  })
  if (data && data.TokenNfts && data.TokenNfts.TokenNft) {
    results = results.concat(data.TokenNfts.TokenNft)
  }
  while (getNextPage) {
    try {
      const res = await Promise.race([getNextPage(), new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out'))
        }, 60000)
      })])
      if (!res) {
        break
      }
      getNextPage = res.getNextPage
      if (res.data && res.data.TokenNfts && res.data.TokenNfts.TokenNft && res.data.TokenNfts.TokenNft.length > 0) {
        console.info(res.data.TokenNfts.TokenNft[0].tokenId, res.hasNextPage)
        results = results.concat(res.data.TokenNfts.TokenNft)
      }
      break
    } catch(error) {
      console.info('sleeping...')
      console.info(error)
      await sleep(50000)
    }
  }
  return results
}


async function get_nft_baseuri({ chain, address }) {
  while (true) {
    try {
      const res = await airstack.query_token({
        chain,
        address
      })
      if (res && res.data && res.data.Token) {
        return res.data.Token.baseURI
      }
      return ''
    } catch(error) {
      console.info('sleeping...')
      console.info(error)
      await sleep(5000)
    }
  }
}

program.command('metadatas')
  .description('Fetch nft metadatas')
  .argument('<chain>', 'chain')
  .argument('<contract>', 'contract')
  .argument('<slug>', 'slug')
  .argument('<owners_path>', 'nft owners file path')
  .argument('<save_path>', 'save path')
  .action(async (chain, contract, slug, owners_path, save_path) => {
    const results = await csv().fromFile(owners_path)
    let mergedList
    const base_uri = await get_nft_baseuri({
      chain,
      address: contract
    })
    if (!base_uri) {
      console.info(`Fetching ${slug} metadata`)
      const metadatas = await get_nft_metadatas({
        chain,
        address: contract
      })
      console.info(`Total: ${metadatas.length}`)
      mergedList = merge(results, metadatas)
    } else {
      mergedList = results.map(result => ({
        ...result,
        tokenURI: `${base_uri}${result.tokenId}`
      }))
    }
    const full_path = path.join(save_path, `${slug}.csv`)
    fs.writeFileSync(full_path, json2csv(mergedList))
    console.info(`Saved ${full_path}`)
  })

program.command('owners')
  .description('Fetch nft owners data')
  .argument('<chain>', 'chain')
  .argument('<collections_path>', 'nft collections file path')
  .argument('<save_path>', 'save path')
  .action(async (chain, collections_path, save_path) => {
    if (chain !== 'ethereum' && chain !== 'polygon') {
      console.info('Only support chain ethereum/polygon')
      return
    }
    const collections = await csv().fromFile(collections_path)
    for (const collection of collections) {
      const { slug, contract } = collection
      console.info(`Fetching ${slug} ${contract}`)
      const results = await get_nft_owners({
        chain,
        address: contract,
      })
      if (results.length === 0) {
        continue
      }
      const full_path = path.join(save_path, `${slug}.csv`)
      fs.writeFileSync(full_path, json2csv(results))
      console.info(`Saved ${full_path}`)
    }
  })

program.command('listings')
  .description('Fetch opeansea listings data')
  .argument('<collections_path>', 'nft collections file path')
  .argument('<save_path>', 'save path')
  .action(async (collections_path, save_path) => {
    const collections = await csv().fromFile(collections_path)
    for (const collection of collections) {
      const { slug, contract } = collection
      const owners_path = path.join(save_path, `${slug}.csv`)
      if (!fs.existsSync(owners_path)) {
        continue
      }
      let list1 = await csv().fromFile(owners_path)
      list1.map(item => ({
        ...item,
        listings: 0,
        currentPrice: null,
      }))
      console.info(`Fetching ${slug} listings`)
      const list2 = []
      const listings = await opeansea.retrieve_listings(slug)
      for (const item of listings) {
        const tokenId = item.protocol_data.parameters.offer[0].identifierOrCriteria
        const currentPrice = parseInt(item.price.current.value) / 10 ** item.price.current.decimals
        list2.push({
          tokenId,
          listings: 1,
          currentPrice,
        })
      }
      const mergedList = merge(list1, list2)
      const full_path = path.join(save_path, `${slug}.csv`)
      fs.writeFileSync(full_path, json2csv(mergedList))
      console.info(`Saved ${full_path}`)
    }
  })

program.parse()
