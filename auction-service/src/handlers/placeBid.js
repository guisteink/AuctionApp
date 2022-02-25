import AWS from 'aws-sdk';
import createError from 'http-errors';
import commomMiddleware from '../lib/commomMiddleware';
import { getAuctionById } from './getAuction'
import _ from 'lodash'
import validator from '@middy/validator';
import placeBidSchema from '../lib/schemas/placeBidSchema';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context)
{
    const id = _.get(event, 'pathParameters.id', null);
    const amount = _.get(event, 'body.amount', null);
    const auction = await getAuctionById(id);
    const email = _.get(event, 'requestContext.authorizer.email');

    // ? business rule ?
    if (!auction) throw new createError.NotFound(`Auction with ID "${id}" not found!`)
    if (auction.status !== 'OPEN') throw new createError.Forbidden('YOU CANNOT BID ON CLOSE AUCITONS');
    if (amount <= auction.highestBid.amount) throw new createError.Forbidden(`YOUR BID AMOUNT MUST BE HIGHER THAN CURRENT ONE i.e ${auction.highestBid.amount}`);
    if (email === auction.seller) throw new createError.Forbidden('YOU CANNOT BID ON YOUR OWN AUCTION');
    if (email === auction.highestBid.bidder) throw new createError.Forbidden('YOU ALREADY HAVE THE HIGHEST BID');

    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Key: { id },
        UpdateExpression: 'SET highestBid.amount = :amount, highestBid.bidder = :bidder',
        ExpressionAttributeValues: {
            ':amount': amount,
            ':bidder': email
        },
        ReturnValues: 'ALL_NEW',
    };

    let updatedAuction;
    try {
        const result = await dynamodb.update(params).promise();
        updatedAuction = result.Attributes;
    } catch (error) {
        console.log(error);
        throw new createError.InternalServerError(error)
    }

    return {
        statusCode: 200,
        body: JSON.stringify(updatedAuction),
    };
}

export const handler = commomMiddleware(placeBid)
    .use(validator({
        inputSchema: placeBidSchema,
        ajvOptions: {
            useDefaults: true,
            strict: false,
        },
    }));



