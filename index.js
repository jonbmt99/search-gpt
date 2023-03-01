const require = createRequire(import.meta.url); 
require('dotenv').config();
const OPENAI_API_KEY = process.env['OPENAI_API_KEY'];
const input_file_name = process.env['INPUT_FILE_NAME'];
const output_file_name = process.env['OUTPUT_FILE_NAME'];
let rows = require(`./data-input/${input_file_name}`);
rows = rows.Data;
const dns = require('dns');
const XLSX = require("xlsx");

const input_row = parseInt(process.argv.splice(2).join(" "), 10);


import { Configuration, OpenAIApi } from "openai";
import * as fs from "fs";
import { createRequire } from "module"; 


const openai = new OpenAIApi(
  new Configuration({
    apiKey: OPENAI_API_KEY,
  })
);

function AIResponse(question) {
  return openai
    .createCompletion({
      model: "text-davinci-003",
      prompt: question,
      temperature: 0.9,
      max_tokens: 1000,
    })
}

async function main() {
  console.log('total-input: ', rows.length);
  const output = [];
  let i = input_row - 1;
  let retry_count = 1;
  let sub_question = '';
  while (i < rows.length) {
    const row = rows[i];
    const company =  row['COMPANY-ENTREPRISE'];
    const city = row['CITY-VILLE'];
    const question = `
      Format is: Email: , Website:
      Find email and website of company ${company} in ${city}?
      ${sub_question}
      `;
    try {
      console.log('current row: ', i + 1, 'retry_count', retry_count);
      const completion = await AIResponse(question)
      let answer = completion.data.choices[0].text.trim();
      const answer_array = answer.split(' ');
      const website = answer_array[answer_array.length - 1];
      const options = {
        family: 6,
        hints: dns.ADDRCONFIG | dns.V4MAPPED,
      };
      options.all = true;
      const address = await lookupPromise(website);
      if (address) {
        row.result = answer;
        output.push(row);
        sub_question = '';
        i++;
        retry_count = 1;
        let current_output = fs.readFileSync(`./data-output/${output_file_name}`);
          current_output = JSON.parse(current_output);
          if (!current_output) {
            current_output = [];
          }
          current_output.push(row);
          fs.writeFileSync(
            `./data-output/${output_file_name}`,
            JSON.stringify(current_output, null, 2)
          );
          const worksheet = XLSX.utils.json_to_sheet(current_output);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "data");
          XLSX.writeFile(workbook, `./data-output-excel/${output_file_name.replace('.json', '')}.xlsx`);
          fs.writeFileSync(`./current-row/current-row-of-${input_file_name}`, `index row done ${i}`);
      } else if (retry_count > 5) {
          retry_count = 1;
          i++;
          sub_question = '';
          row.result = answer;
          let current_output = fs.readFileSync(`./data-output/${output_file_name}`);
          current_output = JSON.parse(current_output);
          if (!current_output) {
            current_output = [];
          }
          current_output.push(row);
          fs.writeFileSync(
            `./data-output/${output_file_name}`,
            JSON.stringify(current_output, null, 2)
          );

          const worksheet = XLSX.utils.json_to_sheet(current_output);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "data");
          XLSX.writeFile(workbook, `./data-output-excel/${output_file_name.replace('.json', '')}.xlsx`);

          fs.writeFileSync(`./current-row/current-row-of-${input_file_name}`, `index row done: ${i}`);
      } else {
        sub_question += `website don't like ${website} \n`
        retry_count ++;
      }
    } catch(e) {
      if (e && e.response && e.response.status === 401) {
        console.log('==== OpenAI token is not valid');
        return;
      }
      if (e && e.response && e.response.status === 429) {
        console.log('==== Too many request')
      }
      console.log('error: ', e);
    }
  }
}

async function lookupPromise(website) {
  return new Promise((resolve, reject) => {
      dns.lookup(website, (err, address, family) => {
        resolve(address);
      });
 });
};

main();