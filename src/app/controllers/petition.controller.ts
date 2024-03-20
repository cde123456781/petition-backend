import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as petitions from '../models/petition.model';

const getAllPetitions = async (req: Request, res: Response): Promise<void> => {
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


const getPetition = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`GET single petition id: ${req.params.id}`)
    const id = req.params.id;
    try {
        const result = await petitions.getPetition( parseInt( id, 10) );
        if ( result.length === 0 ) {
            res.status( 404 ).send("Petition not found");
        } else {
            res.status( 200 ).send(result[0]);
        }
    } catch (err) {
        res.status(500).send(`ERROR reading petition ${id}: ${err}`)
    }
}

const addPetition = async (req: Request, res: Response): Promise<void> => {
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

const editPetition = async (req: Request, res: Response): Promise<void> => {
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

const deletePetition = async (req: Request, res: Response): Promise<void> => {
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