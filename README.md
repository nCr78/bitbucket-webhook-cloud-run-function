
# Bitbucket to Discord Webhook (Cloud Function)

This repository contains a Node.js Cloud Function that listens to Bitbucket webhooks and posts notifications to a Discord channel. The project includes a deployment script (`deploy.js`) that automates the process of deploying this function to **Google Cloud Functions (Gen 2)** using the Google Cloud SDK (`gcloud`). It was written in a few hours so expect lots of issues!

## Prerequisites

- **Node.js**: Ensure you have Node.js installed (version 16 or higher recommended).
- **Google Cloud SDK (`gcloud`)**: Install the Google Cloud SDK and configure it.
- **Google Secret Manager**: Create the necessary secrets for your Bitbucket and Discord credentials.
- **Google Cloud Service Account**: Create and configure a service account with the proper roles.

## Setup Guide

### 1. Google Cloud Setup

1. **Create a Google Cloud Project**:
   - If you haven't already created a Google Cloud project, do so via the [Google Cloud Console](https://console.cloud.google.com/).
   
2. **Enable APIs**:
   - Enable the Cloud Functions, Secret Manager, and Cloud Run APIs for your project:
     ```bash
     gcloud services enable cloudfunctions.googleapis.com secretmanager.googleapis.com run.googleapis.com
     ```

### 2. Create a Service Account

A service account is required to securely access secrets and run the Cloud Function. Here's how to create and configure one:

1. **Create the service account**:
   ```bash
   gcloud iam service-accounts create bitbucket-webhook --description="Service account for Bitbucket to Discord webhook" --display-name="Bitbucket Webhook Service Account"
   ```

2. **Grant necessary roles**:
   The service account needs permissions to:
   - **Access Secret Manager**: To read the secrets.
   - **Invoke Cloud Functions**: To run the Cloud Function.

   Assign the following roles to the service account:

   - **Secret Manager Secret Accessor**: This allows access to secrets.
   - **Cloud Functions Invoker**: This allows the function to be invoked.

   Run the following commands to assign the roles:

   ```bash
   # Grant Secret Manager Secret Accessor role
   gcloud projects add-iam-policy-binding your-project-id --member="serviceAccount:bitbucket-webhook@your-project-id.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"

   # Grant Cloud Functions Invoker role
   gcloud projects add-iam-policy-binding your-project-id --member="serviceAccount:bitbucket-webhook@your-project-id.iam.gserviceaccount.com" --role="roles/cloudfunctions.invoker"
   ```

3. **Generate a key for the service account (optional)**:
   If you need to use this service account with a key for local testing or other applications, generate a key:

   ```bash
   gcloud iam service-accounts keys create ~/key.json --iam-account=bitbucket-webhook@your-project-id.iam.gserviceaccount.com
   ```

4. **Set the service account in your `deploy.js` script**:
   In your `deploy.js` file, replace the `serviceAccount` variable with your service account:

   ```javascript
   const serviceAccount = 'bitbucket-webhook@your-project-id.iam.gserviceaccount.com';
   ```

### 3. Setup Google Secret Manager

You will store sensitive information, such as the Bitbucket secret and Discord webhook URL, in Google Secret Manager.

1. **Create the Bitbucket Secret**:
   ```bash
   echo -n "super-secret-key" | gcloud secrets create BITBUCKET_WEBHOOK --data-file=-
   ```

2. **Create the Discord Webhook URL Secret**:
   ```bash
   echo -n "super-secret-key" | gcloud secrets create DISCORD_WEBHOOK_URL --data-file=-

   ```

3. **Grant access to the service account** that Cloud Functions uses to access these secrets:
   ```bash
   gcloud secrets add-iam-policy-binding BITBUCKET_WEBHOOK --member="serviceAccount:bitbucket-webhook@your-project-id.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"

   gcloud secrets add-iam-policy-binding DISCORD_WEBHOOK_URL --member="serviceAccount:bitbucket-webhook@your-project-id.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
   ```

### 4. Configure `deploy.js`

In the `deploy.js` file, you must configure the following fields with your project-specific details:

```javascript
// Replace with your project's id or number
const projectID = 'your-project-id';
// Replace with your cloud function name
const serviceName = 'bitbucket-to-discord';
// Replace with your desired region
const region = 'europe-west1';
// Replace with your service account
const serviceAccount = 'bitbucket-webhook@your-project-id.iam.gserviceaccount.com';
// Replace with your secret references from Google Secret Manager
const bitbucketKeySecretReference = 'BITBUCKET_WEBHOOK';
const discordUrlSecretReference = 'DISCORD_WEBHOOK_URL';
```

### 5. Configure Google Cloud SDK

Before deploying, configure your Google Cloud project using the `gcloud` SDK:

```bash
gcloud auth login
gcloud config set project your-project-id
gcloud config set functions/region europe-west1
```

You should now be set up to deploy the Cloud Function with the proper configuration.

## Deployment

Once the above setup is complete, you can deploy the function by running:

```bash
npm run deploy
```

This will:
- **Build** the TypeScript code.
- **Deploy** the Cloud Function using the `gcloud` command, with secrets and resource limits (CPU, memory) defined in the `deploy.js` script.

### Breakdown of the `deploy.js` script:

- **Secrets**: It pulls your secrets from Google Secret Manager for the `BITBUCKET_KEY` and `DISCORD_URL`.
- **CPU and Memory Limits**: Sets the CPU to 83 milli-CPUs (`83m`) and memory to 128MiB.
- **Service Account**: Uses a specific service account to run the Cloud Function.
- **Entry Point**: The entry point to the function is `handleBitbucketWebhook`, which must be the name of the exported function from your code.

## Additional Customization

- **Update Secrets**: If you need to modify or update the secrets in Google Secret Manager, you can use:
  ```bash
  echo -n "new-secret-string" | gcloud secrets versions add BITBUCKET_WEBHOOK --data-file=-
  echo -n "new-secret-string" | gcloud secrets versions add DISCORD_WEBHOOK_URL --data-file=-
  ```

- **Update Resource Limits**: You can modify the CPU and memory limits in `deploy.js`:
  ```javascript
  const cpuLimit = '100m';  // Adjust CPU
  const memoryLimit = '256Mi';  // Adjust Memory
  ```

## Logs and Debugging

To view logs for the deployed Cloud Function, use:

```bash
gcloud functions logs read bitbucket-to-discord
```

This will give you insights into errors or issues that might occur after deployment.

## License

This project is licensed under the MIT License.
