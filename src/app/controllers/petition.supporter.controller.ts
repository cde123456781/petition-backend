import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as petitions from "../models/petition.model";
import * as supporters from "../models/petition.supporter.model";
import * as users from "../models/user.model";
import {validate} from "../../validate";
import * as schemas from "../resources/schemas.json";


const getAllSupportersForPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);
        // Check if id is NaN
        if (isNaN((id))) {
            res.status(404).send("Invalid ID");
            return;
        }

        // Does this petition actually exist?
        const petitionResult = await petitions.getPetition(id);
        if (petitionResult.length === 0) {
            res.status(404).send("Petition does not exist");
        } else {
            // Get Petition supporters
            const supporterResult = await supporters.getSupporters(id);
            res.status(200).send(supporterResult);
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addSupporter = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);
        // Check if id is NaN
        if (isNaN((id))) {
            res.status(404).send("Invalid ID");
            return;
        }
        const validation = await validate(
            schemas.support_post,
            req.body
        );

        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }

        const token = req.get("X-Authorization");
        if (token === undefined) {
            res.status(401).send("Unauthorized. Cannot log out if you are not authenticated");
            return;
        } else {
            const tokenResult = await users.checkToken(token);
            if (tokenResult.length === 0) {
                res.status(401).send("Unauthorized");
                return;
            } else {
                const userId = tokenResult[0].id;
                const supportTierId = req.body.supportTierId;
                const message = req.body.message;
                // Check if petitions exists
                const petitionResult = await petitions.getPetition(id);
                if (petitionResult.length === 0) {
                    res.status(404).send("Petition doesn't exist");
                } else {
                    // Check if user already supports petition tier
                    const alreadySupportResult = await supporters.getSupportersBySupporterTierIdUserId(supportTierId, userId);
                    if (alreadySupportResult.length > 0) {
                        res.status(403).send("Already supports this tier");
                    } else {
                        if (parseInt(petitionResult[0].owner_id, 10) === userId) {
                            res.status(403).send("Cannot support own petition");
                        } else {
                            // good to update
                            await supporters.addSupporter(id, supportTierId, userId, message);
                            res.status(201).send("Added support");
                        }

                    }
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

export {getAllSupportersForPetition, addSupporter}