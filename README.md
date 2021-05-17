# airports_data_collection

[Wikipedia's List of Data](https://en.wikipedia.org/wiki/Lists_of_airports)  --> [.json](https://github.com/smrnjeet222/airports_data_collection/tree/master/output)

### Run Script

```bash 
yarn 
yarn run scrape

-------OR---------

npm install 
npm run scrape
```

## Design Choices

* Instead of going through all pages one-by-one (by clicking), I created a concurrent model.
*  Concurrency: 
    1. Exracted Link for all pages to scrape
    2. Looped through all links, concurrently running multiple Pupeteer instances.
*  Also creating small json files for individual pages.
* Running pupeteer in headless mode as visuals are not required.
* added feature where user can specify relative directory path to store .json (directory is created if it doesn't exist) 
