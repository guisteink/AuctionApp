import { v4 as uuid } from 'uuid';
import AWS from 'aws-sdk';
import createError from 'http-errors';
import commomMiddleware from '../lib/commomMiddleware';
import validator from '@middy/validator';
import createAuctionSchema from '../lib/schemas/createAuctionSchema';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function createAuction(event, context)
{
  const { title } = event.body;
  const { email } = event.requestContext.authorizer;
  const now = new Date();
  const endDate = new Date();
  endDate.setHours(now.getHours() + 23)

  const auction = {
    id: uuid(),
    title,
    status: 'OPEN',
    highestBid: { amount: 0 },
    seller: email,
    createAt: now.toISOString(),
    endingAt: endDate.toISOString()
  };

  try {
    await dynamodb.put({
      TableName: process.env.AUCTIONS_TABLE_NAME,
      Item: auction
    }).promise();
  } catch (error) {
    console.log(error);
    throw new createError.InternalServerError(error)
  }

  return {
    statusCode: 201,
    body: JSON.stringify(auction),
  };
}

export const handler = commomMiddleware(createAuction)
  .use(validator({
    inputSchema: createAuctionSchema,
    ajvOptions: {
      useDefaults: true,
      strict: false,
    },
  }));




