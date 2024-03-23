import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import { ResultSetHeader } from 'mysql2';

const getAll = async (updateParams: string[], updateValues: string[]): Promise<PetitionAll[]> => {
    Logger.info(`Getting petitions from the database`)
    const conn = await getPool().getConnection();
    let query = `select petition.id as petitionId, petition.title as title, petition.category_id as categoryId, petition.owner_id as ownerId, user.first_name as firstName, user.last_name as lastName, count(*) as numberOfSupporters, petition.creation_date as creationDate, min(support_tier.cost) group by petition.id join user on user.id=petition.owner_id join support_tier on support_tier.petition_id=petition.id join supporter on supporter.support_tier_id=support_tier.id where `;

    for (let i = 0; i < updateParams.length; i ++) {
        if (updateParams[i] === "q") {
            query += `(petition.description like %` + updateValues[i] + `% or petition.title like %` + updateValues[i] + `%) `;
        } else if (updateParams[i] === "categoryIds") {
            query += `petition.category_id in ` + updateValues[i] + ` `;
        } else if (updateParams[i] === "supportingCost") {
            query += `support_tier.cost <= ` + updateValues[i] + ` `;
        } else if (updateParams[i] === "ownerId") {
            query += `petition.owner_id = ` + updateValues[i] + ` `;
        } else if (updateParams[i] === "supporterId") {
            query += `supporter.id = ` + updateValues[i] + ` `;
        }
        query += `and `;
    }
    query = query.slice(0, -4);
    if (updateParams[-1] === "sortBy") {
        if (updateValues[-1] === "ALPHABETICAL_ASC") {
            query += `ORDER BY petition.title`;
        } else if (updateValues[-1] === "ALPHABETICAL_DESC") {
            query += `ORDER BY petition.title desc`;
        } else if (updateValues[-1] === "COST_ASC") {
            query += `ORDER BY support_tier.cost`;
        } else if (updateValues[-1] === "COST_DESC") {
            query += `ORDER BY support_tier.cost desc`;
        } else if (updateValues[-1] === "CREATED_ASC") {
            query += `ORDER BY petition.creation_date`;
        } else if (updateValues[-1] === "CREATED_DESC") {
            query += `ORDER BY petition.creation_date desc`;
        }
    }
    const [rows] = await conn.query(query, []);
    await conn.release();
    return rows;
}



const getPetition = async (id: number): Promise<Petition[]> => {
    Logger.info(`Getting petition ${id} from the database`)
    const conn = await getPool().getConnection();
    const query = 'select id as categoryId, name from petition where id = ?';
    const [ rows ] = await conn.query( query, [ id ]);
    await conn.release();
    return rows;
}

const getCategories = async (): Promise<Category[]> => {
    Logger.info(`Getting all Categories from the database`);
    const conn = await getPool().getConnection();
    const query = 'select * from category';
    const [ rows ] = await conn.query( query );
    await conn.release();
    return rows;
}


const deletePetition = async (petitionId: number): Promise<ResultSetHeader> => {
    Logger.info(`Delete petition ${petitionId}`);
    const conn = await getPool().getConnection();
    const query = `delete from petition where id=?`;
    const [ rows ] = await conn.query( query, [ petitionId] );
    await conn.release();
    return rows;
}


const checkPetitionTitle = async (title: string): Promise<boolean> => {
    Logger.info(`Check petition title ${title}`)
    const conn = await getPool().getConnection();
    const query = `select * from petition where title = ?`;
    const [rows] = await conn.query(query, [title]);
    await conn.release();
    return rows.length > 0;
}

const checkCategoryId = async (id: number): Promise<boolean> => {
    Logger.info(`Check category ${id}`)
    const conn = await getPool().getConnection();
    const query = `select * from category where id = ?`;
    const [rows] = await conn.query(query, [id]);
    await conn.release();
    return rows.length > 0;
}

const createPetition = async (title: string, description: string, ownerId: number, categoryId: number): Promise<ResultSetHeader> => {
    Logger.info(`Add Petition ${title}`)
    const conn = await getPool().getConnection();
    const timestamp = new Date().toISOString()
    const query = `insert into petition (title, description, creation_date, owner_id, category_id) values (?, ?, ?, ?, ?)`;
    const [rows] = await conn.query(query, [title, description, timestamp, ownerId, categoryId]);
    await conn.release();
    return rows;
}


const getPetitionIdFromTitle = async (title:string): Promise<string> => {
    Logger.info(`Get Petition id of ${title}`)
    const conn = await getPool().getConnection();
    const query = `select * from petition where title = ?`;
    const [rows] = await conn.query(query, [title]);
    await conn.release();
    return rows[0].id;
}

const getPetitionDetailed = async(petitionId: number): Promise<PetitionDetailed[]> => {
    Logger.info(`Get Detailed Info of petition ${petitionId}`)
    const conn = await getPool().getConnection();
    const query = `select petition.id as petitionId, petition.title as title, petition.category_id as categoryId, user.id as ownerId, user.first_name as ownerFirstName, user.last_name as ownerLastName, petition.creation_date as creationDate, petition.description from petition join user on petition.owner_id=user.id where petition_id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId] );
    await conn.release();
    return rows;
}

const getSupporterCount = async(petitionId: number): Promise<number> => {
    Logger.info(`Get supporter count of ${petitionId}`);
    const conn = await getPool().getConnection();
    const query = `select count(*) as total from supporter where petition_id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId] );
    await conn.release();
    return rows[0].total;
}

const getMoneyRaised = async(petitionId: number): Promise<number> => {
    Logger.info(`Get money raised of ${petitionId}`);
    const conn = await getPool().getConnection();
    const query = `select sum(support_tier.cost) as total from supporter join support_tier on supporter.support_tier_id=support_tier.id where petition_id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId] );
    await conn.release();
    if (rows.length === 0){
        return 0;
    }
    return rows[0].total;
}

const checkOwner = async(petitionId: number, ownerId: number): Promise<boolean> => {
    Logger.info(`Check to see if user ${ownerId} owns petition ${petitionId}`);
    const conn = await getPool().getConnection();
    const query = `select * from petition where id = ? and ownerId = ?`;
    const [ rows ] = await conn.query( query, [ petitionId, ownerId] );
    await conn.release();
    return rows.length > 0;
}

const updatePetition = async (petitionId: number, updateParams: string[], updateValues: string[]): Promise<ResultSetHeader> => {
    Logger.info(`Updating petition  ${petitionId}`);
    const conn = await getPool().getConnection();
    let query = 'update support_tier set ';
    for (let i = 0; i < updateParams.length; i++) {
        if (updateParams[i] === "cost") {
            query += updateParams[i] + ` = ` + parseInt(updateValues[i], 10) + ` `;
        } else {
            query += updateParams[i] + ` = ` + updateValues[i] + ` `;
        }
    }
    query += `where id = ?`
    const [ rows ] = await conn.query( query, [petitionId] );
    await conn.release();
    return rows;
}



export {getAll, updatePetition, checkOwner, getPetitionDetailed, getPetition, getCategories, deletePetition, checkPetitionTitle, checkCategoryId, createPetition, getPetitionIdFromTitle, getSupporterCount, getMoneyRaised }