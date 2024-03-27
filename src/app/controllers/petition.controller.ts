import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as petitions from '../models/petition.model';
import {validate} from "../../validate";
import * as schemas from "../resources/schemas.json";
import * as users from "../models/user.model";
import * as supporters from "../models/petition.supporter.model"
import * as supportTier from "../models/petition.support_tier.model";
import {start} from "node:repl";

const getAllPetitions = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(
            schemas.petition_search,
            req.query
        );

        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }

        const startIndex = req.query.startIndex;
        const count = req.query.count;
        Logger.info(`Start: ${startIndex}  = Count: ${count}`)

        const query = req.query;

        const q = query.q;
        const categoryIds  = query.categoryIds;
        let supportingCost = query.supportingCost;
        const ownerId = query.ownerId;
        let supporterId = query.supporterId;
        const sortBy = query.sortBy;

        const updateParams = [];
        const updateValues: string[] = [];


        Logger.info(typeof categoryIds)
        if (q !== undefined) {
            updateParams.push("q");
            if (typeof q === "string") {
                updateValues.push(q);
            }
        }


        if (categoryIds !== undefined) {
            updateParams.push("categoryIds");
            let categoryIdsValue = "(";
            if (typeof categoryIds === "string") {
                categoryIdsValue += categoryIds
            } else if (typeof categoryIds === "object") {
                // @ts-ignore
                categoryIdsValue += categoryIds.toString();
            }
            categoryIdsValue += ")";
            updateValues.push(categoryIdsValue);
        }



        if (ownerId !== undefined) {
            updateParams.push("ownerId");
            if (typeof ownerId === "string") {
                updateValues.push(ownerId);
            }
        }


        if (sortBy !== undefined) {
            updateParams.push("sortBy");
            if (typeof sortBy === "string") {
                updateValues.push(sortBy);
            }
        }

        const result = await petitions.getAll(updateParams, updateValues);
        let actualList: PetitionAll[] = [];

        let minCost = 0;
        let numSupporters = 0;
        let supportersList: Supporter[] = [];
        let actualSupportingCost;
        let actualSupportingId;

        if (typeof supportingCost === "string") {
            supportingCost = supportingCost.toString();
            actualSupportingCost = parseInt(supportingCost, 10);
        }
        if (typeof supporterId === "string") {
            supporterId = supporterId.toString();
            actualSupportingId = parseInt(supporterId, 10);
        }




        for (const item of result) {
            minCost = await petitions.getMinCost(item.petitionId);
            numSupporters = await petitions.getSupporterCount(item.petitionId);
            item.supportingCost = minCost;
            item.numberOfSupporters = numSupporters;
            supportersList = await petitions.getSupporterIds(item.petitionId);
            if (supportingCost !== undefined) {
                if (item.supportingCost <= actualSupportingCost) {
                    if (supporterId !== undefined) {
                        for (const item1 of supportersList) {
                            if (item1.user_id === actualSupportingId) {
                                actualList.push(item);
                            }
                        }
                    } else {
                        actualList.push(item);
                    }
                }
            } else {

                if (supporterId !== undefined) {
                    for (const item1 of supportersList) {
                        Logger.info(`ID ${item1.user_id}: WANTED: ${actualSupportingId}`)
                        if (item1.user_id === actualSupportingId) {
                            actualList.push(item);
                        }
                    }
                } else {
                    actualList.push(item);
                }
            }
        }

        let temp;
        // Use a sorting algorithm to sort by cost IF sortBy says so
        if (sortBy === "COST_ASC") {
            Logger.info("WTF")
            for (let i = 0; i < actualList.length; i++) {
                for (let j = 0; j < actualList.length - i - 1; j++) {
                    if (actualList[j].supportingCost > actualList[j + 1].supportingCost) {
                        temp = actualList[j];
                        actualList[j] = actualList[j + 1];
                        actualList[j + 1] = temp;

                    }
                    if (actualList[j].supportingCost === actualList[j + 1].supportingCost) {
                        if (actualList[j].petitionId > actualList[j + 1].petitionId) {
                            temp = actualList[j];
                            actualList[j] = actualList[j + 1];
                            actualList[j + 1] = temp;

                        }
                    }
                }
            }

        }

        if (sortBy === "COST_DESC") {
            for (let i = 0; i < actualList.length; i++) {
                for (let j = 0; j < actualList.length - i - 1; j++) {
                    if (actualList[j].supportingCost < actualList[j + 1].supportingCost) {
                        temp = actualList[j];
                        actualList[j] = actualList[j + 1];
                        actualList[j + 1] = temp;

                    }
                    if (actualList[j].supportingCost === actualList[j + 1].supportingCost) {
                        if (actualList[j].petitionId > actualList[j + 1].petitionId) {
                            temp = actualList[j];
                            actualList[j] = actualList[j + 1];
                            actualList[j + 1] = temp;

                        }
                    }
                }
            }
        }



        Logger.info(actualList)
        Logger.info(`Precount: ${count}`)

        let actualStartIndex;
        if (typeof startIndex === "string") {
            actualStartIndex = parseInt(startIndex, 10);
        }


        let actualCount;
        const returnCount = actualList.length;
        if (typeof count === "string") {
            actualCount = parseInt(count, 10);
        }


        if (startIndex !== undefined) {
            if (count !== undefined) {
                actualList = actualList.slice(actualStartIndex, actualStartIndex + actualCount);
            } else {
                actualList = actualList.slice(actualStartIndex);
            }
        }
        if (count === undefined) {
            actualCount = actualList.length;
        }
        Logger.info(`Length: ${actualList.length}`)
        Logger.info(`Count: ${count}`)



        res.status(200).send({"petitions": actualList, "count": returnCount});


        res.status(200).send();

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const getPetition = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`GET single petition id: ${req.params.id}`)
    try {
        const id = parseInt(req.params.id, 10);
        // Check if id is NaN
        if (isNaN((id))) {
            res.status(404).send("Invalid ID");
            return;
        }

        const result = await petitions.getPetitionDetailed( id );
        if ( result.length === 0 ) {
            res.status( 404 ).send("Petition not found");
        } else {
            const supporterCount = await petitions.getSupporterCount(id);
            let moneyRaised = await petitions.getMoneyRaised(id);
            if (moneyRaised === null) {
                moneyRaised = 0;
            }
            const supportTiers = await supportTier.getSupportTiers(id);
            res.status(200).send({"petitionId": result[0].petitionId, "title": result[0].title,
                "categoryId": result[0].categoryId, "ownerId": result[0].ownerId, "ownerFirstName": result[0].ownerFirstName,
                "ownerLastName": result[0].ownerLastName, "numberOfSupporters": supporterCount, "creationDate": result[0].creationDate, "description": result[0].description,
                "moneyRaised": moneyRaised, "supportTiers": supportTiers});
        }
    } catch (err) {
        res.status(500).send(`ERROR reading petition: ${err}`)
    }
}

const addPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(
            schemas.petition_post,
            req.body
        );

        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }

        const token = req.get("X-Authorization");
        if (token === undefined) {
            res.status(401).send("Unauthorized");
            return;
        } else {
            const tokenResult = await users.checkToken(token);
            if (tokenResult.length === 0) {
                res.status(401).send("Unauthorized");
                return;
            } else {
                const userId = tokenResult[0].id;
                const title = req.body.title;
                const description = req.body.description;
                const categoryId = req.body.categoryId;
                const supportTiers = req.body.supportTiers;
                Logger.info(supportTiers)

                if (await petitions.checkPetitionTitle(title)) {
                    res.status(403).send("Title already exists");
                } else {
                    // Is categoryId valid?
                    if (await petitions.checkCategoryId(categoryId)) {
                        // Check support tier titles
                        const tierTitles: string[] = [];
                        for (let i = 0; i ++; i < supportTiers.length) {
                            if (tierTitles.includes(supportTiers[i].title)) {
                                res.status(400).send("Tier titles must be unique");
                                return;
                            }
                            tierTitles.push(supportTiers[i].title);
                        }


                        // Create petition
                        await petitions.createPetition(title, description, userId, categoryId);

                        const petitionId = parseInt(await petitions.getPetitionIdFromTitle(title), 10);

                        // Create tiers
                        for (const item of supportTiers) {
                            await supportTier.addSupportTier(petitionId, item.title, item.description, parseInt(item.cost, 10));
                        }

                        res.status(201).send({"petitionId": petitionId});

                    } else {
                        res.status(400).send("Category is not valid");
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

const editPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(
            schemas.petition_patch,
            req.body
        );

        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }
        const petitionId = parseInt(req.params.id, 10);
        // Check if id is NaN
        if (isNaN((petitionId))) {
            res.status(404).send("Invalid petition ID");
            return;
        }

        const token = req.get("X-Authorization");
        if (token === undefined) {
            res.status(401).send("Unauthorized");
            return;
        } else {
            const tokenResult = await users.checkToken(token);
            if (tokenResult.length === 0) {
                res.status(401).send("Unauthorized");
                return;
            } else {
                const userId = tokenResult[0].id;
                const title = req.body.title;
                const description = req.body.description;
                const categoryId = req.body.categoryId;
                if (await petitions.checkOwner(petitionId, userId)) {
                    const updateParams: string[] = [];
                    const updateValues: string[] = [];
                    if (title !== undefined) {
                        if (await petitions.checkPetitionTitle(title)) {
                            res.status(403).send(`Petition title ${title} already exists`);
                            return;
                        } else {
                            updateParams.push("title");
                            updateValues.push(title);
                        }
                    }

                    if (description !== undefined) {
                        updateParams.push("description");
                        updateValues.push(description);
                    }

                    if (categoryId !== undefined) {
                        updateParams.push("categoryId");
                        updateValues.push(categoryId);
                    }

                    await petitions.updatePetition(petitionId, updateParams, updateValues);
                    res.status(200).send("Updated successfully");

                } else {
                    res.status(403).send("User is not owner");
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

const deletePetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);
        // Check if id is NaN
        if (isNaN((id))) {
            res.status(404).send("Invalid ID");
            return;
        }
        const token = req.get("X-Authorization");
        if (token === undefined) {
            res.status(401).send("Unauthorized");
            return;
        } else {
            const tokenResult = await users.checkToken(token);
            if (tokenResult.length === 0) {
                res.status(401).send("Unauthorized");
                return;
            } else {
                const userId = tokenResult[0].id;
                const petitionResult = await petitions.getPetition(id);
                if (petitionResult.length === 0) {
                    res.status(404).send("Petition doesn't exist");
                } else {
                    Logger.info(petitionResult[0].owner_id)
                    if (parseInt(petitionResult[0].owner_id, 10) === userId) {
                        if (await supporters.checkPetitionHasSupporters(id)) {
                            res.status(403).send("Petition has supporters");
                        } else {
                            await petitions.deletePetition(id);
                            res.status(200).send("Deleted");
                        }
                    } else {
                        res.status(403).send("User is not owner");
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

const getCategories = async(req: Request, res: Response): Promise<void> => {
    Logger.http(`GET all categories`)
    try {
        const result = await petitions.getCategories();
        res.status(200).send(result)
    } catch (err) {
        res.status(500)
            .send(`ERROR getting categories ${err}`)
    }
}

export {getAllPetitions, getPetition, addPetition, editPetition, deletePetition, getCategories};