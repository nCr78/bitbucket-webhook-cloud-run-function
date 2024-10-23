const { execSync } = require('child_process');

// Configure your deployment options

// Replace with your project's id or number
const projectID = 'your-project-id';
// Replace with cloud run gen2 function name
const serviceName = 'bitbucket-to-discord';
// Replace with your desired region
const region = 'europe-west1';

// If you want a specific service account / otherwise Google will use the default one
const serviceAccount = `bitbucket-webhook@${projectID}.iam.gserviceaccount.com`;
// Replace with your secret reference from Google secret manager
const bitbucketKeySecretReference = 'BITBUCKET_WEBHOOK';
// Replace with your secret reference from Google secret manager
const discordUrlSecretReference = 'DISCORD_WEBHOOK_URL';
const bitbucketKeySecret = `projects/${projectID}/secrets/${bitbucketKeySecretReference}:latest`;
const discordUrlSecret = `projects/${projectID}/secrets/${discordUrlSecretReference}:latest`;
const entryPoint = 'handleBitbucketWebhook';

// 83 milli-CPUs
const cpuLimit = '83m';
// 128 MiB of memory
const memoryLimit = '128Mi';
// https://cloud.google.com/functions/docs/concepts/execution-environment#runtimes
const runtime = 'nodejs20';
const source = './dist';

// Build the TypeScript code
try {
    console.log('Building the TypeScript project...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('Build successful');
} catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
}

// Prepare the gcloud run deploy command
let command = `gcloud functions deploy ${serviceName} --gen2 --trigger-http`;

command += ` --source=${source}`;
command += ` --runtime=${runtime}`;
command += ` --region=${region}`;
command += ` --entry-point=${entryPoint}`;
command += ` --allow-unauthenticated`;

if (projectID && bitbucketKeySecretReference && discordUrlSecretReference && bitbucketKeySecret && discordUrlSecret) {
    command += ` --set-secrets BITBUCKET_KEY=${bitbucketKeySecret},DISCORD_URL=${discordUrlSecret}`;
}
if (serviceAccount) command += ` --service-account=${serviceAccount}`;
if (cpuLimit) command += ` --cpu=${cpuLimit}`;
if (memoryLimit) command += ` --memory=${memoryLimit}`;

// Run the gcloud command to deploy the service
try {
    console.log('Deploying to Google Cloud Run...');
    execSync(command, { stdio: 'inherit' });
    console.log('Deployment successful');
} catch (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
}
