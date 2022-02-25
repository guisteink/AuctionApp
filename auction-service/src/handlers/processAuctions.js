import { getEndedAuctions } from '../lib/getEndedAuctions';
import { closeAuction } from '../lib/closeAuction';
import createError from 'http-errors';

async function processAuctions(event, context)
{
    // ? checks and closes the auction if time runs out
    // ! schedule every 1m
    try {
        const auctionsToClose = await getEndedAuctions();
        const closePromises = auctionsToClose.map(auction => closeAuction(auction));
        await Promise.all(closePromises);
        return { closed: closePromises.length };
    } catch (error) {
        console.log(error);
        throw new createError.InternalServerError(error);
    }
}

export const handler = processAuctions;