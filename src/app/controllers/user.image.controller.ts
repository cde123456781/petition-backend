import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as users from '../models/user.model';
import * as images from '../models/user.image.model';
import * as fz from 'mz/fs';
import path from "node:path";
import fs from "mz/fs";
import * as petitions from "../models/petition.model";

const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);
        // Check if id is NaN
        if (isNaN((id))) {
            res.status(404).send("Invalid ID");
            return;
        }

        let result = await users.getUser(id);
        if(result.length === 0) {
            res.status(404).send("User not found");
        } else {
            result = await images.getImage(id);
            if (result.length === 0) {
                res.status(404).send("Image not found");
            } else {
                // Need to use a buffer for the image
                const fileName = result[0].image_filename.toLowerCase();
                if (fileName.endsWith("png")) {
                    res.set("Content-Type", "image/png");
                } else if (fileName.endsWith("jpg") || fileName.endsWith("jpeg")) {
                    res.set("Content-Type", "image/jpeg");
                } else if (fileName.endsWith("gif")) {
                    res.set("Content-Type", "image/gif");
                } else {
                    res.status(404).send("Invalid image type");
                    return;
                }

                const filePath = path.resolve(__dirname, "../../storage/images/" + fileName);
                try {
                    await fs.readFile(req.body);

                } catch (err) {
                    res.status(400).send("Bad Request");
                    return;
                }


                // Send image in response
                res.sendFile(filePath);

            }
        }

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const setImage = async (req: Request, res: Response): Promise<void> => {
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
                const contentType = req.get("Content-Type");

                const userResult = await users.getUser(id);
                if (userResult.length === 0) {
                    res.status(404).send("User not found");
                    return;
                }

                let fileFormat;
                if (contentType === "image/png") {
                    fileFormat = ".png";
                } else if (contentType === "image/jpeg") {
                    fileFormat = ".jpeg";
                } else if (contentType === "image/gif") {
                    fileFormat = ".gif";
                } else {
                    res.status(400).send("Content type not valid");
                    return;
                }

                const filePath = path.resolve(__dirname, "../../storage/images/user" + id + fileFormat);

                let data;
                try {
                    data = await fs.readFile(req.body);

                } catch (err) {
                    res.status(400).send("Bad Request");
                    return;
                }

                const doesPetitionHaveFile = (await images.getImageFilename(id)).length > 0;

                await fs.writeFile(filePath, data);

                await images.updateImageFilename(id, "petition" + id + fileFormat);

                if (doesPetitionHaveFile) {
                    res.status(200).send("Image updated");
                } else {
                    res.status(201).send("Image created");
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

const deleteImage = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`DELETE image of user id: ${req.params.id}`)
    try{
        const id = parseInt(req.params.id, 10);
        // Check if id is NaN
        if (isNaN((id))) {
            res.status(404).send("Invalid ID");
            return;
        }


        const token = req.get("X-Authorization");
        // If there is no token
        if (token === undefined) {
            res.status(401).send("Unauthorized");
        } else {
            let result = await users.getUser(id);
            if (result.length === 0) {
                res.status(404).send("User not found");
            } else {
                result = await users.checkTokenWithId(token, id);
                if (result.length === 0) {
                    res.status(403).send();
                } else {
                    result = await images.getImage(id);
                    if (result.length === 0) {
                        res.status(404).send("Image not found");
                    } else {
                        const filename = result[0].image_filename;
                        const filePath = path.resolve(__dirname, "../../storage/images/" + filename);

                        try {
                            await fs.unlink(filePath);
                        } catch (err) {
                            res.status(404).send("File not found");
                            return;
                        }
                        await images.deleteImage(id);
                        res.status(200).send("Deleted");

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

export {getImage, setImage, deleteImage}