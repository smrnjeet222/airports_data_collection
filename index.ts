import puppeteer from 'puppeteer';
import fs from 'fs';

// Create a file for given json data
const createFile = (name: string, data: Object): void => {
  fs.writeFile(name, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      throw err;
    }
    console.log(`${name} created`);
  });
}


const getAllLinks = async (): Promise<any[]> => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://en.wikipedia.org/wiki/Lists_of_airports');
  await page.waitForSelector('.mw-parser-output');

  const alphabets_links = await page.$$eval('.mw-parser-output', (block) => {
    const parah = block[0].querySelectorAll('p');
    const aTags = parah[3].querySelectorAll('a');
    return Array.from(aTags, tag => ({
      id: tag.innerText,
      link: tag.href
    }))
  });

  await browser.close();

  return alphabets_links
};


const scrapeList = async (link: string): Promise<any[]> => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(link);
  await page.waitForSelector('.wikitable');

  const data = await page.$$eval('.wikitable', table => {

    // replace whitespaces, commas and numbers
    const customString = (str: string | null) => {
      // for empty row data return empty string
      if (str === null) return ""

      // regex for finding whitespaces and commas
      const exp = /\s*,\s*|\s+,|[ ]+/g;
      const converted = str.toLocaleLowerCase().replace(exp, "_",);

      // replacing number digits w/ 'dapi'
      return converted.replace(/[0-9]/g, "dapi")
    };

    const rows = table[0].querySelectorAll('tbody tr');

    const rowData = Array.from(rows, row => {

      const tds = row.querySelectorAll('td');

      const data = Array.from(tds, td => td.textContent)
      // return null if row is empty
      if (!data.length) return;
      // return as per required format
      return {
        "iata": data[0],
        "icao": data[1],
        "airport_name": customString(data[2]),
        "location_served": customString(data[3]),
      }
    })

    // filter out null valuse
    return rowData.filter(val => !!val)
  })

  await browser.close();

  return data;
};



(async (): Promise<void> => {
  const alphabets_links = await getAllLinks();

  const allCombined = await Promise.all(
    alphabets_links.splice(2,)
      .map(async ({ id, link }) => {
        const list = await scrapeList(link)
        createFile(`output/byPages/data_${id}.json`, list);
        return list
      })
  )

  const flattenedData = allCombined.reduce((acc, cur) => acc.concat(...cur), [])

  createFile(`output/All.json`, flattenedData);
})();


