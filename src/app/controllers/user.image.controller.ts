import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as users from '../models/user.model';
import * as images from '../models/user.image.model';
import * as fz from 'mz/fs';

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
    Logger.http(`${req.body.fileName}`)
    try{
        // Your code goes here
        res.statusMessage = "Not Implemented Yet!";
        res.status(501).send();
        return;
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
                        Logger.http(`${result[0].image_filename} - ${typeof (result[0].image_filename)}`)
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