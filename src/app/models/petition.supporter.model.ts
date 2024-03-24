import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import { ResultSetHeader } from 'mysql2';
import moment from "moment";



const getSupporters = async (id: number): Promise<Supporter[]> => {
    Logger.info(`Getting supporters of petition ${id} from the database`)
    const conn = await getPool().getConnection();
    const query = 'select supporter.id as supportId, supporter.support_tier_id as supportTierId, supporter.message' +
        ', supporter.user_id as supporterId, user.first_name as supporterFirstName, user.last_name as supporterLastName,' +
        'supporter.timestamp from supporter join user on supporter.user_id=user.id where supporter.petition_id = ? ' +
        'order by supporter.timestamp desc';
    const [ rows ] = await conn.query( query, [ id ]);
    await conn.release();
    return rows;
}

const getSupportersBySupporterTierIdUserId = async (userId: number, supporterTierId: number): Promise<Supporter[]> => {
    Logger.info(`Checking if user ${userId} already supports supporter tier ${supporterTierId}`)
    const conn = await getPool().getConnection();
    const query = 'select * from supporter where support_tier_id = ? and user_id = ?';
    const [ rows ] = await conn.query( query, [ supporterTierId, userId ]);
    await conn.release();
    return rows;
}

const addSupporter = async (petitionId: number, supporterTierId: number, userId: number, message: string): Promise<ResultSetHeader> => {
    Logger.info(`Adding ${userId} to support ${supporterTierId}`)
    const conn = await getPool().getConnection();
    const query = 'insert into supporter (petition_id, support_tier_id, user_id, message, timestamp)' +
        ' values (?, ?, ?, ?, ?)';
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const [ rows ] = await conn.query( query, [ petitionId, supporterTierId, userId, message, timestamp ]);
    await conn.release();
    return rows;
}

const checkPetitionHasSupporters = async (petitionId: number): Promise<boolean> => {
    Logger.info(`Check if ${petitionId} has any supporters`)
    const conn = await getPool().getConnection();
    const query = 'select * from supporter where petition_id = ?';
    const [ rows ] = await conn.query( query, [ petitionId ]);
    await conn.release();
    return rows.length > 0;
}



export {getSupporters, getSupportersBySupporterTierIdUserId, addSupporter, checkPetitionHasSupporters}