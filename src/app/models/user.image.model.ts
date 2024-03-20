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

const deleteImage = async (id: number): Promise<ResultSetHeader> => {
    Logger.info(`Deleting image of user: ${id}`);
    const conn = await getPool().getConnection();
    const query = `UPDATE user set image_filename = NULL where id = ?`;
    const [ rows ] = await conn.query( query , [id]);
    await conn.release();
    return rows;
}



export {create, getPetition, deleteImage}