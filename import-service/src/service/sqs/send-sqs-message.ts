import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
});

export default async function sendSqsMessage(message: string) {

  const params = {
    QueueUrl: process.env.CATALOG_ITEMS_QUEUE_URL!,
    MessageBody: message,
  };

  console.log('Sending message to SQS...');

  try {
    const command = new SendMessageCommand(params);
    const response = await sqsClient.send(command);
    console.log('Message sent to SQS:', response.MessageId);
  } catch (error) {
    console.error('Error sending message to SQS:', error);
    throw error;
  }
}