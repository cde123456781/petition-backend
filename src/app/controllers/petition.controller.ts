import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as petitions from '../models/petition.model';
import {validate} from "../../validate";
import * as schemas from "../resources/schemas.json";
import * as users from "../models/user.model";
import * as supporters from "../models/petition.supporter.model"
import * as supportTier from "../models/petition.support_tier.model";

const getAllPetitions = async (req: Request, res: Response): Promise<void> => {
    try{
        const validation = await validate(
            schemas.petition_search,
            req.body
        );

        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }

        const startIndex = req.body.startIndex;
        const count = req.body.count;


        const q = req.body.q;
        const categoryIds = req.body.categoryIds;
        const supportingCost = req.body.supportingCost;
        const ownerId = req.body.ownerId;
        const supporterId = req.body.supporterId;
        const sortBy = req.body.sortBy;

        const updateParams = [];
        const updateValues = [];

        if (q !== undefined) {
            updateParams.push("q");
            updateValues.push(q);
        }

        if (categoryIds !== undefined) {
            updateParams.push("categoryIds");
            let categoryIdsValue = "(";
            for (let i = 0; i < categoryIds.length; i++) {
                if (await petitions.checkCategoryId(categoryIds[i])) {
                    categoryIdsValue += categoryIds[i];
                    if (i < categoryIds.length - 1) {
                        categoryIdsValue += ", ";
                    }
                } else {
                    if (categoryIdsValue.slice(-1) === ",") {
                        categoryIdsValue = categoryIdsValue.slice(0, -1);
                    }
                }
            }
            categoryIdsValue += ")";
            updateValues.push(categoryIdsValue);
        }

        if (supportingCost !== undefined) {
            updateParams.push("supportingCost");
            updateValues.push(supportingCost);
        }

        if (ownerId !== undefined) {
            updateParams.push("ownerId");
            updateValues.push(ownerId);
        }

        if (supporterId !== undefined) {
            updateParams.push("supporterId");
            updateValues.push(supporterId);
        }

        if (sortBy !== undefined) {
            updateParams.push("sortBy");
            updateValues.push(sortBy);
        }

        const result = await petitions.getAll(updateParams, updateValues);
        res.status(200).send({"petitions": result.slice(startIndex, startIndex + count), "count": count});


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
            const moneyRaised = await petitions.getMoneyRaised(id);
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

                if (petitions.checkPetitionTitle(title)) {
                    res.status(403).send("Title already exists");
                } else {
                    // Is categoryId valid?
                    if (petitions.checkCategoryId(categoryId)) {
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
                        for (let i = 0; i++; i < supportTiers.length) {
                            await supportTier.addSupportTier(petitionId, supportTiers[i].title, supportTiers[i].description, parseInt(supportTiers[i].cost, 10));
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
                if ( petitions.checkOwner(petitionId, userId)) {
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