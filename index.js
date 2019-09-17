const puppeteer = require('puppeteer');
const parse = require('csv-parse/lib/sync');
const fs = require('fs');

const NOTFOUND_SELECTOR = 'body > div:nth-child(2) > div > div.content-center > div.row.pl-1.record-count > div';

const EMAIL_DESC_STRING = 'Email Addresses';

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const getTruePeople = async (page, firstName, lastName, zip) => {
  await page.goto(`https://www.truepeoplesearch.com/results?name=${encodeURI((firstName + ' ' + lastName).trim())}&citystatezip=${zip}&rid=0x0`)

  let notFound = await page.evaluate((sel) => {
    const NOTFOUND_TEXT = 'We could not find any records for that search criteria.';

    try {
      const res = document.querySelector(sel).textContent.trim();
      return res === NOTFOUND_TEXT;
    } catch (e) {
      return false;
    }
  }, NOTFOUND_SELECTOR);

  // remove if not found
  if (notFound) return '';

  let emails = await page.evaluate((DESC_STRING) => {
    const elems = document.querySelectorAll("*");
    const emailDomElement = Array.from(elems).find(v => v.textContent.trim() === DESC_STRING);
    if (!emailDomElement) return '';

    const childCount = emailDomElement.parentNode.childElementCount;
    let emails = [];
    for (let x = 1; x < childCount; x++) {
      emails.push(emailDomElement.parentNode.children[x].textContent.trim());
    }
    return emails.join('\t');
  }, EMAIL_DESC_STRING)

  return emails;
}

(async () => {
  // read file
  const input = fs.readFileSync('./data.csv', 'utf8');

  const records = parse(input, {
    columns: true,
    skip_empty_lines: true
  })

  // fire up the browser
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();

  for (record of records) {
    const firstName = record['1st Owner\'s First Name'];
    const lastName = record['1st Owner\'s Last Name'];
    const zip = record['Site Zip Code'];

    res = await getTruePeople(page, firstName, lastName, zip);

    if (res !== '') {
      console.log(`${firstName}\t${lastName}\t${res}`);
    }

    await sleep(10000);
  }

  await browser.close();
})();
