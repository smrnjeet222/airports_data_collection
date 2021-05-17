import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path'

// TYPES
interface IPagesLink {
  id: string;
  link: string;
}

interface IAirportData {
  iata: string,
  icao: string,
  airport_name: string,
  location_served: string,
}


// Create a file for given json data
const createFile = (name: string, data: IAirportData[]): void => {

  const filePath = path.dirname(name)
  // make output directory if doesn't exist, then add file
  fs.promises.mkdir(filePath, { recursive: true })
    .then(() => {
      fs.writeFile(name, JSON.stringify(data, null, 2), (err) => {
        if (err) throw err;
        console.log(`${name} created`);
      });
    })
}


// PART 1
// Receive all links of alpabectically ordered pages i.e. List: A-B-C-.... 
const getAllLinks = async (): Promise<IPagesLink[]> => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://en.wikipedia.org/wiki/Lists_of_airports');

  // waiting for selector to fully render
  await page.waitForSelector('.mw-parser-output');

  const alphabets_links = await page.$$eval('.mw-parser-output',
    (block) => {
      const parah = block[0].querySelectorAll('p');
      const aTags = parah[3].querySelectorAll('a'); // Links provided in 4 paragraph 
      // creating array of all pages links
      return Array.from(aTags, tag => ({
        id: tag.innerText,
        link: tag.href
      }))
    });

  await browser.close();

  // return links list
  return alphabets_links
};


// PART 2
// scraping table provided the page link
const scrapeList = async (browser: puppeteer.Browser, link: string): Promise<IAirportData[]> => {
  const page = await browser.newPage();
  await page.goto(link);
  await page.waitForSelector('.wikitable');

  const tableData: IAirportData[] = await page.$$eval('.wikitable',
    (table): IAirportData[] => {

      // replace whitespaces, commas and numbers
      const customString = (str: string | null): string => {
        // for empty row data return empty string
        if (str === null) return ""

        // regex for finding whitespaces and commas 

        // const exp = /\s*,\s*|\s+,|[ ]+/g;  // a, b --> a_b
        const exp = /\s|,/g;   // a, b --> a__b

        const converted = str.toLocaleLowerCase().replace(exp, "_",);

        // replacing number digits w/ 'dapi'
        return converted.replace(/[0-9]/g, "dapi")
      };

      // Getting all the table rows
      const rows: NodeListOf<Element> = table[0].querySelectorAll('tbody tr');

      // Converting to array of object 
      const rowData: (IAirportData | null)[] = Array.from(rows,
        (row): IAirportData | null => {

          const tds: NodeListOf<Element> = row.querySelectorAll('td'); // row value element (raw)

          const data: (string | null)[] = Array.from(tds, td => td.textContent) // text values
          // return null if row is empty
          if (!data.length) return null;
          // return as per required format
          return {
            "iata": data[0] || "",
            "icao": data[1] || "",
            "airport_name": customString(data[2]),
            "location_served": customString(data[3]),
          }
        })

      // filter out null values
      const noNullRowData = rowData.filter((val): boolean => !!val) as IAirportData[]

      return noNullRowData;
    })

  await page.close()

  // return formatted object data for given page
  return tableData;
};


// _____________   START __________________
// Not Following step 1 of assignment !! 
// Added concurrency by skiping it


// All inside a async f'n
(async (): Promise<void> => {
  // Extractiong alphabet wise pages from home page
  const alphabets_links: IPagesLink[] = await getAllLinks();

  // new Browser Instance
  const browser: puppeteer.Browser = await puppeteer.launch();

  // Concurrency model for all promises within loop
  const allCombined: IAirportData[][] = await Promise.all(

    // Looping through all links(pages)
    alphabets_links.splice(2,) // ignore first 2 links
      .map(async ({ id, link }): Promise<IAirportData[]> => {   // will combine all pages data 
        const list: IAirportData[] = await scrapeList(browser, link)

        // (optional) creating json for every page data
        createFile(`output/byPages/data_${id}.json`, list);

        return list
      })
  )

  // current object is like [ [array of page 1],  [..], [..], .....] becouse of maping.

  // Flattening array i.e [ [{}], [{}], [{}],...] -> to -> [{}, {},.....]
  const flattenedData: IAirportData[] = allCombined.reduce((acc, cur) => acc.concat(...cur), [])

  // Finally creating combined file
  createFile(`output/All.json`, flattenedData);

  await browser.close();

})();


