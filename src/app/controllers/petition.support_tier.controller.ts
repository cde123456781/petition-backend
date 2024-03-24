import {Request, Response} from "express";
import Logger from "../../config/logger";
import {validate} from "../../validate";
import * as schemas from "../resources/schemas.json";
import * as users from "../models/user.model";
import * as petitions from "../models/petition.model";
import * as supportTiers from "../models/petition.support_tier.model";



const addSupportTier = async (req: Request, res: Response): Promise<void> => {
    Logger.http("TESTING ADD SUPPORT TIER")
    try{
        const id = parseInt(req.params.id, 10);
        // Check if id is NaN
        if (isNaN((id))) {
            res.status(404).send("Invalid ID");
            return;
        }
        const validation = await validate(
            schemas.support_tier_post,
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
                const cost = req.body.cost;

                // Does petition actually exist?
                const petitionResult = await petitions.getPetition(id);
                if (petitionResult.length === 0) {
                    res.status(404).send("Petition doesn't exist");
                } else {
                    if (parseInt(petitionResult[0].owner_id, 10) === userId) {
                        const count = await supportTiers.getSupportTierCount(id);
                        if (count === 3) {
                            res.status(403).send("Already has 3 support tiers");
                        } else {
                            if (await supportTiers.checkTitle(id, title)) {
                                res.status(403).send("Title is already used");
                            } else {
                                // Okay to go (201)
                                await supportTiers.addSupportTier(id, title, description, cost);
                                res.status(201).send("Added new tier");
                            }

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

const editSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = parseInt(req.params.id, 10);
        const tierId = parseInt(req.params.tierId, 10);
        // Check if id is NaN
        if (isNaN((petitionId)) || isNaN(tierId)) {
            res.status(404).send("Invalid ID");
            return;
        }
        const validation = await validate(
            schemas.support_tier_patch,
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
                const cost = req.body.cost;

                // Does petition actually exist?
                const petitionResult = await petitions.getPetition(petitionId);
                if (petitionResult.length === 0) {
                    res.status(404).send("Petition doesn't exist");
                } else {
                    if (parseInt(petitionResult[0].owner_id, 10) === userId) {

                        // Does this petition have supporters
                        const supporterCount = await supportTiers.getSupportersLength(tierId);
                        if (supporterCount > 0) {
                            res.status(403).send("Petition tier still has supporters");
                        } else {
                            if (supportTiers.checkTierBelongToPetition(petitionId, tierId)) {

                                const updateParams: string[] = [];
                                const updateValues: string[] = [];
                                if (title !== undefined) {
                                    // Check to see if title is duplicate
                                    if (await supportTiers.checkTitle(petitionId, title)) {
                                        res.status(403).send("Petition already has this title");
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

                                if (cost !== undefined) {
                                    updateParams.push("cost");
                                    updateValues.push(cost);
                                }
                                await supportTiers.updateTier(tierId, updateParams, updateValues);
                                res.status(200).send("Successfully updated");
                            } else {
                                res.status(404).send("Tier does not belong to petition");
                            }
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

const deleteSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = parseInt(req.params.id, 10);
        const tierId = parseInt(req.params.tierId, 10);
        // Check if id is NaN
        if (isNaN((petitionId)) || isNaN(tierId)) {
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

                // Does petition actually exist?
                const petitionResult = await petitions.getPetition(petitionId);
                if (petitionResult.length === 0) {
                    res.status(404).send("Petition doesn't exist");
                } else {
                    if (parseInt(petitionResult[0].owner_id, 10) === userId) {

                        // Does this petition tier have supporters
                        const supporterCount = await supportTiers.getSupportersLength(tierId);
                        if (supporterCount > 0) {
                            res.status(403).send("Petition tier still has supporters");
                        } else {
                            if (await supportTiers.checkTierBelongToPetition(petitionId, tierId)) {
                                // Is this the last tier for the petition
                                if (await supportTiers.getTierCount(petitionId) === 1) {
                                    res.status(403).send("Cannot delete last tier");
                                } else {
                                    // Delete
                                    await supportTiers.deleteTier(tierId);
                                    res.status(200).send("Deleted");
                                }
                            } else {
                                res.status(404).send("Tier does not belong to petition");
                            }
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

export {addSupportTier, editSupportTier, deleteSupportTier};