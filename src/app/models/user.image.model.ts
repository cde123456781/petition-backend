import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import { ResultSetHeader } from 'mysql2';

const create = async (): Promise<void> => {
    return null;


}



const getImage = async (id: number): Promise<User[]> => {
    Logger.info(`Getting user ${id} from the database`)
    const conn = await getPool().getConnection();
    const query = 'select image_filename from user where id = ? and image_filename is not null';
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

const getImageFilename = async (id: number): Promise<Petition[]> => {
    Logger.info(`Getting image filename of ${id}`);
    const conn = await getPool().getConnection();
    const query = 'select image_filename from user where id = ? and image_filename is not null';
    const [ rows ] = await conn.query( query, [id] );
    await conn.release();
    return rows;
}

const updateImageFilename = async (id: number, imageFilename: string): Promise<ResultSetHeader> => {
    Logger.info(`Updating image filename of ${id}`);
    const conn = await getPool().getConnection();
    const query = 'update user set image_filename = ? where id = ?';
    const [ rows ] = await conn.query( query, [imageFilename, id] );
    await conn.release();
    return rows;
}


export {create, getImage, deleteImage, getImageFilename, updateImageFilename}