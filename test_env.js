import { execSync } from 'child_process';
const env = { ...process.env };
delete env.CI;
const output = execSync('bash -c "echo \\$CI"', { env });
console.log("Output is: ", output.toString());
