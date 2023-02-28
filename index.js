const OPENAI_API_KEY='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'
const input_file_name = 'input_example.json';
const output_file_name = 'output_example.json';
const input_row = parseInt(process.argv.splice(2).join(" "), 10);

import { Configuration, OpenAIApi } from "openai";
import * as fs from "fs";
import { createRequire } from "module"; 
const require = createRequire(import.meta.url); 
const rows = require(`./data-input/${input_file_name}`);
const dns = require('dns');

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
  const output = [];
  let i = input_row - 1;
  let retry_count = 1;
  let sub_question = '';
  while (i < rows.length) {
    const row = rows[i];
    const company =  row['COMPANY-ENTREPRISE'];
    const city = row['CITY-VILLE'];
    const question = `
      Format answer is Email: , Website:
      Find email and website of company ${company} in ${city}?
      ${sub_question}
      `;
    console.log('retry_count: ', retry_count);

    try {
      console.log('current row: ', i + 1);
      console.log('question: ', question);
      const completion = await AIResponse(question)
      let answer = completion.data.choices[0].text.trim();
      console.log('answer: ', answer);
      const answer_array = answer.split(' ');
      const website = answer_array[answer_array.length - 1];
      console.log('website: ', website);
      const options = {
        family: 6,
        hints: dns.ADDRCONFIG | dns.V4MAPPED,
      };
      options.all = true;
      console.log('11111');
      const address = await lookupPromise(website);
      console.log('address: ', address);
      console.log('2222222');
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
          fs.writeFileSync(`./current-row/current-row-of-${input_file_name}`, i);
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
          fs.writeFileSync(`./current-row/current-row-of-${input_file_name}`, i);
      } else {
        sub_question += `website of answer don't like ${website} \n`
        retry_count ++;
      }
    } catch(e) {
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