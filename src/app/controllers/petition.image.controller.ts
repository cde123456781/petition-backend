import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as petitions from "../models/petition.model";
import * as images from "../models/petition.image.model";

const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);
        // Check if id is NaN
        if (isNaN((id))) {
            res.status(404).send("Invalid ID");
            return;
        }

        let result = await petitions.getPetition(id);
        if(result.length === 0) {
            res.status(404).send("Petition not found");
        } else {
            result = await images.getImageFilename(id);
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

                // Send image in response
                res.sendFile();

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


export {getImage, setImage};