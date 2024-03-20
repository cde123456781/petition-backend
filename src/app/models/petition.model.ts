import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import { ResultSetHeader } from 'mysql2';

const create = async (): Promise<void> => {
    return null;


}



const getPetition = async (id: number): Promise<Petition[]> => {
    Logger.info(`Getting petition ${id} from the database`)
    const conn = await getPool().getConnection();
    const query = 'select * from petition where id = ?';
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



export {create, getPetition, getCategories}