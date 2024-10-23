import crypto from 'crypto';
import { Bitbucket, BitbucketEventKeys } from 'bitbucket-webhook-event-types';
import { Webhook as Discord } from 'discord-webhook-types';

// Google Cloud Function Entry Point
export const handleBitbucketWebhook = async (
  req: {
    headers: { [x: string]: BitbucketEventKeys; };
    body: Bitbucket.WebhookEvents.RepositoryPush
      | Bitbucket.WebhookEvents.PullRequestCreated
      | Bitbucket.WebhookEvents.PullRequestMerged
      | Bitbucket.WebhookEvents.PullRequestDeclined
      | Bitbucket.WebhookEvents.RepositoryFork
    },
  res: any
) => {
  try {
    // Step 1: Retrieve secrets from environment variables
    const bitbucketSecret = process.env.BITBUCKET_KEY;
    const discordWebhookUrl = process.env.DISCORD_URL;

    if (!bitbucketSecret || !discordWebhookUrl) {
      return res.status(500).send('Failed attempting to read important keys.');
    }

    // Step 2: Verify the secret
    const requestSecret = req.headers['x-hub-signature'];

    if (!requestSecret || !verifySignature(req.body, requestSecret, bitbucketSecret)) {
      return res.status(403).send('Invalid Secret');
    }

    // Step 3: Infer the event type and process accordingly
    const eventKey = req.headers['x-event-key'];
    const payload = req.body;

    let discordPayload: Discord.input.POST;

    // missing for now: PullRequestUpdated, RepositoryUpdated
    switch (eventKey) {
      case 'repo:push':
        discordPayload = transformPushEventToDiscord(payload as Bitbucket.WebhookEvents.RepositoryPush);
        break;
      case 'pullrequest:created':
        discordPayload = transformPullRequestEventToDiscord(payload as Bitbucket.WebhookEvents.PullRequestCreated, 'created');
        break;
      case 'pullrequest:merged':
        discordPayload = transformPullRequestEventToDiscord(payload as Bitbucket.WebhookEvents.PullRequestMerged, 'merged');
        break;
      case 'pullrequest:declined':
        discordPayload = transformPullRequestEventToDiscord(payload as Bitbucket.WebhookEvents.PullRequestDeclined, 'declined');
        break;
      case 'repo:fork':
        discordPayload = transformForkEventToDiscord(payload as Bitbucket.WebhookEvents.RepositoryFork);
        break;
      default:
        return res.status(400).send('Unsupported event type');
    }

    // Step 4: Send the transformed payload to Discord Webhook
    const discordResponse = await sendToDiscord(discordWebhookUrl, discordPayload);

    if (!discordResponse.ok) {
      return res.status(500).send(`Failed to send message to Discord: ${discordResponse.statusText}`);
    }

    // Step 5: Return success response
    res.status(200).send('Success');
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Function to verify the Bitbucket signature
const verifySignature = (body: any, requestSignature: string, secret: string) => {
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedSignature = `sha256=${hash}`;
  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(requestSignature));
};

// Transform Push Event Payload to Discord Payload
const transformPushEventToDiscord = (payload: Bitbucket.WebhookEvents.RepositoryPush): Discord.input.POST => {
  const commits = payload.push.changes[0].commits || [];
  const branch = payload.push.changes[0].new?.name;
  const commitMessages = commits.map(commit => `- [${commit.message?.trim() ?? '-'}](${commit.links.html.href})`).join('\n');

  return {
    content: `New push event on branch **${branch}** in repository **${payload.repository.full_name}**`,
    embeds: [
      {
        title: `Push Event`,
        description: `Branch: ${branch}\nCommits:\n${commitMessages}`,
        fields: [
          {
            name: 'Repository',
            value: `[${payload.repository.full_name}](${payload.repository.links.html.href})`,
            inline: false
          },
          {
            name: 'Author',
            value: payload.actor.display_name,
            inline: false
          }
        ]
      }
    ]
  };
};

// Transform Pull Request Event Payload to Discord Payload
const transformPullRequestEventToDiscord = (
  payload: Bitbucket.WebhookEvents.PullRequestCreated
    | Bitbucket.WebhookEvents.PullRequestMerged
    | Bitbucket.WebhookEvents.PullRequestDeclined,
  action: string
): Discord.input.POST => {
  return {
    content: `Pull Request **${action}** in repository **${payload.repository.full_name}**`,
    embeds: [
      {
        title: `Pull Request: ${payload.pullrequest.title}`,
        description: `Author: ${payload.pullrequest.author.display_name}\n[View Pull Request](${payload.pullrequest.links.html.href})`,
        fields: [
          {
            name: 'Source Branch',
            value: payload.pullrequest.source.name,
            inline: true
          },
          {
            name: 'Destination Branch',
            value: payload.pullrequest.destination.name,
            inline: true
          }
        ]
      }
    ]
  };
};

// Transform Fork Event Payload to Discord Payload
const transformForkEventToDiscord = (payload: Bitbucket.WebhookEvents.RepositoryFork): Discord.input.POST => {
  return {
    content: `Repository **forked** by **${payload.actor.display_name}**`,
    embeds: [
      {
        title: `Repository Fork`,
        description: `[View Repository](${payload.repository.links.html.href})`,
        fields: [
          {
            name: 'Source Repository',
            value: `[${payload.repository.full_name}](${payload.repository.links.html.href})`,
            inline: true
          },
          {
            name: 'Forked Repository',
            value: `[${payload.fork.full_name}](${payload.fork.links.html.href})`,
            inline: true
          }
        ]
      }
    ]
  };
};

// Send the transformed payload to Discord
const sendToDiscord = async (webhookUrl: string, payload: Discord.input.POST) => {
  return await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};
