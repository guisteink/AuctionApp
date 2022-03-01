import AWS from 'aws-sdk';

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

export async function closeAuction(auction)
{
   const params = {
      TableName: process.env.AUCTIONS_TABLE_NAME,
      Key: { id: auction.id },
      UpdateExpression: 'set #status = :status',
      ExpressionAttributeValues: {
         ':status': 'CLOSED',
      },
      ExpressionAttributeNames: {
         '#status': 'status',
      },
   };

   await dynamoDB.update(params).promise();

   const { title, seller, highestBid } = auction;
   const { amount, bidder } = highestBid;

   if (amount === 0) {
      await sqs.sendMessage({
         QueueUrl: process.env.MAIL_QUEUE_URL,
         MessageBody: JSON.stringify({
            subject: 'Your auction is not sold :(',
            recipient: seller,
            body: `We are very sorry to inform you that your auction "${title}" is not sold. Try again another time.`
         }),
      }).promise();
      return;
   }

   const notifySeller = sqs.sendMessage({
      QueueUrl: process.env.MAIL_QUEUE_URL,
      MessageBody: JSON.stringify({
         subject: `Your item "${title}" has been sold!`,
         recipient: seller,
         body: `Congratulations!! Your item is sold.\n\tItem: ${title}\n\tAmount: ${amount}.`
      }),
   }).promise();

   const notifyBidder = sqs.sendMessage({
      QueueUrl: process.env.MAIL_QUEUE_URL,
      MessageBody: JSON.stringify({
         subject: `You won the action of ${title}!`,
         recipient: bidder,
         body: `Great!! you got ${title} in auction for ${amount}.`
      }),
   }).promise();

   return Promise.all([notifySeller, notifyBidder]);
}