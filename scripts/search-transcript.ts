import fs from 'fs';
import readline from 'readline';

const filePath = 'C:/Users/HP/.gemini/antigravity-ide/brain/2088ff2a-f655-47d4-a03f-dab88cdd5046/.system_generated/logs/transcript.jsonl';

async function search() {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line.includes('USER_INPUT') || line.includes('USER_EXPLICIT') || line.includes('password') || line.includes('sjegvuudtzmkxmxkjggu')) {
            try {
                const obj = JSON.parse(line);
                console.log(`Step ${obj.step_index} (${obj.source} / ${obj.type}):`);
                // Print content if it is short, or search in it
                const content = obj.content || '';
                if (content.length > 500) {
                    console.log('  Content (truncated):', content.substring(0, 500) + '...');
                } else {
                    console.log('  Content:', content);
                }
                if (obj.tool_calls) {
                    console.log('  Tool Calls:', JSON.stringify(obj.tool_calls));
                }
            } catch (err) {
                console.log('Line matched but failed to parse JSON:', line.substring(0, 200));
            }
        }
    }
}

search();
