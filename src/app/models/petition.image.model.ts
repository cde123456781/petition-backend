import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import { ResultSetHeader } from 'mysql2';



const getImageFilename = async (petitionId: number): Promise<Petition[]> => {
    Logger.info(`Getting image filename of ${petitionId}`);
    const conn = await getPool().getConnection();
    const query = 'select image_filename from petition where id = ? and image_filename is not null';
    const [ rows ] = await conn.query( query, [petitionId] );
    await conn.release();
    return rows;
}

const updateImageFilename = async (petitionId: number, imageFilename: string): Promise<ResultSetHeader> => {
    Logger.info(`Updating image filename of ${petitionId}`);
    const conn = await getPool().getConnection();
    const query = 'update petition set image_filename = ? where id = ?';
    const [ rows ] = await conn.query( query, [imageFilename, petitionId] );
    await conn.release();
    return rows;
}



export { getImageFilename, updateImageFilename }