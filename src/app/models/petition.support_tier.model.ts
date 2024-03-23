import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import { ResultSetHeader } from 'mysql2';




const getSupportTierCount = async (id: number): Promise<number> => {
    Logger.info(`Getting support tier count for petition ${id} from the database`)
    const conn = await getPool().getConnection();
    const query = 'select count(*) as total from support_tier where petition_id = ?';
    const [ rows ] = await conn.query( query, [ id ]);
    await conn.release();
    return rows[0].total;
}

const checkTitle = async (id: number, title: string): Promise<boolean> => {
    Logger.info(`Check if title is already used for a support tier for the petition`);
    const conn = await getPool().getConnection();
    const query = 'select * from support_tier where petition_id = ? and title = ?';
    const [ rows ] = await conn.query( query, [id, title] );
    await conn.release();
    return rows.length > 0;
}

const addSupportTier = async (id: number, title: string, description: string, cost: number): Promise<ResultSetHeader> => {
    Logger.info(`Adding new support tier`);
    const conn = await getPool().getConnection();
    const query = 'insert into support_tier (petition_id, title, description, cost) values (?, ?, ?, ?)';
    const [ rows ] = await conn.query( query, [id, title, description, cost] );
    await conn.release();
    return rows;
}

const updateTier = async (id: number, updateParams: string[], updateValues: string[]): Promise<ResultSetHeader> => {
    Logger.info(`Updating support tier ${id}`);
    const conn = await getPool().getConnection();
    let query = 'update support_tier set ';
    for (let i = 0; i < updateParams.length; i++) {
        if (updateParams[i] === "cost") {
            query += updateParams[i] + ` = ` + parseInt(updateValues[i], 10);
        } else {
            query += updateParams[i] + ` = ` + updateValues[i];
        }
        if (i < updateParams.length - 1) {
            query += `, `;
        }
    }
    query += `where id = ?`
    const [ rows ] = await conn.query( query, [id] );
    await conn.release();
    return rows;
}


const getSupportersLength = async(id: number): Promise<number> => {
    Logger.info(`Getting number of supporters of tier ${id}`);
    const conn = await getPool().getConnection();
    const query = `select * from supporter where support_tier_id = ?`;
    const [ rows ] = await conn.query( query, [id] );
    await conn.release();
    return rows.length;
}

const checkTierBelongToPetition = async (petitionId: number, tierId: number): Promise<boolean> => {
    Logger.info(`Checking if tier ${tierId} belongs to petition ${petitionId}`);
    const conn = await getPool().getConnection();
    const query = `select * from support_tier where id = ? and petition_id = ?`;
    const [ rows ] = await conn.query( query, [tierId, petitionId] );
    await conn.release();
    return rows.length > 0;
}

const getTierCount = async (petitionId: number): Promise<number> => {
    Logger.info(`Checking how many tiers petition ${petitionId} has`);
    const conn = await getPool().getConnection();
    const query = `select count(*) as total from support_tier where petition_id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId] );
    return rows[0].total;
}

const deleteTier = async (tierId: number): Promise<ResultSetHeader> => {
    Logger.info(`Delete tier ${tierId}`);
    const conn = await getPool().getConnection();
    const query = `delete from support_tier where id=?`;
    const [ rows ] = await conn.query( query, [ tierId] );
    return rows;
}


const getSupportTiers = async (petitionId: number): Promise<SupportTier[]> => {
    Logger.info(`Get support tiers of ${petitionId}`);
    const conn = await getPool().getConnection();
    const query = `select id as supportTierId, title, description, cost from support_tier where petition_id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId] );
    return rows;
}

export {deleteTier, addSupportTier, getSupportTierCount, checkTitle, getSupportersLength, updateTier, checkTierBelongToPetition, getTierCount, getSupportTiers}