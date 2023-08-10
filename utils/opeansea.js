const axios = require('axios')
const puppeteer = require('puppeteer')

const get_transfers = async (url) => {
  const browser = await puppeteer.launch({
    headless: false,
    // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  })
  const page = await browser.newPage()
  await page.goto(url)
  await page.waitForSelector('.EventHistory--prices')
  const results = await page.evaluate(() => {
    return [...document.querySelectorAll('.EventHistory--prices')].map(el => el.textContent)
  })
  // [ '15 ETH', '9.870 ETH', '10 ETH', '6 ETH', '2.710 ETH', '1 ETH' ]
  return results
}

const get_offers = async (url) => {
  const browser = await puppeteer.launch({
    headless: false,
  })
  const page = await browser.newPage()
  await page.goto(url)
  await page.waitForSelector('[aria-labelledby="Header offers-panel"] .Price--amount')
  const results = await page.evaluate(() => {
    return [...document.querySelectorAll('[aria-labelledby="Header offers-panel"] .Price--amount')].map(el => el.textContent)
  })
  return results
}

const retrieve_listings = async (slug) => {
  let listings = []
  let next = ''
  while (true) {
    try {
      const res = await axios.get(`https://api.opensea.io/v2/listings/collection/${slug}/all`, {
        headers: {
          'X-API-KEY': process.env.OPENSEA_API_KEY
        },
        params: {
          next,
        }
      })
      const data = res.data
      listings = listings.concat(data.listings)
      next = data.next
      break
      if (!next) {
        break
      }
    } catch(error) {
      console.info('sleeping...')
      console.info(error.response.statusText)
      await (new Promise(resolve => setTimeout(resolve, 5000)))
    }
  }
  return listings
}

module.exports = {
  retrieve_listings,
  get_transfers,
  get_offers,
}
