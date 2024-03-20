import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import { ResultSetHeader } from 'mysql2';
import {hash, compare} from "../services/passwords";
import randomstring from 'randomstring';


const register = async (email: string, firstName: string, lastName: string, password: string): Promise<ResultSetHeader> => {
    Logger.info(`Adding user ${email} to the database`)
    const hashedPassword = await hash(password);
    const conn = await getPool().getConnection();
    const query = 'insert into user (email, first_name, last_name, password) values ( ?, ?, ?, ? )';
    const [ result ] = await conn.query( query, [ email, firstName, lastName, hashedPassword ]);
    await conn.release();
    return result;


}


const checkEmailAndPassword = async (email: string, password: string): Promise<boolean> => {
    Logger.info(`Attempting to login as user ${email}`)
    const emailQuery = `select password from user where email = ?`
    const conn = await getPool().getConnection();
    const [ emailResult ] = await conn.query( emailQuery, [email]);
    await conn.release();

    if (emailResult.length === 0) {
        return false;
    } else return await compare(password, emailResult[0].password);



}

const addToken = async(email: string): Promise<ResultSetHeader> => {
    Logger.info(`Generate an access token for user ${email}`)
    const updateQuery = `update user set auth_token = ? where email = ?`;
    const tokenQuery = `select * from user where auth_token = ?`;
    let authToken = randomstring.generate();
    const conn = await getPool().getConnection();

    // Generates a random token and refreshes it until it is unique within the database
    let [ tokenResult ] = await conn.query( tokenQuery, [authToken]);
    while (tokenResult.length > 0) {
        authToken = randomstring.generate();
        [ tokenResult ] = await conn.query( tokenQuery, [authToken]);
    }

    const [result] = await conn.query(updateQuery, [authToken, email]);
    await conn.release();
    return result;
}

const getLoginResult = async(email: string): Promise<User[]> => {
    const query = `select id, auth_token from user where email = ?`;
    const conn = await getPool().getConnection();

    const [result] = await conn.query(query, [email]);
    await conn.release();
    return result;
}



const checkToken = async(token: string): Promise<User[]> => {
    const query = `select id from user where auth_token = ?`;
    const conn = await getPool().getConnection();

    const [result] = await conn.query(query, [token]);
    await conn.release();
    return result;
}

const checkTokenWithId = async(token: string, id: number): Promise<User[]> => {
    const query = `select * from user where auth_token = ? and id = ?`;
    const conn = await getPool().getConnection();

    const [result] = await conn.query(query, [token, id]);
    await conn.release();
    return result;
}


const logout = async (token: string): Promise<ResultSetHeader> => {
    const query = `update user set auth_token = NULL where auth_token = ?`;
    const conn = await getPool().getConnection();

    const [result] = await conn.query(query, [token]);
    await conn.release();
    return result;
}





const getUser = async (id: number): Promise<User[]> => {
    Logger.info(`Getting user ${id} from the database`)
    const conn = await getPool().getConnection();
    const query = 'select first_name, last_name from user where id = ?';
    const [ rows ] = await conn.query( query, [ id ]);
    await conn.release();
    return rows;
}

const getUserWithAuth = async (id: number): Promise<User[]> => {
    Logger.info(`Getting user ${id} from the database`)
    const conn = await getPool().getConnection();
    const query = 'select email, first_name, last_name from user where id = ?';
    const [ rows ] = await conn.query( query, [ id ]);
    await conn.release();
    return rows;
}

const checkEmail = async (email: string): Promise<boolean> => {
    Logger.info(`Checking if email ${email} is in use`)
    const conn = await getPool().getConnection();
    const query = 'select * from user where email = ?';
    const [ rows ] = await conn.query( query, [ email ]);
    await conn.release();
    return (rows.length > 0);
}


const checkIdAndPassword = async (id: number, password: string): Promise<boolean> => {
    Logger.info(`Checking if password is correct for ${id}`)
    const conn = await getPool().getConnection();
    const query = 'select * from user where id = ?';
    const [ rows ] = await conn.query( query, [ id ]);
    await conn.release();
    return (await compare(password, rows[0].password));
}


const updateUser = async (params: string[], values: any[], id: number): Promise<ResultSetHeader> => {
    Logger.info(`Getting user ${id} from the database`)
    const conn = await getPool().getConnection();
    let query = `update user set `;
    for (let i = 0; i < params.length; i++) {
        Logger.info(`${params[i]}: ${values[i]}`)
        query += params[i];
        query += ` = `;
        if (params[i] === "password") {
            const hashedPassword = await hash(values[i]);
            query += `"${hashedPassword}"`;
        } else {
            query += `"${values[i]}"`;

        }
        if (i < params.length - 1) {
            query += `, `;
        }
    }
    query += ` where id = `;
    query += id;
    Logger.info(query)
    const [ rows ] = await conn.query( query, [ ]);
    await conn.release();
    return (rows);
}

export { updateUser, register, getUser, getUserWithAuth, checkEmail, checkEmailAndPassword, checkIdAndPassword, addToken, getLoginResult, checkToken, checkTokenWithId, logout }