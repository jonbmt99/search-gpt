import { Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { createRequire } from "module"; 
const require = createRequire(import.meta.url); 
const rows = require("./MajorImportersbycity2018.json")

dotenv.config("../");
const { OPENAI_API_KEY } = process.env;

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
      temperature: 0.6,
      max_tokens: 1000,
    })
}

async function main() {
  const output = []
  let i = 0;
  for (let row of rows) {
    const company =  row['COMPANY-ENTREPRISE'];
    const city = row['CITY-VILLE'];
    const question = `
    Email, Website of company ${company} in ${city}
    format answer is Email: , Website: 
    `;
    try {
      i++;
      console.log('current row: ', i);
      await AIResponse(question).then(completion => {
        let answer = completion.data.choices[0].text.trim();
        row.result = answer;
        output.push(row);
      });
      if(i % 500 === 0) {
        fs.writeFileSync(
          `output_${i}.json`,
          JSON.stringify(output, null, 2)
        );
        console.log(`output_${i}.json`);
      }
    } catch(e) {
      console.log('error: ', e);
    }
    if (i > 4) break;
  }
  fs.writeFileSync(
    "output_all.json",
    JSON.stringify(output, null, 2)
  );
}

main();
