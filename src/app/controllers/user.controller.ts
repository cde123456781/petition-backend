import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as users from '../models/user.model';
import {validate} from '../../validate';
import * as schemas from '../resources/schemas.json';
import {checkIdAndPassword, checkTokenWithId, getUser} from "../models/user.model";

const register = async (req: Request, res: Response): Promise<void> => {

    // Check if user parameters are valid
    Logger.info(`POST create a user`)
    const validation = await validate(
        schemas.user_register,
        req.body
    );

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return;
    }

    // Check email

    const email = req.body.email;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = req.body.password;
    try {
        const isEmailInUse = await users.checkEmail( email );
        if (isEmailInUse) {
            res.status(403).send(`ERROR email ${email} already in use`);
            return;
        } else {
            const result = await users.register( email, firstName, lastName, password );
            res.status(201).send({"userId": result.insertId} );
        }
    } catch (err) {
        res.status(500).send(`ERROR checking email ${email}: ${err}`);
        return;
    }

};

const login = async (req: Request, res: Response): Promise<void> => {
    // Check if user parameters are valid
    Logger.info(`POST login`)
    const validation = await validate(
        schemas.user_login,
        req.body
    );

    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return;
    }


    try{
        const checkResult = await users.checkEmailAndPassword( req.body.email, req.body.password );
        if ( ! checkResult) {
            res.status( 401 ).send("UnAuthorized. Incorrect email/password");
        } else {
            // Successful login
            await users.addToken(req.body.email);
            const result = await users.getLoginResult(req.body.email);
            res.status(200).send({"userId": result[0].id, "token": result[0].auth_token});
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
    try{
        const token = req.get("X-Authorization");
        if (token === undefined) {
            res.status(401).send("Unauthorized. Cannot log out if you are not authenticated");
            return;
        } else {
            const result = await users.checkToken(token);
            if (result.length === 0) {
                res.status(401).send("Unauthorized. Cannot log out if you are not authenticated");
                return;
            } else {
                await users.logout(token);
                res.status(200).send("Logged out successfully");
                return;
            }
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const view = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`GET single user id: ${req.params.id}`)
    const id = parseInt(req.params.id, 10);
    // Check if id is NaN
    if (isNaN((id))) {
        res.status(404).send("Invalid ID");
        return;
    }

    try {
        let result;
        const token = req.get("X-Authorization");
        if (token === undefined) {
            // return standard get (check length)
            result = await users.getUser( id );
            if (result.length === 0) {
                res.status(404).send("User not found");
            } else {
                result = await users.getUser( id );
                res.status(200).send({"firstName": result[0].first_name, "lastName": result[0].last_name});
            }
        } else {
            result = await users.checkTokenWithId(token, id);
            if (result.length === 0) {
                // return standard get (check length)
                result = await users.getUser(id);
                if (result.length === 0) {
                    res.status(404).send("User not found");
                } else {
                    result = await users.getUser(id);
                    res.status(200).send({"firstName": result[0].first_name, "lastName": result[0].last_name});
                }
            } else {
                // return auth get (no check)
                result = await users.getUserWithAuth( id );

                res.status(200).send({"email": result[0].email, "firstName": result[0].first_name, "lastName": result[0].last_name});
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR reading user ${id}: ${err}`)
    }
}

const update = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`UPDATE single user id: ${req.params.id}`)
    const validation = await validate(
        schemas.user_edit,
        req.body
    );
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`;
        res.status(400).send();
        return;
    }

    try{
        let result;
        const id = parseInt(req.params.id, 10);
        // Check if id is NaN
        if (isNaN((id))) {
            res.status(400).send("Invalid ID");
            return;
        }
        // Check if id belongs to user

        result = await getUser(id);
        if (result.length === 0) {
            res.status(404).send(`User ${id} not found`);
        } else {
            // Otherwise user does exist
            const token = req.get("X-Authorization");
            // If there is no token
            if (token === undefined) {
                res.status(401).send("Unauthorized");
            } else {
                // Check token and id
                result = await checkTokenWithId(token, id);
                if (result.length === 0) {
                    // User exists but token doesn't match (ie. trying to update different user)
                    res.status(403).send("Forbidden2");
                } else {
                    // User is authorized
                    const updateParams: string[] = [];
                    const updateValues: string[] = [];
                    if (req.body.email !== undefined) {
                        result = await users.checkEmail(req.body.email);
                        if (result) {
                            res.status(403).send("Email is already in use");
                            return;
                        } else {
                            updateParams.push("email");
                            updateValues.push(req.body.email);
                        }
                    }
                    if (req.body.firstName !== undefined) {
                        updateParams.push("first_name");
                        updateValues.push(req.body.firstName);
                    }
                    if (req.body.lastName !== undefined) {
                        updateParams.push("last_name");
                        updateValues.push(req.body.lastName);
                    }

                    if (req.body.password !== undefined) {
                        if (req.body.currentPassword !== undefined) {
                            if (req.body.password === req.body.currentPassword) {
                                res.status(403).send("Identical passwords");
                                return;
                            } else {
                                // Check if password is valid
                                Logger.http(`${req.body.password}, ${req.body.currentPassword}`)
                                if (await checkIdAndPassword(id, req.body.currentPassword)) {
                                    // Password is correct
                                    updateParams.push("password");
                                    updateValues.push(req.body.password);
                                } else {
                                    res.status(403).send("Forbidden3");
                                    return;
                                }
                            }
                        } else {

                            res.status(400).send("Invalid");
                            return;

                        }
                    } else {
                        if (req.body.currentPassword !== undefined) {
                            res.status(400).send("Invalid");
                            return;
                        }
                    }

                    // PATCH OPERATION
                    await users.updateUser(updateParams, updateValues, id);
                    res.status(200).send();
                }

            }
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {register, login, logout, view, update}