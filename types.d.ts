type User = {
    id: number,
    email: string,
    first_name: string,
    last_name: string,
    image_filename: string,
    password: string,
    auth_token: string
}


type Petition = {
    id: number,
    title: string,
    description: string,
    creation_date: string,
    image_filename: string,
    owner_id: string,
    category_id: string
}


type Category = {
    id: number,
    name: string
}


type Supporter = {
    id: number,
    petition_id: number,
    support_tier_id: number,
    user_id: number,
    message: string,
    first_name: string,
    last_name: string,
    timestamp: string
}


type SupportTier = {
    title: string,
    description: string,
    cost: number,
    supportTierId: number
}

type PetitionDetailed = {
    petitionId: number,
    title: string,
    categoryId: number,
    ownerId: number,
    ownerFirstName: string,
    ownerLastName: string,
    creationDate: string,
    description: string,
}


type PetitionAll = {
    petitionId: number,
    title: string,
    categoryId: number,
    ownerId: number,
    ownerFirstName: string,
    ownerLastName: string,
    numberOfSupporters: number,
    creationDate: string,
    supportingCost: number
}